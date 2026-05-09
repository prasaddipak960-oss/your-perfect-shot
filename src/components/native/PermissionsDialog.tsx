import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { openAppSettings } from "./nativeBridge";
import { anyBlocked, allGranted, usePermissions, type PermState } from "./usePermissions";

const isNative = () => Capacitor.isNativePlatform();

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

interface RowDef {
  key: "camera" | "microphone" | "storage";
  label: string;
  icon: string;
  why: string;
}

const ROWS: RowDef[] = [
  { key: "camera", label: "Camera", icon: "📷", why: "Capture photos & videos." },
  { key: "microphone", label: "Microphone", icon: "🎙️", why: "Record audio with your videos." },
  { key: "storage", label: "Photos / Storage", icon: "🖼️", why: "Save shots & pick existing media." },
];

export const PermissionsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const { status, refresh } = usePermissions();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const requestOne = async (key: RowDef["key"]) => {
    setBusy(true);
    try {
      if (isNative()) {
        if (key === "camera") {
          await Camera.requestPermissions({ permissions: ["camera"] });
        } else if (key === "storage") {
          await Camera.requestPermissions({ permissions: ["photos"] });
        } else {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
          } catch {
            toast.error("Microphone permission was not granted");
          }
        }
      } else {
        const constraints = key === "camera" ? { video: true } : { audio: true };
        try {
          const s = await navigator.mediaDevices.getUserMedia(constraints);
          s.getTracks().forEach((t) => t.stop());
        } catch {
          toast.error(`${key} permission was not granted`);
        }
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const retryAll = async () => {
    setBusy(true);
    try {
      if (isNative()) {
        await Camera.requestPermissions({ permissions: ["camera", "photos"] });
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch { /* denied — reflected in state */ }
      await refresh();
      if (allGranted(status)) toast.success("All permissions granted");
      else toast("Permission status updated");
    } finally {
      setBusy(false);
    }
  };

  const blocked = anyBlocked(status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-white/10 text-foreground max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">App Permissions</DialogTitle>
          <DialogDescription className="text-foreground/60 text-xs pt-1">
            Yeh app fully offline kaam karta hai. Ye permissions sirf device pe use hoti hain — kuch upload nahi hota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {ROWS.map((r) => {
            const st = status[r.key];
            return (
              <div
                key={r.key}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
              >
                <span className="text-2xl w-9 text-center">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${stateColor(st)}`}>
                      {stateLabel(st)}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/55 mt-0.5">{r.why}</p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => requestOne(r.key)}
                  className="text-[11px] px-2.5 py-1.5 rounded-md bg-camera-yellow text-black font-medium disabled:opacity-50"
                >
                  {st === "granted" || st === "limited" ? "Re-check" : "Allow"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            disabled={busy}
            onClick={retryAll}
            className="py-2.5 rounded-lg bg-camera-yellow text-black text-sm font-semibold disabled:opacity-50"
          >
            🔄 Retry Permissions
          </button>
          <button
            onClick={() => {
              const ok = openAppSettings();
              if (!ok) toast("Open device Settings → Apps → Your Perfect Shot → Permissions");
            }}
            className="py-2.5 rounded-lg bg-white/10 text-foreground text-sm border border-white/10"
          >
            ⚙️ Open Settings
          </button>
        </div>

        {blocked && (
          <div className="text-left text-[11px] text-foreground/75 leading-relaxed bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-3 space-y-1">
            <p className="font-semibold text-rose-300">Permission Blocked — manual steps:</p>
            <p>1. Tap <span className="text-camera-yellow">Open Settings</span> above.</p>
            <p>2. Tap <span className="text-foreground">Permissions</span>.</p>
            <p>3. Allow <span className="text-foreground">Camera</span>, <span className="text-foreground">Microphone</span>, <span className="text-foreground">Photos / Storage</span>.</p>
            <p>4. Wapas app me aaye — Retry Permissions tap karein.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
