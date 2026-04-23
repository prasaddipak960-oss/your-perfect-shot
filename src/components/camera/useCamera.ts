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

  const start = useCallback(
    async (mode: FacingMode) => {
      stop();
      setReady(false);
      setError(null);
      try {
        // This call triggers the native OS / Android permission popup (Allow / Deny)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps.torch);
        setTorchOn(false);
        setPermission("granted");
        setReady(true);
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string };
        const denied =
          err?.name === "NotAllowedError" ||
          err?.name === "SecurityError" ||
          /denied|permission/i.test(err?.message ?? "");
        setPermission(denied ? "denied" : "prompt");
        setError(denied ? "Camera permission is required" : err?.message || "Camera unavailable");
      }
    },
    [stop]
  );

  useEffect(() => {
    start(facing);
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
