"use client";

import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  ActionPerformed,
  PermissionStatus,
} from "@capacitor/push-notifications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

let listenersBound = false;
let registerInFlight = false;

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}

async function saveSubscriptionRow(row: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    },
    {
      onConflict: "user_id,endpoint",
    }
  );

  if (error) {
    console.warn("[push] failed to save subscription row", error);
  }
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
    console.warn("[push] failed clearing native push rows", error);
  }
}

async function bindNativeListenersOnce() {
  if (listenersBound) return;
  listenersBound = true;

  await PushNotifications.addListener("registration", async (token: Token) => {
    try {
      if (!token?.value) return;

      const platform = Capacitor.getPlatform();
      const prefix = platform === "android" ? "android:" : "ios:";

      await deleteExistingNativeRowsForUser(prefix as "ios:" | "android:");

      await saveSubscriptionRow({
        endpoint: `${prefix}${token.value}`,
        p256dh: "",
        auth: "",
      });
    } catch (error) {
      console.warn("[push] registration save error", error);
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.warn("[push] native registration error", error);
  });

  await PushNotifications.addListener("pushNotificationReceived", () => {
    // Intentionally quiet in production.
  });

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (notification: ActionPerformed) => {
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

    if (permStatus.receive !== "granted") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      return;
    }

    await PushNotifications.register();
  } catch (error) {
    console.warn("[push] native registration failed", error);
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
    if (!publicKey) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    const sub =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;

    if (!endpoint || !p256dh || !auth) return;

    await saveSubscriptionRow({
      endpoint,
      p256dh,
      auth,
    });
  } catch (error) {
    console.warn("[push] web registration failed", error);
  } finally {
    registerInFlight = false;
  }
}

export async function registerPushForCurrentUser() {
  if (typeof window === "undefined") return;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await registerNativePushOnce();
    return;
  }

  await registerWebPushOnce();
}