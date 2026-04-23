import { useCallback, useEffect, useRef, useState } from "react";

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
    setReady(true);
  };

  const start = useCallback(
    async (mode: FacingMode) => {
      stop();
      setReady(false);
      setError(null);

      // Mobile camera requires HTTPS (or localhost)
      const isSecure =
        typeof window !== "undefined" &&
        (window.isSecureContext ||
          location.hostname === "localhost" ||
          location.hostname === "127.0.0.1");
      if (!isSecure) {
        setError("Camera requires HTTPS. Open this site over a secure (https) connection.");
        setPermission("denied");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera API not supported in this browser.");
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
            throw audioErr;
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
            ? "Camera permission is required"
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
    // Pre-check permission state where supported (Chromium/Android)
    const tryStart = async () => {
      try {
        const perms = (navigator as Navigator & {
          permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> };
        }).permissions;
        if (perms?.query) {
          const status = await perms.query({ name: "camera" as PermissionName });
          if (status.state === "denied") {
            setPermission("denied");
            setError("Camera permission is required");
            return;
          }
        }
      } catch {
        /* permissions API not supported, continue */
      }
      start(facing);
    };
    tryStart();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const retry = useCallback(() => {
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

  return { videoRef, facing, ready, error, permission, retry, flip, torchSupported, torchOn, toggleTorch };
};
