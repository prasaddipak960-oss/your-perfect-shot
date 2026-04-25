import { useCallback, useEffect, useRef, useState } from "react";
import { isNative, requestNativeCameraPermission } from "./nativePermissions";

export type FacingMode = "user" | "environment";
export type PermissionState = "prompt" | "granted" | "denied";

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const attachStream = async (stream: MediaStream) => {
    streamRef.current = stream;
    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      v.muted = true;
      v.setAttribute("playsinline", "true");
      v.setAttribute("webkit-playsinline", "true");
      v.setAttribute("autoplay", "true");
      try {
        await v.play();
      } catch {
        // some mobile browsers reject play() if not in a gesture; retry on first touch
        const resume = () => {
          v.play().catch(() => {});
          window.removeEventListener("touchstart", resume);
          window.removeEventListener("click", resume);
        };
        window.addEventListener("touchstart", resume, { once: true });
        window.addEventListener("click", resume, { once: true });
      }
    }
    const track = stream.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    setTorchSupported(!!caps.torch);
    setTorchOn(false);
    setPermission("granted");
    setNeedsGesture(false);
    setReady(true);
  };

  const start = useCallback(
    async (mode: FacingMode) => {
      stop();
      setReady(false);
      setError(null);

      // NOTE: We intentionally do NOT block on isSecureContext here.
      // Many WebView wrappers (WebsiteToApp, WebIntoApp, native WebView)
      // report isSecureContext=false even though camera works fine.
      // We let getUserMedia itself decide and surface the real error.

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera API not available. If you're using a website-to-app wrapper, it likely doesn't grant camera access — please install the official APK instead."
        );
        return;
      }

      // Try with audio first (for video recording), fallback to video-only
      const videoConstraints: MediaTrackConstraints = {
        facingMode: { ideal: mode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: true,
          });
        } catch (audioErr: unknown) {
          const ae = audioErr as { name?: string };
          // If audio failed but it's not a permission denial, try video-only
          if (ae?.name !== "NotAllowedError" && ae?.name !== "SecurityError") {
            stream = await navigator.mediaDevices.getUserMedia({
              video: videoConstraints,
              audio: false,
            });
          } else {
            // Try video-only as a last resort even on permission errors
            // (some WebViews block audio entirely)
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false,
              });
            } catch {
              throw audioErr;
            }
          }
        }
        await attachStream(stream);
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string };
        const denied =
          err?.name === "NotAllowedError" ||
          err?.name === "SecurityError" ||
          /denied|permission/i.test(err?.message ?? "");
        const notFound = err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError";
        const inUse = err?.name === "NotReadableError" || err?.name === "TrackStartError";
        setPermission(denied ? "denied" : "prompt");
        setError(
          denied
            ? "Camera permission is required. Tap Retry and allow access."
            : notFound
            ? "No camera found on this device"
            : inUse
            ? "Camera is in use by another app. Close it and retry."
            : err?.message || "Camera unavailable"
        );
      }
    },
    [stop]
  );

  // Auto-start on mount + when facing changes
  useEffect(() => {
    let cancelled = false;
    const tryStart = async () => {
      // 1) Native (Capacitor Android/iOS): trigger native permission popup first.
      if (isNative()) {
        const granted = await requestNativeCameraPermission();
        if (cancelled) return;
        if (!granted) {
          setPermission("denied");
          setError("Camera permission is required");
          return;
        }
        start(facing);
        return;
      }

      // 2) Web/WebView browser: try getUserMedia immediately. If WebView
      // requires a gesture, we'll detect it and prompt user to tap.
      try {
        const perms = (navigator as Navigator & {
          permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> };
        }).permissions;
        if (perms?.query) {
          try {
            const status = await perms.query({ name: "camera" as PermissionName });
            if (cancelled) return;
            if (status.state === "denied") {
              setPermission("denied");
              setError("Camera permission is required");
              return;
            }
          } catch {
            /* permissions.query unsupported in some WebViews — ignore */
          }
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) start(facing);
    };
    tryStart();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // Fallback: if camera didn't start within 2s in a WebView, ask user to tap.
  useEffect(() => {
    if (ready || error) return;
    const t = window.setTimeout(() => {
      if (!streamRef.current) setNeedsGesture(true);
    }, 2000);
    return () => clearTimeout(t);
  }, [ready, error, facing]);

  // Listen for first user gesture to retry camera (helps with strict WebViews)
  useEffect(() => {
    if (!needsGesture) return;
    const handler = () => {
      setNeedsGesture(false);
      start(facing);
    };
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("click", handler, { once: true });
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
    };
  }, [needsGesture, start, facing]);

  const retry = useCallback(async () => {
    if (isNative()) {
      const granted = await requestNativeCameraPermission();
      if (!granted) {
        setPermission("denied");
        setError("Camera permission is required");
        return;
      }
    }
    start(facing);
  }, [start, facing]);

  const flip = () => setFacing((f) => (f === "user" ? "environment" : "user"));

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track || !torchSupported) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      /* ignore */
    }
  };

  return {
    videoRef,
    facing,
    ready,
    error,
    permission,
    needsGesture,
    retry,
    flip,
    torchSupported,
    torchOn,
    toggleTorch,
  };
};
