import { useEffect, useState } from "react";
import { subscribeNetwork } from "./nativeBridge";

/**
 * Tiny status banner — only shows when device goes offline.
 * The camera itself works without internet, but we still inform the user.
 */
export const OfflineBanner = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = subscribeNetwork(setOnline);
    return () => {
      const r = unsub as unknown as () => void;
      r?.();
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500/95 text-black text-center text-[11px] py-1 font-medium">
      Offline mode — camera works fine, gallery saves locally
    </div>
  );
};
