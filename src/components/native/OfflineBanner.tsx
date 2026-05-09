import { useEffect, useState } from "react";
import { subscribeNetwork } from "./nativeBridge";

/**
 * Network status indicator:
 *  - Offline: amber banner ("camera works fine, gallery saves locally")
 *  - Online (first 4s after mount): tiny green pill confirming the app
 *    works without internet — so users can verify offline support.
 */
export const OfflineBanner = () => {
  const [online, setOnline] = useState(true);
  const [showReady, setShowReady] = useState(true);

  useEffect(() => {
    const unsub = subscribeNetwork(setOnline);
    const t = window.setTimeout(() => setShowReady(false), 4000);
    return () => {
      const r = unsub as unknown as () => void;
      r?.();
      window.clearTimeout(t);
    };
  }, []);

  if (!online) {
    return (
      <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500/95 text-black text-center text-[11px] py-1 font-medium">
        Offline mode — camera works fine, gallery saves locally
      </div>
    );
  }

  if (!showReady) return null;

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[55] px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-medium backdrop-blur">
      ✓ Works offline — no internet required
    </div>
  );
};
