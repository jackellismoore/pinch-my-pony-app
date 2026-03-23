"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function AppResumeHandler() {
  useEffect(() => {
    let removeAppListener: (() => void) | null = null;

    async function setupNative() {
      if (!Capacitor.isNativePlatform()) return;

      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {}

      try {
        await StatusBar.setStyle({ style: Style.Default });
      } catch {}

      try {
        const handle = await CapacitorApp.addListener("appStateChange", () => {
          // no forced refresh or reload
        });

        removeAppListener = () => {
          handle.remove();
        };
      } catch {}
    }

    setupNative();

    return () => {
      if (removeAppListener) removeAppListener();
    };
  }, []);

  return null;
}