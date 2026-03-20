"use client";

import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  ActionPerformed,
  PermissionStatus,
} from "@capacitor/push-notifications";

const PENDING_NATIVE_TOKEN_KEY = "pmp_pending_native_push_token";
const PENDING_NATIVE_PLATFORM_KEY = "pmp_pending_native_push_platform";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

let listenersBound = false;
let registerInFlight = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function currentPlatform(): "ios" | "android" | "web" {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
}

function cachePendingNativeToken(token: string, platform: "ios" | "android") {
  if (!isBrowser()) return;
  window.localStorage.setItem(PENDING_NATIVE_TOKEN_KEY, token);
  window.localStorage.setItem(PENDING_NATIVE_PLATFORM_KEY, platform);
}

function readPendingNativeToken():
  | { token: string; platform: "ios" | "android" }
  | null {
  if (!isBrowser()) return null;
  const token = window.localStorage.getItem(PENDING_NATIVE_TOKEN_KEY);
  const platform = window.localStorage.getItem(PENDING_NATIVE_PLATFORM_KEY);
  if (!token) return null;
  if (platform !== "ios" && platform !== "android") return null;
  return { token, platform };
}

function clearPendingNativeToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PENDING_NATIVE_TOKEN_KEY);
  window.localStorage.removeItem(PENDING_NATIVE_PLATFORM_KEY);
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn("[push] supabase.auth.getUser error:", error);
    return null;
  }
  return data?.user?.id ?? null;
}

async function saveSubscriptionRow(row: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn("[push] saveSubscriptionRow skipped: no signed-in user");
    return false;
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.warn("[push] push_subscriptions upsert error:", error);
    return false;
  }

  console.log("[push] saved subscription row:", row.endpoint.slice(0, 40));
  return true;
}

async function deleteExistingNativeRowsForUser(platformPrefix: "ios:" | "android:") {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .like("endpoint", `${platformPrefix}%`);

  if (error) {
    console.warn(`[push] failed clearing old ${platformPrefix} rows:`, error);
  }
}

async function persistNativeTokenIfPossible(token: string, platform: "ios" | "android") {
  const prefix = `${platform}:` as const;
  const userId = await getCurrentUserId();

  if (!userId) {
    console.log("[push] no user yet, caching native token");
    cachePendingNativeToken(token, platform);
    return;
  }

  await deleteExistingNativeRowsForUser(prefix);

  const ok = await saveSubscriptionRow({
    endpoint: `${platform}:${token}`,
    p256dh: "",
    auth: "",
  });

  if (ok) {
    clearPendingNativeToken();
  }
}

async function flushPendingNativeToken() {
  const pending = readPendingNativeToken();
  if (!pending) return;
  await persistNativeTokenIfPossible(pending.token, pending.platform);
}

async function bindNativeListenersOnce() {
  if (listenersBound) return;
  listenersBound = true;

  await PushNotifications.addListener("registration", async (token: Token) => {
    try {
      if (!token?.value) {
        console.warn("[push] registration callback received empty token");
        return;
      }

      const platform = currentPlatform();
      if (platform !== "ios" && platform !== "android") return;

      console.log("[push] registration success:", {
        platform,
        tokenPreview: `${token.value.slice(0, 20)}...`,
      });

      await persistNativeTokenIfPossible(token.value, platform);
    } catch (error) {
      console.warn("[push] registration save error:", error);
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.warn("[push] registration error:", error);
  });

  await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[push] notification received:", notification);
  });

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (notification: ActionPerformed) => {
      console.log("[push] notification action performed:", notification);

      const url = notification.notification?.data?.url;
      if (typeof window !== "undefined" && typeof url === "string" && url.startsWith("/")) {
        window.location.assign(url);
      }
    }
  );
}

async function registerNativePushOnce() {
  if (registerInFlight) return;
  registerInFlight = true;

  try {
    await bindNativeListenersOnce();

    let permStatus: PermissionStatus = await PushNotifications.checkPermissions();
    console.log("[push] native permission status before request:", permStatus);

    if (permStatus.receive !== "granted") {
      permStatus = await PushNotifications.requestPermissions();
      console.log("[push] native permission status after request:", permStatus);
    }

    if (permStatus.receive !== "granted") {
      console.warn("[push] native permission not granted");
      return;
    }

    console.log("[push] calling PushNotifications.register()");
    await PushNotifications.register();

    await flushPendingNativeToken();
  } catch (error) {
    console.warn("[push] native registration failed:", error);
  } finally {
    registerInFlight = false;
  }
}

async function registerWebPushOnce() {
  if (registerInFlight) return;
  registerInFlight = true;

  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("[push] missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      console.warn("[push] web notification permission not granted");
      return;
    }

    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      console.warn("[push] incomplete web push subscription");
      return;
    }

    await saveSubscriptionRow({ endpoint, p256dh, auth });
  } catch (error) {
    console.warn("[push] web registration failed:", error);
  } finally {
    registerInFlight = false;
  }
}

export async function registerPushForCurrentUser() {
  if (!isBrowser()) return;

  const isNative = Capacitor.isNativePlatform();
  const platform = currentPlatform();

  console.log("[push] registerPushForCurrentUser", { isNative, platform });

  if (isNative) {
    await registerNativePushOnce();
    return;
  }

  await registerWebPushOnce();
}

export async function syncPushTokenAfterAuth() {
  if (!isBrowser()) return;
  if (!Capacitor.isNativePlatform()) return;
  await flushPendingNativeToken();
}