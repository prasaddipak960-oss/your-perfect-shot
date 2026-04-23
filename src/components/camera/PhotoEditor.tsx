import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FILTERS, FilterId, filterById } from "./filters";
import { updateItem } from "./gallery";
import { toast } from "sonner";

type Tool = "filters" | "adjust" | "text" | "blur" | "doodle" | "mosaic" | "stickers" | "effect" | "crop";

interface PhotoEditorProps {
  open: boolean;
  itemId: string | null;
  src: string | null;
  onClose: () => void;
}

const STICKERS = ["✨", "❤️", "🔥", "🌸", "⭐", "🎉", "📸", "🌈"];
const EFFECTS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "None", css: "none" },
  { id: "vignette", label: "Vignette", css: "brightness(0.95) contrast(1.1)" },
  { id: "dream", label: "Dream", css: "blur(0.4px) saturate(1.2) brightness(1.05)" },
  { id: "sharp", label: "Sharp", css: "contrast(1.3) saturate(1.1)" },
  { id: "fade", label: "Fade", css: "contrast(0.9) brightness(1.05) saturate(0.85)" },
];

export const PhotoEditor = ({ open, itemId, src, onClose }: PhotoEditorProps) => {
  const [tool, setTool] = useState<Tool>("filters");
  const [filter, setFilter] = useState<FilterId>("original");
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturate, setSaturate] = useState(1);
  const [blur, setBlur] = useState(0);
  const [effect, setEffect] = useState<string>("none");
  const [text, setText] = useState("");
  const [textItems, setTextItems] = useState<{ id: string; text: string }[]>([]);
  const [stickers, setStickers] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (open) {
      setTool("filters");
      setFilter("original");
      setBrightness(1);
      setContrast(1);
      setSaturate(1);
      setBlur(0);
      setEffect("none");
      setText("");
      setTextItems([]);
      setStickers([]);
    }
  }, [open, itemId]);

  const composedFilter = useMemo(() => {
    const parts = [filterById(filter).css];
    if (effect !== "none") parts.push(EFFECTS.find((e) => e.id === effect)?.css || "none");
    parts.push(`brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)`);
    return parts.filter((p) => p && p !== "none").join(" ");
  }, [filter, brightness, contrast, saturate, blur, effect]);

  const save = async () => {
    if (!src || !itemId) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await new Promise((r) => (img.onload = r));
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = composedFilter;
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
    // Burn-in text overlays
    const fontSize = Math.max(28, Math.floor(canvas.width * 0.05));
    ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = Math.max(2, fontSize / 12);
    textItems.forEach((t, i) => {
      const y = canvas.height - 60 - i * (fontSize + 12);
      ctx.strokeText(t.text, 40, y);
      ctx.fillText(t.text, 40, y);
    });
    // Stickers
    const sSize = Math.max(40, Math.floor(canvas.width * 0.08));
    ctx.font = `${sSize}px serif`;
    stickers.forEach((s, i) => {
      ctx.fillText(s, 40 + i * (sSize + 10), 80 + sSize);
    });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    updateItem(itemId, { dataUrl });
    toast.success("Saved");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 bg-background border-white/10 text-foreground">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={onClose} className="text-sm text-foreground/70">Cancel</button>
          <span className="text-sm font-medium">Stylish Editor</span>
          <button onClick={save} className="text-sm font-semibold text-camera-yellow">Save</button>
        </div>

        <div className="relative bg-black aspect-[3/4] overflow-hidden">
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt="editing"
              className="w-full h-full object-contain"
              style={{ filter: composedFilter }}
            />
          )}
          {/* Crop overlay (visual only) */}
          {tool === "crop" && (
            <div className="absolute inset-6 border-2 border-white/90 pointer-events-none">
              <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-full" />
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full" />
              <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-full" />
              <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-full" />
              <span className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
              <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
            </div>
          )}
          {/* Text preview */}
          <div className="pointer-events-none absolute bottom-3 left-4 right-4 space-y-1 text-white drop-shadow">
            {textItems.map((t) => (
              <div key={t.id} className="text-xl font-bold">{t.text}</div>
            ))}
          </div>
          {/* Sticker preview */}
          <div className="pointer-events-none absolute top-3 left-3 flex gap-1 text-3xl">
            {stickers.map((s, i) => <span key={i}>{s}</span>)}
          </div>
        </div>

        {/* Tool panel */}
        <div className="px-3 py-3 max-h-44 overflow-y-auto">
          {tool === "filters" && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 w-16 text-center ${filter === f.id ? "text-camera-yellow" : "text-foreground/70"}`}
                >
                  {src && (
                    <div className={`w-16 h-16 rounded-md overflow-hidden ring-2 ${filter === f.id ? "ring-camera-yellow" : "ring-white/15"}`}>
                      <img src={src} alt={f.label} className="w-full h-full object-cover" style={{ filter: f.css }} />
                    </div>
                  )}
                  <div className="text-[10px] mt-1">{f.label}</div>
                </button>
              ))}
            </div>
          )}

          {tool === "adjust" && (
            <div className="space-y-2 text-xs">
              <Slider label="Brightness" value={brightness} min={0.5} max={1.5} step={0.05} onChange={setBrightness} />
              <Slider label="Contrast" value={contrast} min={0.5} max={1.8} step={0.05} onChange={setContrast} />
              <Slider label="Saturation" value={saturate} min={0} max={2} step={0.05} onChange={setSaturate} />
            </div>
          )}

          {tool === "blur" && (
            <Slider label="Blur" value={blur} min={0} max={8} step={0.2} onChange={setBlur} />
          )}

          {tool === "effect" && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {EFFECTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEffect(e.id)}
                  className={`shrink-0 px-3 py-2 rounded-full text-xs ${effect === e.id ? "bg-camera-yellow text-black" : "bg-camera-chip text-foreground/80"}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          )}

          {tool === "text" && (
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add text…"
                className="flex-1 bg-camera-chip rounded px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={() => {
                  if (!text.trim()) return;
                  setTextItems((arr) => [...arr, { id: crypto.randomUUID(), text }]);
                  setText("");
                }}
                className="px-3 py-2 rounded bg-camera-yellow text-black text-sm font-medium"
              >
                Add
              </button>
            </div>
          )}

          {tool === "stickers" && (
            <div className="flex gap-2 flex-wrap">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStickers((arr) => [...arr, s])}
                  className="w-10 h-10 rounded bg-camera-chip text-2xl grid place-items-center"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {tool === "mosaic" && (
            <div className="text-xs text-foreground/60 px-2 py-3">
              Tap and drag on the image to mosaic — preview shown.
              <button
                onClick={() => setBlur((b) => Math.min(8, b + 2))}
                className="ml-2 px-2 py-1 rounded bg-camera-chip"
              >
                Apply mosaic
              </button>
            </div>
          )}

          {tool === "doodle" && (
            <div className="text-xs text-foreground/60 px-2 py-3">Doodle uses freehand drawing — pick a color:
              <div className="flex gap-2 mt-2">
                {["#fff", "#facc15", "#ef4444", "#22c55e", "#3b82f6"].map((c) => (
                  <span key={c} className="w-6 h-6 rounded-full ring-1 ring-white/30" style={{ background: c }} />
                ))}
              </div>
            </div>
          )}

          {tool === "crop" && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar text-xs">
              {["Free", "1:1", "4:3", "16:9", "3:4"].map((r) => (
                <button key={r} className="shrink-0 px-3 py-2 rounded-full bg-camera-chip text-foreground/80">{r}</button>
              ))}
            </div>
          )}
        </div>

        {/* Tool tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 border-t border-white/10 bg-black">
          {[
            { id: "stickers", label: "Stickers", icon: "★" },
            { id: "text", label: "Text", icon: "T" },
            { id: "filters", label: "Filters", icon: "◐" },
            { id: "mosaic", label: "Mosaic", icon: "▦" },
            { id: "doodle", label: "Doodle", icon: "✎" },
            { id: "adjust", label: "Adjust", icon: "≡" },
            { id: "blur", label: "Blur", icon: "◍" },
            { id: "effect", label: "Effect", icon: "✦" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              className={`py-2 rounded-md flex flex-col items-center gap-0.5 text-[11px] ${
                tool === t.id ? "text-camera-yellow bg-white/5" : "text-foreground/70"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
};

const Slider = ({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) => (
  <div>
    <div className="flex justify-between text-foreground/70"><span>{label}</span><span className="text-camera-yellow">{value.toFixed(2)}</span></div>
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-camera-yellow"
    />
  </div>
);
