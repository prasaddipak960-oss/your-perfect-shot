// Requests native camera/mic permissions on Capacitor (Android/iOS).
// In a normal web browser this is a no-op — the browser's getUserMedia()
// prompt handles permissions instead.

import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

export const isNative = () => Capacitor.isNativePlatform();

export const requestNativeCameraPermission = async (): Promise<boolean> => {
  if (!isNative()) return true;
  try {
    const status = await Camera.checkPermissions();
    if (status.camera === "granted") return true;

    const req = await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    return req.camera === "granted" || req.camera === "limited";
  } catch (e) {
    console.warn("Native camera permission request failed", e);
    return false;
  }
};
