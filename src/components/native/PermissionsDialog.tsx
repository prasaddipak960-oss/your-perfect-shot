import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

type PermState = "granted" | "denied" | "prompt" | "limited" | "unknown";

interface PermRow {
  key: "camera" | "microphone" | "storage";
  label: string;
  icon: string;
  why: string;
  state: PermState;
}

const stateColor = (s: PermState) =>
  s === "granted" || s === "limited"
    ? "text-emerald-400 bg-emerald-400/10"
    : s === "denied"
    ? "text-rose-400 bg-rose-400/10"
    : "text-amber-400 bg-amber-400/10";

const stateLabel = (s: PermState) =>
  s === "granted" ? "Allowed"
    : s === "limited" ? "Limited"
    : s === "denied" ? "Blocked"
    : s === "prompt" ? "Not asked"
    : "Unknown";

const isNative = () => Capacitor.isNativePlatform();

// Web-side mic check via Permissions API (best-effort)
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

export const PermissionsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const [rows, setRows] = useState<PermRow[]>([
    { key: "camera", label: "Camera", icon: "📷", why: "Capture photos & videos.", state: "unknown" },
    { key: "microphone", label: "Microphone", icon: "🎙️", why: "Record audio with your videos.", state: "unknown" },
    { key: "storage", label: "Photos / Storage", icon: "🖼️", why: "Save shots to your gallery & pick existing media.", state: "unknown" },
  ]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next: Record<string, PermState> = {};
    if (isNative()) {
      try {
        const s = await Camera.checkPermissions();
        next.camera = (s.camera as PermState) ?? "unknown";
        next.storage = (s.photos as PermState) ?? "unknown";
      } catch {
        next.camera = "unknown";
        next.storage = "unknown";
      }
      // Mic state is not exposed by Capacitor Camera plugin — show "unknown"
      // unless web Permissions API works inside the WebView.
      next.microphone = await queryWebPerm("microphone");
    } else {
      next.camera = await queryWebPerm("camera");
      next.microphone = await queryWebPerm("microphone");
      next.storage = "granted"; // browser handles via download / file input
    }
    setRows((rs) => rs.map((r) => ({ ...r, state: next[r.key] ?? r.state })));
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const requestOne = async (key: PermRow["key"]) => {
    setBusy(true);
    try {
      if (isNative()) {
        if (key === "camera") {
          await Camera.requestPermissions({ permissions: ["camera"] });
        } else if (key === "storage") {
          await Camera.requestPermissions({ permissions: ["photos"] });
        } else {
          // Mic: trigger via getUserMedia which routes through native permission
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
          } catch {
            toast.error("Microphone permission was not granted");
          }
        }
      } else {
        if (key === "camera" || key === "microphone") {
          const constraints = key === "camera" ? { video: true } : { audio: true };
          try {
            const s = await navigator.mediaDevices.getUserMedia(constraints);
            s.getTracks().forEach((t) => t.stop());
          } catch {
            toast.error(`${key} permission was not granted`);
          }
        }
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const requestAll = async () => {
    setBusy(true);
    try {
      if (isNative()) {
        await Camera.requestPermissions({ permissions: ["camera", "photos"] });
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {
        /* user denied — state will reflect it */
      }
      toast.success("Permission check complete");
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">App Permissions</DialogTitle>
          <DialogDescription className="text-foreground/60 text-xs pt-1">
            Yeh app fully offline kaam karta hai. Ye permissions sirf device pe use hoti hain — kuch upload nahi hota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {rows.map((r) => (
            <div
              key={r.key}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
            >
              <span className="text-2xl w-9 text-center">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${stateColor(r.state)}`}>
                    {stateLabel(r.state)}
                  </span>
                </div>
                <p className="text-[11px] text-foreground/55 mt-0.5">{r.why}</p>
              </div>
              <button
                disabled={busy}
                onClick={() => requestOne(r.key)}
                className="text-[11px] px-2.5 py-1.5 rounded-md bg-camera-yellow text-black font-medium disabled:opacity-50"
              >
                {r.state === "granted" || r.state === "limited" ? "Re-check" : "Allow"}
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            disabled={busy}
            onClick={requestAll}
            className="flex-1 py-2.5 rounded-lg bg-camera-yellow text-black text-sm font-semibold disabled:opacity-50"
          >
            Allow All
          </button>
          <button
            disabled={busy}
            onClick={refresh}
            className="px-4 py-2.5 rounded-lg bg-white/5 text-foreground text-sm border border-white/10"
          >
            Refresh
          </button>
        </div>

        <p className="text-[10px] text-foreground/40 mt-2 leading-relaxed">
          Agar permission "Blocked" dikha raha hai to Android Settings → Apps → Your Perfect Shot → Permissions me jaake manually allow karna padega.
        </p>
      </DialogContent>
    </Dialog>
  );
};
