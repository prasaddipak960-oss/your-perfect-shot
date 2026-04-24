import { useEffect, useState } from "react";

/**
 * In-app splash screen (works on web AND native). The native Capacitor splash
 * is configured in capacitor.config.ts and hides automatically; this React
 * splash gives a smooth branded transition before the camera UI mounts.
 */
export const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    const done = window.setTimeout(() => onDone(), 2400);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-camera-yellow to-amber-500 grid place-items-center shadow-[0_0_40px_hsl(var(--camera-yellow)/0.5)]">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-black" fill="currentColor">
              <path d="M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-camera-yellow animate-ping" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide text-foreground">Your Perfect Shot</h1>
          <p className="text-xs text-foreground/60 mt-1">HD Pro Camera · Beauty · Filters</p>
        </div>
        <div className="mt-4 flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-camera-yellow animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-camera-yellow animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-camera-yellow animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
      <p className="absolute bottom-6 text-[10px] text-foreground/40">v1.0 · Made for Mobile</p>
    </div>
  );
};
