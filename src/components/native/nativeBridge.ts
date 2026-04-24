// Thin wrapper around Capacitor plugins. All calls are safe on web — they
// fall back to web equivalents (Web Share API, window.open, alert) when
// running in a normal browser.

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Share } from "@capacitor/share";
import { SplashScreen as CapSplash } from "@capacitor/splash-screen";
import { Network } from "@capacitor/network";

export const isNative = () => Capacitor.isNativePlatform();

const STORE_URL =
  "https://play.google.com/store/apps/details?id=app.lovable.38ed2fa1b8be4dc3baa7baa53fc43c53";

export const hideNativeSplash = async () => {
  if (!isNative()) return;
  try {
    await CapSplash.hide();
  } catch {
    /* ignore */
  }
};

export const exitApp = async () => {
  if (isNative()) {
    try {
      await App.exitApp();
      return;
    } catch {
      /* ignore */
    }
  }
  // Web fallback: cannot really exit, just navigate away
  window.history.back();
};

export const sharePhoto = async (dataUrl: string) => {
  // Web Share API supports files in modern Chrome/Android. Fallback: download.
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `shot-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });

    if (isNative()) {
      await Share.share({
        title: "Your Perfect Shot",
        text: "Check out this photo I captured!",
        url: dataUrl,
        dialogTitle: "Share photo",
      });
      return true;
    }

    if (typeof navigator.share === "function" && (navigator as Navigator & { canShare?: (d: ShareData) => boolean }).canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Your Perfect Shot" });
      return true;
    }

    // Last fallback — trigger download
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = file.name;
    a.click();
    return true;
  } catch {
    return false;
  }
};

export const shareApp = async () => {
  const payload = {
    title: "Your Perfect Shot",
    text: "Check out Your Perfect Shot — HD Pro Camera with Beauty mode & filters!",
    url: STORE_URL,
  };
  try {
    if (isNative()) {
      await Share.share({ ...payload, dialogTitle: "Share app" });
      return true;
    }
    if (typeof navigator.share === "function") {
      await navigator.share(payload);
      return true;
    }
    await navigator.clipboard.writeText(STORE_URL);
    return "copied";
  } catch {
    return false;
  }
};

export const openRateUs = () => {
  if (isNative()) {
    // On Android the play:// scheme opens the Play Store app directly
    window.open(`market://details?id=app.lovable.38ed2fa1b8be4dc3baa7baa53fc43c53`, "_system");
    return;
  }
  window.open(STORE_URL, "_blank", "noopener,noreferrer");
};

export const onBackButton = (handler: () => boolean | void) => {
  if (!isNative()) return () => {};
  const sub = App.addListener("backButton", () => {
    handler();
  });
  return () => {
    sub.then((s) => s.remove());
  };
};

export const subscribeNetwork = (cb: (online: boolean) => void) => {
  if (isNative()) {
    Network.getStatus().then((s) => cb(s.connected));
    const sub = Network.addListener("networkStatusChange", (s) => cb(s.connected));
    return () => {
      sub.then((s) => s.remove());
    };
  }
  cb(navigator.onLine);
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online", on);
  window.addEventListener("offline", off);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", off);
  };
};
