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

type Mode = "Time-Lapse" | "Night" | "Pro" | "Photo" | "Video" | "Beauty" | "Short Video";
type AspectRatioOption = "full" | "4:3" | "16:9";
type TimerOption = 0 | 3 | 5;

const MODES: Mode[] = ["Time-Lapse", "Night", "Pro", "Photo", "Video", "Beauty", "Short Video"];

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
  const shutterTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>("Photo");
  const [zoom, setZoom] = useState<number>(1);
  const [flashOn, setFlashOn] = useState(false);
  const [motionFreeze, setMotionFreeze] = useState(false);
  const [nightOn, setNightOn] = useState(false);
  const [scanOn, setScanOn] = useState(false);
  const [hdrOn, setHdrOn] = useState(false);
  const [gridOn, setGridOn] = useState(false);
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
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("full");
  const [timerSeconds, setTimerSeconds] = useState<TimerOption>(0);
  const [mirrorOn, setMirrorOn] = useState(true);
  const [locationOn, setLocationOn] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const items = loadGallery();
      setThumb(items[0]?.dataUrl ?? null);
    };
    refresh();
    window.addEventListener("gallery-updated", refresh);
    return () => window.removeEventListener("gallery-updated", refresh);
  }, []);

  useEffect(() => {
    if (!recording) return;
    setRecTime(0);
    const id = window.setInterval(() => {
      setRecTime((t) => (paused ? t : t + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [recording, paused]);

  useEffect(() => {
    return () => {
      if (lapseTimerRef.current) clearInterval(lapseTimerRef.current);
      if (shutterTimerRef.current) clearInterval(shutterTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (mode !== "Video" && mode !== "Short Video" && mode !== "Time-Lapse" && recording) stopRecording();
    if (shutterTimerRef.current) {
      clearInterval(shutterTimerRef.current);
      shutterTimerRef.current = null;
      setCountdown(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const shouldMirrorPreview = facing === "user" && mirrorOn;

  const videoFilter = useMemo(() => {
    const parts: string[] = [];
    parts.push(MODE_FILTERS[mode]);
    parts.push(filterById(activeFilter).css);
    if (nightOn) parts.push("brightness(1.35) contrast(1.1)");
    if (hdrOn) parts.push("contrast(1.16) saturate(1.14) brightness(1.03)");
    if (scanOn) parts.push("grayscale(1) contrast(1.3) brightness(1.08)");
    if (motionFreeze) parts.push("contrast(1.08) saturate(0.96)");
    if (exposure !== 0) parts.push(`brightness(${1 + exposure * 0.2})`);
    return parts.filter((part) => part && part !== "none").join(" ") || "none";
  }, [mode, activeFilter, nightOn, hdrOn, scanOn, motionFreeze, exposure]);

  const captureToDataUrl = async (): Promise<{ id: string; dataUrl: string } | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    if (flashOn && !torchSupported) {
      setShutterFlash(true);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const sourceRatio = w / h;
    const targetRatio = aspectRatio === "4:3" ? 3 / 4 : aspectRatio === "16:9" ? 9 / 16 : sourceRatio;

    let sx = 0;
    let sy = 0;
    let sw = w;
    let sh = h;

    if (Math.abs(sourceRatio - targetRatio) > 0.01) {
      if (sourceRatio > targetRatio) {
        sw = h * targetRatio;
        sx = (w - sw) / 2;
      } else {
        sh = w / targetRatio;
        sy = (h - sh) / 2;
      }
    }

    const outputWidth = Math.round(sw);
    const outputHeight = Math.round(sh);
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, outputWidth, outputHeight);
    ctx.filter = videoFilter;

    if (shouldMirrorPreview) {
      ctx.translate(outputWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";

    if (locationOn) {
      const timestamp = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date());
      const stamp = locationLabel ? `${locationLabel} • ${timestamp}` : timestamp;
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.fillRect(16, outputHeight - 42, Math.min(outputWidth - 32, 320), 26);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(stamp, 24, outputHeight - 29);
    }

    setShutterFlash(false);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const id = crypto.randomUUID();
    return { id, dataUrl };
  };

  const capturePhoto = async (openEditorAfter = false) => {
    const res = await captureToDataUrl();
    if (!res) return;
    const item: GalleryItem = {
      id: res.id,
      type: "photo",
      dataUrl: res.dataUrl,
      createdAt: Date.now(),
      filter: activeFilter,
    };
    saveItem(item);
    toast.success(mode === "Beauty" ? "Beauty shot saved" : "Photo captured");
    if (openEditorAfter) setEditor({ id: res.id, src: res.dataUrl });
  };

  const startRecording = () => {
    const stream = (videoRef.current?.srcObject as MediaStream | null) ?? null;
    if (!stream) {
      retry();
      toast.error("Camera preview not ready yet");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      toast.error("Video recording is not supported in this browser");
      return;
    }

    recordedChunks.current = [];
    const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

    rec.ondataavailable = (event) => {
      if (event.data.size) recordedChunks.current.push(event.data);
    };

    rec.onstop = async () => {
      if (!recordedChunks.current.length) return;
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

  const startTimeLapse = () => {
    setRecording(true);
    setPaused(false);
    lapseTimerRef.current = window.setInterval(async () => {
      const res = await captureToDataUrl();
      if (res) {
        saveItem({ id: res.id, type: "photo", dataUrl: res.dataUrl, createdAt: Date.now(), filter: activeFilter });
      }
    }, 2000);
  };

  const runShutterAction = () => {
    if (mode === "Video" || mode === "Short Video") {
      recording ? stopRecording() : startRecording();
    } else if (mode === "Time-Lapse") {
      recording ? stopRecording() : startTimeLapse();
    } else if (mode === "Beauty") {
      void capturePhoto(true);
    } else {
      void capturePhoto(false);
    }
  };

  const onShutter = () => {
    if (!isVideoLike && timerSeconds > 0) {
      if (shutterTimerRef.current) clearInterval(shutterTimerRef.current);
      let remaining = timerSeconds;
      setCountdown(remaining);
      shutterTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (shutterTimerRef.current) {
            clearInterval(shutterTimerRef.current);
            shutterTimerRef.current = null;
          }
          setCountdown(0);
          runShutterAction();
          return;
        }
        setCountdown(remaining);
      }, 1000);
      return;
    }

    runShutterAction();
  };

  const handleLocationToggle = () => {
    const next = !locationOn;
    setLocationOn(next);

    if (!next) {
      setLocationLabel(null);
      toast("Location stamp off");
      return;
    }

    if (!navigator.geolocation) {
      setLocationLabel(null);
      toast("Location stamp on");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLabel(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      () => {
        setLocationLabel(null);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 }
    );

    toast("Location stamp on");
  };

  const handleQuickOption = (option: string) => {
    switch (option) {
      case "Timer": {
        const next = timerSeconds === 0 ? 3 : timerSeconds === 3 ? 5 : 0;
        setTimerSeconds(next as TimerOption);
        toast(next === 0 ? "Timer off" : `Timer ${next}s`);
        break;
      }
      case "Aspect 4:3": {
        const next = aspectRatio === "4:3" ? "full" : "4:3";
        setAspectRatio(next);
        toast(next === "full" ? "Full aspect" : "4:3 aspect");
        break;
      }
      case "Aspect 16:9": {
        const next = aspectRatio === "16:9" ? "full" : "16:9";
        setAspectRatio(next);
        toast(next === "full" ? "Full aspect" : "16:9 aspect");
        break;
      }
      case "Grid":
        setGridOn((current) => !current);
        break;
      case "HDR":
        setHdrOn((current) => !current);
        break;
      case "Mirror":
        setMirrorOn((current) => !current);
        break;
      default:
        break;
    }
  };

  const isQuickOptionActive = (option: string) => {
    switch (option) {
      case "Timer":
        return timerSeconds > 0;
      case "Aspect 4:3":
        return aspectRatio === "4:3";
      case "Aspect 16:9":
        return aspectRatio === "16:9";
      case "Grid":
        return gridOn;
      case "HDR":
        return hdrOn;
      case "Mirror":
        return mirrorOn;
      default:
        return false;
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const isVideoLike = mode === "Video" || mode === "Short Video" || mode === "Time-Lapse";

  return (
    <div className="relative w-full h-[100dvh] bg-background text-foreground overflow-hidden select-none">
      <div className="absolute top-2 right-3 z-30 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(0,255,80,0.8)]" />
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-7 pb-3 flex items-center justify-between">
        <button
          onClick={() => {
            if (torchSupported) {
              void toggleTorch();
            } else {
              setFlashOn((value) => !value);
              toast(flashOn ? "Flash off" : "Flash on (screen)");
            }
          }}
          className={`p-1 ${torchOn || flashOn ? "text-camera-yellow" : "text-foreground/85"}`}
          aria-label="Flash"
        >
          <FlashOffIcon />
        </button>
        <button
          onClick={() => setMotionFreeze((value) => !value)}
          className={`p-1 ${motionFreeze ? "text-camera-yellow" : "text-foreground/85"}`}
          aria-label="Motion"
        >
          <NoFlashRunIcon />
        </button>
        <button
          onClick={() => setScanOn((value) => !value)}
          className={`p-1 ${scanOn ? "text-camera-yellow" : "text-foreground/85"}`}
          aria-label="Scan"
        >
          <ScanIcon />
        </button>
        <button
          onClick={() => setTopMenuOpen((value) => !value)}
          className="px-3 py-1 rounded-full bg-camera-chip text-foreground/85"
          aria-label="More"
        >
          <ChevronDownIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleLocationToggle}
          className={`p-1 ${locationOn ? "text-camera-yellow" : "text-foreground/85"}`}
          aria-label="Location"
        >
          <LocationOffIcon />
        </button>
      </div>

      {topMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-20 mx-5 rounded-xl bg-camera-chip/90 backdrop-blur p-3 flex flex-wrap gap-2 text-xs">
          {["Timer", "Aspect 4:3", "Aspect 16:9", "Grid", "HDR", "Mirror"].map((option) => (
            <button
              key={option}
              className={`px-3 py-1.5 rounded-full transition ${
                isQuickOptionActive(option) ? "bg-white/20 text-camera-yellow" : "bg-white/10 hover:bg-white/20"
              }`}
              onClick={() => handleQuickOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-14 bottom-56 mx-2 overflow-hidden rounded-md ring-1 ring-white/5">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-[filter,transform] ${shouldMirrorPreview ? "-scale-x-100" : ""}`}
            style={{
              filter: videoFilter,
              transform: `${shouldMirrorPreview ? "scaleX(-1) " : ""}scale(${zoom})`,
              transformOrigin: "center",
            }}
          />

          <div className="pointer-events-none absolute inset-2 border border-white/10" />
          {gridOn && (
            <div className="pointer-events-none absolute inset-2">
              <span className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
              <span className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
              <span className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <span className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-between px-2">
            <span className="w-4 h-4 border-t border-l border-white/40" />
            <span className="w-4 h-4 border-t border-r border-white/40" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-2">
            <span className="w-4 h-4 border-b border-l border-white/40" />
            <span className="w-4 h-4 border-b border-r border-white/40" />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-20 h-20">
              <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-camera-yellow" />
              <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-camera-yellow" />
              <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-camera-yellow" />
              <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-camera-yellow" />
            </div>
          </div>

          {countdown > 0 && (
            <div className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="text-6xl font-semibold text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.4)]">{countdown}</span>
            </div>
          )}

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

      <div className="absolute left-3 z-20" style={{ top: "calc(50% - 20px)" }}>
        <button
          onClick={() => setNightOn((value) => !value)}
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

      <div className="absolute bottom-0 left-0 right-0 z-20 pb-5">
        {filterStripOpen && (
          <div className="px-3 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`shrink-0 text-center ${activeFilter === filter.id ? "text-camera-yellow" : "text-foreground/70"}`}
              >
                <div
                  className={`w-14 h-14 rounded-md overflow-hidden ring-2 ${
                    activeFilter === filter.id ? "ring-camera-yellow" : "ring-white/15"
                  } bg-camera-chip grid place-items-center`}
                  style={{ filter: filter.css }}
                >
                  <span className="text-[10px] text-white/80">{filter.label[0]}</span>
                </div>
                <div className="text-[10px] mt-1">{filter.label}</div>
              </button>
            ))}
          </div>
        )}

        <div className="px-5 flex items-center justify-between">
          <button
            onClick={() => setProPanelOpen((value) => !value)}
            className="w-10 h-10 rounded-full bg-camera-chip grid place-items-center text-foreground/85"
            aria-label="Exposure"
          >
            <ExposureIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1 bg-camera-chip/80 rounded-full px-1 py-1 backdrop-blur">
            {[0.6, 1, 2].map((value) => {
              const active = zoom === value;
              return (
                <button
                  key={value}
                  onClick={() => setZoom(value)}
                  className={`min-w-9 h-8 px-2 rounded-full text-xs font-medium transition ${
                    active ? "bg-black text-camera-yellow ring-1 ring-camera-yellow/60" : "text-foreground/80"
                  }`}
                >
                  {value === 1 ? "1x" : `${value}`}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setFilterStripOpen((value) => !value)}
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
              onChange={(event) => setExposure(parseFloat(event.target.value))}
              className="w-full accent-camera-yellow"
            />
          </div>
        )}

        <div className="mt-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground/40 rounded-full" />
          <div className="overflow-x-auto no-scrollbar pt-2">
            <div className="flex items-center justify-start gap-7 px-[40%] text-sm">
              {MODES.map((currentMode) => {
                const active = mode === currentMode;
                return (
                  <button
                    key={currentMode}
                    onClick={() => setMode(currentMode)}
                    className={`whitespace-nowrap py-1 transition-colors text-shadow-cam ${
                      active ? "text-camera-yellow font-semibold" : "text-foreground/70"
                    }`}
                  >
                    {currentMode.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

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
                className={`absolute inset-1 ring-[3px] ring-black/30 ${
                  isVideoLike ? (recording ? "bg-red-500 rounded-md scale-50" : "bg-red-500 rounded-full") : "bg-white rounded-full"
                } transition-all`}
              />
              <span className="absolute inset-0 rounded-full ring-2 ring-white/90" />
            </button>
            {isVideoLike && recording && (
              <button
                onClick={mode === "Time-Lapse" ? () => toast("Time-lapse can't pause") : togglePause}
                className="w-12 h-12 rounded-full bg-camera-chip grid place-items-center text-foreground ring-2 ring-white/40"
                aria-label={paused ? "Resume" : "Pause"}
              >
                {paused ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                  </svg>
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
