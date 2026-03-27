"use client";

import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PermissionStatus,
} from "@capacitor/push-notifications";

let listenersBound = false;

export async function registerPushForCurrentUser() {
  console.log("[push] registerPushForCurrentUser START");

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  alert(`[push] isNative=${isNative} platform=${platform}`);

  if (!isNative) {
    console.log("[push] NOT native → skipping iOS push");
    return;
  }

  try {
    await registerNativePush();
  } catch (err: any) {
    console.error("[push] register error:", err);
    alert(`[push] ERROR: ${err?.message || err}`);
  }
}

async function registerNativePush() {
  alert("[push] registerNativePush called");

  if (!listenersBound) {
    listenersBound = true;

    PushNotifications.addListener("registration", async (token: Token) => {
      console.log("[push] registration SUCCESS:", token.value);
      alert(`[push] TOKEN RECEIVED: ${token.value.slice(0, 20)}...`);

      await saveToken(token.value);
    });

    PushNotifications.addListener("registrationError", (error) => {
      console.error("[push] registration ERROR:", error);
      alert(`[push] REG ERROR: ${JSON.stringify(error)}`);
    });
  }

  let permStatus: PermissionStatus = await PushNotifications.checkPermissions();

  alert(`[push] permission BEFORE: ${permStatus.receive}`);

  if (permStatus.receive === "prompt") {
    permStatus = await PushNotifications.requestPermissions();
    alert(`[push] permission AFTER: ${permStatus.receive}`);
  }

  if (permStatus.receive !== "granted") {
    alert("[push] ❌ permission NOT granted");
    return;
  }

  alert("[push] calling PushNotifications.register()");
  await PushNotifications.register();
}

async function saveToken(token: string) {
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.id) {
    alert("[push] ❌ NO USER");
    return;
  }

  const userId = data.user.id;

  const endpoint = `ios:${token}`;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: "",
      auth: "",
    },
    {
      onConflict: "user_id,endpoint",
    }
  );

  if (error) {
    console.error("[push] DB ERROR:", error);
    alert(`[push] DB ERROR: ${error.message}`);
  } else {
    console.log("[push] saved to DB");
    alert("[push] ✅ TOKEN SAVED TO DB");
  }
}