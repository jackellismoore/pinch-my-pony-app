"use client";

import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, ActionPerformed } from "@capacitor/push-notifications";

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

async function saveSubscriptionRow(row: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.warn("push_subscriptions upsert error:", error);
  }
}

async function bindNativeListenersOnce() {
  if (listenersBound) return;
  listenersBound = true;

  PushNotifications.addListener("registration", async (token: Token) => {
    if (!token?.value) return;
    await saveSubscriptionRow({
      endpoint: `ios:${token.value}`,
      p256dh: "",
      auth: "",
    });
  });

  PushNotifications.addListener("registrationError", (error) => {
    console.warn("Push registration error:", error);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push received:", notification);
  });

  PushNotifications.addListener(
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

    const permStatus = await PushNotifications.checkPermissions();
    let receive = permStatus.receive;

    if (receive !== "granted") {
      const req = await PushNotifications.requestPermissions();
      receive = req.receive;
    }

    if (receive !== "granted") return;

    await PushNotifications.register();
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

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

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

    if (!endpoint || !p256dh || !auth) return;

    await saveSubscriptionRow({ endpoint, p256dh, auth });
  } finally {
    registerInFlight = false;
  }
}

export async function registerPushForCurrentUser() {
  if (typeof window === "undefined") return;

  if (Capacitor.isNativePlatform()) {
    await registerNativePushOnce();
    return;
  }

  await registerWebPushOnce();
}