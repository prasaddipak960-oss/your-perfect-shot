import { useEffect, useState } from "react";
import { PermissionsDialog } from "./PermissionsDialog";
import { openAppSettings } from "./nativeBridge";

const KEY = "yps.firstRunPerms.v1";

/**
 * Shown the first time the app opens. Asks the user to tap a settings button
 * which then triggers the camera / microphone / storage permission prompts.
 */
export const FirstRunPermissions = () => {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        // Slight delay so splash screen finishes first
        const t = window.setTimeout(() => setWelcomeOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      setWelcomeOpen(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setWelcomeOpen(false);
  };

  const openSettings = () => {
    dismiss();
    // On the APK, jump straight to Android's "App info → Permissions" screen.
    const opened = openAppSettings();
    // Always also show the in-app permissions dialog so user has both options.
    setPermsOpen(!opened);
  };

  return (
    <>
      {welcomeOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-2xl bg-camera-chip border border-white/10 p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-camera-yellow text-black grid place-items-center text-3xl mb-3">
              ⚙️
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Welcome to Your Perfect Shot
            </h2>
            <p className="text-xs text-foreground/65 leading-relaxed mb-5">
              Camera app chalane ke liye Camera, Microphone aur Storage ka
              permission chahiye. Niche Settings tap karke allow karein.
            </p>

            <div className="space-y-2 text-left mb-5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/30">
                <span className="text-xl">📷</span>
                <span className="text-xs text-foreground/85">Camera — photos &amp; video</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/30">
                <span className="text-xl">🎙️</span>
                <span className="text-xs text-foreground/85">Microphone — record audio</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/30">
                <span className="text-xl">🖼️</span>
                <span className="text-xs text-foreground/85">Storage — save your shots</span>
              </div>
            </div>

            <button
              onClick={openSettings}
              className="w-full py-3 rounded-xl bg-camera-yellow text-black text-sm font-semibold"
            >
              ⚙️  Open Settings &amp; Allow
            </button>
            <button
              onClick={dismiss}
              className="w-full mt-2 py-2 text-[11px] text-foreground/50"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      <PermissionsDialog open={permsOpen} onOpenChange={setPermsOpen} />
    </>
  );
};
