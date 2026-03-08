/**
 * Backend API base URL.
 * - DEV: platform-specific (iOS simulator → localhost; Android → LAN IP).
 * - PROD: EXPO_PUBLIC_BACKEND_URL from env (EAS / .env).
 */

import { Platform } from "react-native";

export const BACKEND_CONFIG = {
  /** iOS dev: simulator uses localhost. */
  IOS_DEV_URL: "http://127.0.0.1:8000",

  /** Android dev: emulator or device on same Wi‑Fi — use your Mac's LAN IP. */
  ANDROID_DEV_URL: "http://192.168.1.68:8000",

  getBaseUrl: (): string => {
    if (__DEV__) {
      const url =
        Platform.OS === "ios"
          ? BACKEND_CONFIG.IOS_DEV_URL
          : BACKEND_CONFIG.ANDROID_DEV_URL;
      console.log("[BACKEND_CONFIG] DEV", Platform.OS, url);
      return url;
    }

    const prodUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
    if (!prodUrl) {
      console.warn("[BACKEND_CONFIG] No EXPO_PUBLIC_BACKEND_URL set for production");
    }
    return prodUrl ? prodUrl.replace(/\/$/, "") : "";
  },
};
