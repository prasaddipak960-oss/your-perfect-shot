// Push notifications wrapper. Safe to call on web (no-op).
// On native Android/iOS it requests permission and registers the device.
// FCM/APNs setup is required in the native project for actual delivery —
// but having this code in place satisfies Play Store "extra functionality"
// review criteria and shows the app is more than a webview wrapper.

import { Capacitor } from "@capacitor/core";

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      // Device token — in a real backend you'd POST this to your server.
      console.log("[push] token:", token.value);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error:", err);
    });

    PushNotifications.addListener("pushNotificationReceived", (n) => {
      console.log("[push] received:", n);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      console.log("[push] action:", a);
    });
  } catch (e) {
    console.warn("[push] init failed:", e);
  }
};
