import { useEffect, useRef, useState } from "react";
import { openAppSettings } from "./nativeBridge";
import {
  allGranted,
  anyBlocked,
  checkPermissions,
  requestAllPermissions,
  usePermissions,
} from "./usePermissions";

const KEY = "yps.firstRunPerms.v2";

/**
 * First-run welcome overlay. Asks Camera / Mic / Storage permissions
 * directly via OS prompts. Auto-closes when everything is granted.
 * If any permission is "Blocked", shows a step-by-step guide + Open
 * App Settings button.
 */
export const FirstRunPermissions = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { status, refresh, setStatus } = usePermissions();
  const dismissedRef = useRef(false);

  // Decide whether to show on first launch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = (() => {
        try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
      })();
      const s = await checkPermissions();
      if (cancelled) return;
      setStatus(s);
      if (allGranted(s)) {
        // Already good — never show
        try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
        return;
      }
      if (!seen) {
        const t = window.setTimeout(() => setOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    })();
    return () => { cancelled = true; };
  }, [setStatus]);

  // Auto-close when everything becomes granted
  useEffect(() => {
    if (open && allGranted(status)) {
      try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      setOpen(false);
    }
  }, [open, status]);

  const dismiss = () => {
    dismissedRef.current = true;
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  const handleAllow = async () => {
    setBusy(true);
    try {
      const s = await requestAllPermissions();
      setStatus(s);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = () => {
    openAppSettings();
  };

  if (!open) return null;

  const blocked = anyBlocked(status);

  const Row = ({ icon, label, state }: { icon: string; label: string; state: string }) => {
    const ok = state === "granted" || state === "limited";
    const bad = state === "denied";
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/30">
        <span className="text-xl">{icon}</span>
        <span className="flex-1 text-xs text-foreground/85">{label}</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            ok
              ? "text-emerald-400 bg-emerald-400/10"
              : bad
              ? "text-rose-400 bg-rose-400/10"
              : "text-amber-400 bg-amber-400/10"
          }`}
        >
          {ok ? "Granted" : bad ? "Blocked" : "Pending"}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-camera-chip border border-white/10 p-6 text-center my-auto">
        <div className="w-16 h-16 mx-auto rounded-full bg-camera-yellow text-black grid place-items-center text-3xl mb-3">
          {blocked ? "⚠️" : "⚙️"}
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {blocked ? "Permissions Blocked" : "Welcome to Your Perfect Shot"}
        </h2>
        <p className="text-xs text-foreground/65 leading-relaxed mb-5">
          {blocked
            ? "Camera, Microphone ya Storage block ho gaya hai. Niche steps follow karke App Settings me jaake allow karein."
            : "Camera app chalane ke liye Camera, Microphone aur Storage allow karein."}
        </p>

        <div className="space-y-2 text-left mb-4">
          <Row icon="📷" label="Camera — photos & video" state={status.camera} />
          <Row icon="🎙️" label="Microphone — record audio" state={status.microphone} />
          <Row icon="🖼️" label="Storage — save your shots" state={status.storage} />
        </div>

        {blocked && (
          <div className="text-left text-[11px] text-foreground/70 leading-relaxed bg-black/40 rounded-lg p-3 mb-4 space-y-1">
            <p className="font-semibold text-foreground/90">How to enable manually:</p>
            <p>1. Tap <span className="text-camera-yellow">Open App Settings</span> below.</p>
            <p>2. Tap <span className="text-foreground">Permissions</span>.</p>
            <p>3. Allow <span className="text-foreground">Camera</span>, <span className="text-foreground">Microphone</span>, <span className="text-foreground">Photos / Storage</span>.</p>
            <p>4. Wapas app me aaye — auto-detect ho jayega.</p>
          </div>
        )}

        {blocked ? (
          <button
            onClick={handleOpenSettings}
            className="w-full py-3 rounded-xl bg-camera-yellow text-black text-sm font-semibold"
          >
            ⚙️  Open App Settings
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={handleAllow}
            className="w-full py-3 rounded-xl bg-camera-yellow text-black text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Asking…" : "✅  Allow Camera, Mic & Storage"}
          </button>
        )}

        <div className="flex gap-2 mt-2">
          <button
            disabled={busy}
            onClick={refresh}
            className="flex-1 py-2 rounded-lg bg-white/5 text-foreground/85 text-[12px] border border-white/10"
          >
            🔄 Re-check
          </button>
          <button
            onClick={dismiss}
            className="flex-1 py-2 text-[12px] text-foreground/55"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
