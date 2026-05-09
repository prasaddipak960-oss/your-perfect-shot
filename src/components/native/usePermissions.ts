import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

export type PermState = "granted" | "denied" | "prompt" | "limited" | "unknown";

export interface PermsStatus {
  camera: PermState;
  microphone: PermState;
  storage: PermState;
}

const isNative = () => Capacitor.isNativePlatform();

const queryWebPerm = async (name: string): Promise<PermState> => {
  try {
    const perms = (navigator as Navigator & {
      permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> };
    }).permissions;
    if (!perms?.query) return "unknown";
    const res = await perms.query({ name: name as PermissionName });
    return res.state as PermState;
  } catch {
    return "unknown";
  }
};

export const checkPermissions = async (): Promise<PermsStatus> => {
  const out: PermsStatus = { camera: "unknown", microphone: "unknown", storage: "unknown" };
  if (isNative()) {
    try {
      const s = await Camera.checkPermissions();
      out.camera = (s.camera as PermState) ?? "unknown";
      out.storage = (s.photos as PermState) ?? "unknown";
    } catch {
      /* ignore */
    }
    out.microphone = await queryWebPerm("microphone");
  } else {
    out.camera = await queryWebPerm("camera");
    out.microphone = await queryWebPerm("microphone");
    out.storage = "granted";
  }
  return out;
};

/** Trigger native OS permission prompts for camera + mic + storage. */
export const requestAllPermissions = async (): Promise<PermsStatus> => {
  if (isNative()) {
    try {
      await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    } catch {
      /* ignore */
    }
  }
  // Mic prompt comes via getUserMedia (works on both web + native WebView)
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    s.getTracks().forEach((t) => t.stop());
  } catch {
    /* user denied — reflected in next check */
  }
  return checkPermissions();
};

export const allGranted = (s: PermsStatus) =>
  (s.camera === "granted" || s.camera === "limited") &&
  (s.microphone === "granted" || s.microphone === "limited") &&
  (s.storage === "granted" || s.storage === "limited");

export const anyBlocked = (s: PermsStatus) =>
  s.camera === "denied" || s.microphone === "denied" || s.storage === "denied";

/** Live permissions status with refresh on focus / visibility change. */
export const usePermissions = () => {
  const [status, setStatus] = useState<PermsStatus>({
    camera: "unknown",
    microphone: "unknown",
    storage: "unknown",
  });

  const refresh = useCallback(async () => {
    setStatus(await checkPermissions());
  }, []);

  useEffect(() => {
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return { status, refresh, setStatus };
};
