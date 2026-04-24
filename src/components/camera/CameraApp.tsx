import { useEffect, useMemo, useRef, useState } from "react";
import { useCamera } from "./useCamera";
import { GalleryItem, loadGallery, saveItem } from "./gallery";
import { Gallery } from "./Gallery";
import { PhotoEditor } from "./PhotoEditor";
import { FILTERS, FilterId, filterById } from "./filters";
import {
  ChevronDownIcon,
  ExposureIcon,
  FlashOffIcon,
  FlipIcon,
  LocationOffIcon,
  MoonIcon,
  NoFlashRunIcon,
  ScanIcon,
  SparkleIcon,
} from "./icons";
import { toast } from "sonner";
import { SettingsMenu } from "../native/SettingsMenu";

type Mode = "Time-Lapse" | "Night" | "Pro" | "Photo" | "Video" | "Beauty" | "Short Video";
const MODES: Mode[] = ["Time-Lapse", "Night", "Pro", "Photo", "Video", "Beauty", "Short Video"];

// Mode-specific base look
const MODE_FILTERS: Record<Mode, string> = {
  "Time-Lapse": "none",
  Night: "brightness(1.35) contrast(1.1)",
  Pro: "none",
  Photo: "none",
  Video: "none",
  Beauty: "saturate(1.1) contrast(1.02) brightness(1.06) blur(0.4px)",
  "Short Video": "saturate(1.15) contrast(1.05)",
};

export const CameraApp = () => {
  const { videoRef, ready, error, permission, retry, flip, torchSupported, torchOn, toggleTorch, facing } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const lapseTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>("Photo");
  const [zoom, setZoom] = useState<number>(1);
  const [flashOn, setFlashOn] = useState(false);
  const [motionFreeze, setMotionFreeze] = useState(false);
  const [nightOn, setNightOn] = useState(false);
  const [filterStripOpen, setFilterStripOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterId>("original");
  const [exposure, setExposure] = useState(0);
  const [proPanelOpen, setProPanelOpen] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [editor, setEditor] = useState<{ id: string; src: string } | null>(null);

  // Load latest thumb
  useEffect(() => {
    const refresh = () => {
      const items = loadGallery();
      setThumb(items[0]?.dataUrl ?? null);
    };
    refresh();
    window.addEventListener("gallery-updated", refresh);
    return () => window.removeEventListener("gallery-updated", refresh);
  }, []);

  // Recording timer (skips while paused)
  useEffect(() => {
    if (!recording) return;
    setRecTime(0);
    const id = window.setInterval(() => {
      setRecTime((t) => (paused ? t : t + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [recording, paused]);

  useEffect(() => {
    if (mode !== "Video" && mode !== "Short Video" && mode !== "Time-Lapse" && recording) stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const videoFilter = useMemo(() => {
    const parts: string[] = [];
    parts.push(MODE_FILTERS[mode]);
    parts.push(filterById(activeFilter).css);
    if (nightOn) parts.push("brightness(1.35) contrast(1.1)");
    if (exposure !== 0) parts.push(`brightness(${1 + exposure * 0.2})`);
    return parts.filter((p) => p && p !== "none").join(" ") || "none";
  }, [mode, activeFilter, nightOn, exposure]);

  const captureToDataUrl = async (): Promise<{ id: string; dataUrl: string } | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    if (flashOn && facing === "user") {
      setShutterFlash(true);
      await new Promise((r) => setTimeout(r, 120));
    }
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const sw = w / zoom;
    const sh = h / zoom;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;
    ctx.filter = videoFilter;
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setShutterFlash(false);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const id = crypto.randomUUID();
    return { id, dataUrl };
  };

  const capturePhoto = async (openEditorAfter = false) => {
    const res = await captureToDataUrl();
    if (!res) return;
    const item: GalleryItem = {
      id: res.id, type: "photo", dataUrl: res.dataUrl, createdAt: Date.now(), filter: activeFilter,
    };
    saveItem(item);
    toast.success(mode === "Beauty" ? "Beauty shot saved" : "Photo captured");
    if (openEditorAfter) setEditor({ id: res.id, src: res.dataUrl });
  };

  const startRecording = () => {
    const stream = (videoRef.current?.srcObject as MediaStream | null) ?? null;
    if (!stream) return;
    recordedChunks.current = [];
    const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && recordedChunks.current.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(recordedChunks.current, { type: mime || "video/webm" });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        saveItem({ id: crypto.randomUUID(), type: "video", dataUrl, createdAt: Date.now(), filter: activeFilter });
        toast.success("Video saved");
      };
      reader.readAsDataURL(blob);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setPaused(false);
  };

  const stopRecording = () => {
    if (lapseTimerRef.current) {
      clearInterval(lapseTimerRef.current);
      lapseTimerRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    setPaused(false);
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      setPaused(true);
    } else if (rec.state === "paused") {
      rec.resume();
      setPaused(false);
    }
  };

  // Time-lapse: capture 1 frame every 2s into gallery while "recording"
  const startTimeLapse = () => {
    setRecording(true);
    setPaused(false);
    lapseTimerRef.current = window.setInterval(async () => {
      const res = await captureToDataUrl();
      if (res) saveItem({ id: res.id, type: "photo", dataUrl: res.dataUrl, createdAt: Date.now(), filter: activeFilter });
    }, 2000);
  };

  const onShutter = () => {
    if (mode === "Video" || mode === "Short Video") {
      recording ? stopRecording() : startRecording();
    } else if (mode === "Time-Lapse") {
      recording ? stopRecording() : startTimeLapse();
    } else if (mode === "Beauty") {
      capturePhoto(true); // open editor after beauty shot
    } else {
      capturePhoto(false);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const isVideoLike = mode === "Video" || mode === "Short Video" || mode === "Time-Lapse";

  return (
    <div className="relative w-full h-[100dvh] bg-background text-foreground overflow-hidden select-none">
      {/* Status dot */}
      <div className="absolute top-2 right-3 z-30 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(0,255,80,0.8)]" />
      </div>

      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-7 pb-3 flex items-center justify-between">
        <button
          onClick={() => {
            if (torchSupported) toggleTorch();
            else {
              setFlashOn((v) => !v);
              toast(flashOn ? "Flash off" : "Flash on (screen)");
            }
          }}
          className={`p-1 ${torchOn || flashOn ? "text-camera-yellow" : "text-foreground/85"}`}
          aria-label="Flash"
        >
          <FlashOffIcon />
        </button>
        <button
          onClick={() => setMotionFreeze((v) => !v)}
          className={`p-1 ${motionFreeze ? "text-camera-yellow" : "text-foreground/85"}`}
          aria-label="Motion"
        >
          <NoFlashRunIcon />
        </button>
        <button onClick={() => toast("Scan mode coming soon")} className="p-1 text-foreground/85" aria-label="Scan">
          <ScanIcon />
        </button>
        <button
          onClick={() => setTopMenuOpen((v) => !v)}
          className="px-3 py-1 rounded-full bg-camera-chip text-foreground/85"
          aria-label="More"
        >
          <ChevronDownIcon className="w-5 h-5" />
        </button>
        <button onClick={() => toast("Location off")} className="p-1 text-foreground/85" aria-label="Location">
          <LocationOffIcon />
        </button>
      </div>

      {topMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-20 mx-5 rounded-xl bg-camera-chip/90 backdrop-blur p-3 flex flex-wrap gap-2 text-xs">
          {["Timer", "Aspect 4:3", "Aspect 16:9", "Grid", "HDR", "Mirror"].map((opt) => (
            <button key={opt} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20" onClick={() => toast(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Viewfinder */}
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-14 bottom-56 mx-2 overflow-hidden rounded-md ring-1 ring-white/5">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-[filter] ${facing === "user" ? "-scale-x-100" : ""}`}
            style={{
              filter: videoFilter,
              transform: `${facing === "user" ? "scaleX(-1)" : ""} scale(${zoom})`,
              transformOrigin: "center",
            }}
          />

          <div className="pointer-events-none absolute inset-2 border border-white/10" />
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-between px-2">
            <span className="w-4 h-4 border-t border-l border-white/40" />
            <span className="w-4 h-4 border-t border-r border-white/40" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-2">
            <span className="w-4 h-4 border-b border-l border-white/40" />
            <span className="w-4 h-4 border-b border-r border-white/40" />
          </div>

          {/* Focus reticle */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-20 h-20">
              <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-camera-yellow" />
              <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-camera-yellow" />
              <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-camera-yellow" />
              <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-camera-yellow" />
            </div>
          </div>

          {recording && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full">
              <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${paused ? "" : "animate-pulse"}`} />
              <span className="text-xs font-medium tracking-wider">{formatTime(recTime)}</span>
              {paused && <span className="text-[10px] text-camera-yellow">PAUSED</span>}
            </div>
          )}

          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center bg-black/40 text-sm text-foreground/70">
              Starting camera…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
              <div className="max-w-xs">
                <p className="text-base font-medium text-foreground mb-2">
                  {permission === "denied" ? "Camera permission is required" : "Camera unavailable"}
                </p>
                <p className="text-xs text-foreground/60 mb-4">
                  {permission === "denied"
                    ? "Please allow camera access to continue. If you blocked it, enable it from your browser site settings."
                    : error}
                </p>
                <button
                  onClick={retry}
                  className="px-4 py-2 rounded-full bg-camera-yellow text-black text-sm font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {shutterFlash && <div className="absolute inset-0 bg-white animate-pulse" />}
        </div>
      </div>

      {/* Side controls (left) */}
      <div className="absolute left-3 z-20" style={{ top: "calc(50% - 20px)" }}>
        <button
          onClick={() => setNightOn((v) => !v)}
          className={`relative w-11 h-11 rounded-full grid place-items-center bg-camera-chip ${
            nightOn ? "text-camera-yellow ring-1 ring-camera-yellow" : "text-foreground/80"
          }`}
          aria-label="Night mode"
        >
          <MoonIcon className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 text-[9px] bg-camera-yellow text-black rounded-full px-1 leading-tight">
            1s
          </span>
        </button>
      </div>

      {/* Bottom area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-5">
        {/* Filter strip (Gorgeous Filters) */}
        {filterStripOpen && (
          <div className="px-3 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 text-center ${activeFilter === f.id ? "text-camera-yellow" : "text-foreground/70"}`}
              >
                <div
                  className={`w-14 h-14 rounded-md overflow-hidden ring-2 ${
                    activeFilter === f.id ? "ring-camera-yellow" : "ring-white/15"
                  } bg-camera-chip grid place-items-center`}
                  style={{ filter: f.css }}
                >
                  <span className="text-[10px] text-white/80">{f.label[0]}</span>
                </div>
                <div className="text-[10px] mt-1">{f.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Exposure + zoom + filters row */}
        <div className="px-5 flex items-center justify-between">
          <button
            onClick={() => setProPanelOpen((v) => !v)}
            className="w-10 h-10 rounded-full bg-camera-chip grid place-items-center text-foreground/85"
            aria-label="Exposure"
          >
            <ExposureIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1 bg-camera-chip/80 rounded-full px-1 py-1 backdrop-blur">
            {[0.6, 1, 2].map((z) => {
              const active = zoom === z;
              return (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`min-w-9 h-8 px-2 rounded-full text-xs font-medium transition ${
                    active ? "bg-black text-camera-yellow ring-1 ring-camera-yellow/60" : "text-foreground/80"
                  }`}
                >
                  {z === 1 ? "1x" : `${z}`}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setFilterStripOpen((v) => !v)}
            className={`w-10 h-10 rounded-full bg-camera-chip grid place-items-center ${
              filterStripOpen || activeFilter !== "original" ? "text-camera-yellow" : "text-foreground/85"
            }`}
            aria-label="Filters"
          >
            <SparkleIcon className="w-5 h-5" />
          </button>
        </div>

        {proPanelOpen && (
          <div className="mx-5 mt-3 rounded-xl bg-camera-chip/90 backdrop-blur p-3">
            <div className="flex items-center justify-between text-xs text-foreground/70 mb-1">
              <span>Exposure</span>
              <span className="text-camera-yellow">{exposure > 0 ? `+${exposure}` : exposure}</span>
            </div>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.1}
              value={exposure}
              onChange={(e) => setExposure(parseFloat(e.target.value))}
              className="w-full accent-camera-yellow"
            />
          </div>
        )}

        {/* Mode tabs */}
        <div className="mt-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground/40 rounded-full" />
          <div className="overflow-x-auto no-scrollbar pt-2">
            <div className="flex items-center justify-start gap-7 px-[40%] text-sm">
              {MODES.map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`whitespace-nowrap py-1 transition-colors text-shadow-cam ${
                      active ? "text-camera-yellow font-semibold" : "text-foreground/70"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shutter row */}
        <div className="mt-4 px-6 grid grid-cols-3 items-center">
          <button
            onClick={() => setGalleryOpen(true)}
            className="w-12 h-12 rounded-full overflow-hidden bg-camera-chip ring-2 ring-white/40"
            aria-label="Open gallery"
          >
            {thumb ? (
              <img src={thumb} alt="last capture" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[10px] text-foreground/50">Empty</div>
            )}
          </button>

          <div className="justify-self-center flex items-center gap-5">
            <button
              onClick={onShutter}
              aria-label="Shutter"
              className="relative w-[74px] h-[74px] rounded-full grid place-items-center bg-white"
            >
              <span
                className={`absolute inset-1 rounded-full ring-[3px] ring-black/30 ${
                  isVideoLike
                    ? recording
                      ? "bg-red-500 rounded-md scale-50"
                      : "bg-red-500"
                    : "bg-white"
                } transition-all`}
              />
              <span className="absolute inset-0 rounded-full ring-2 ring-white/90" />
            </button>
            {/* Pause/Resume button — visible when recording */}
            {isVideoLike && recording && (
              <button
                onClick={mode === "Time-Lapse" ? () => toast("Time-lapse can't pause") : togglePause}
                className="w-12 h-12 rounded-full bg-camera-chip grid place-items-center text-foreground ring-2 ring-white/40"
                aria-label={paused ? "Resume" : "Pause"}
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                )}
              </button>
            )}
          </div>

          <button
            onClick={flip}
            className="justify-self-end w-12 h-12 rounded-full bg-camera-chip grid place-items-center text-foreground/85"
            aria-label="Flip camera"
          >
            <FlipIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 mx-auto w-28 h-1 rounded-full bg-foreground/40" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <Gallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onEdit={(item) => {
          setGalleryOpen(false);
          if (item.type === "photo") setEditor({ id: item.id, src: item.dataUrl });
        }}
      />
      <PhotoEditor
        open={!!editor}
        itemId={editor?.id ?? null}
        src={editor?.src ?? null}
        onClose={() => setEditor(null)}
      />
    </div>
  );
};
