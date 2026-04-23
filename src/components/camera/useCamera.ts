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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    setPermission("granted");

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");

      const resumePlayback = () => {
        void video.play().then(() => setReady(true)).catch(() => undefined);
        window.removeEventListener("touchstart", resumePlayback);
        window.removeEventListener("click", resumePlayback);
      };

      const playVideo = async () => {
        try {
          await video.play();
          setReady(true);
        } catch {
          window.addEventListener("touchstart", resumePlayback, { once: true });
          window.addEventListener("click", resumePlayback, { once: true });
        }
      };

      if (video.readyState >= 1) {
        await playVideo();
      } else {
        video.onloadedmetadata = () => {
          void playVideo();
        };
      }
    } else {
      setReady(true);
    }

    const track = stream.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    setTorchSupported(!!caps.torch);
    setTorchOn(false);
  }, []);

  const start = useCallback(
    async (mode: FacingMode) => {
      stop();
      setReady(false);
      setError(null);
      setPermission("prompt");

      const isSecure =
        typeof window !== "undefined" &&
        (window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1");

      if (!isSecure) {
        setPermission("denied");
        setError("Camera requires HTTPS. Open this site over a secure (https) connection.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera API not supported in this browser.");
        return;
      }

      try {
        const perms = (navigator as Navigator & {
          permissions?: { query: (descriptor: { name: PermissionName }) => Promise<PermissionStatus> };
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
        // Permission API is not available everywhere; continue to getUserMedia.
      }

      const preferredVideo: MediaTrackConstraints = {
        facingMode: { ideal: mode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };

      try {
        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: preferredVideo,
            audio: false,
          });
        } catch (preferredError) {
          const err = preferredError as { name?: string };
          const shouldFallback = ["OverconstrainedError", "NotFoundError", "DevicesNotFoundError", "AbortError"].includes(
            err?.name ?? ""
          );

          if (!shouldFallback) {
            throw preferredError;
          }

          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        await attachStream(stream);
      } catch (e: unknown) {
        stop();
        setReady(false);

        const err = e as { name?: string; message?: string };
        const denied =
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError" ||
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
    [attachStream, stop]
  );

  useEffect(() => {
    void start(facing);
    return () => stop();
  }, [facing, start, stop]);

  const retry = useCallback(() => {
    void start(facing);
  }, [facing, start]);

  const flip = () => setFacing((current) => (current === "user" ? "environment" : "user"));

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track || !torchSupported) return;

    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // Ignore unsupported torch constraint errors.
    }
  };

  return { videoRef, facing, ready, error, permission, retry, flip, torchSupported, torchOn, toggleTorch };
};
