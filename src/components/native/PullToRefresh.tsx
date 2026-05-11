import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Lightweight pull-to-refresh. Active only when the page is scrolled to the
 * top — so it does not interfere with the camera viewfinder or gallery scroll.
 */
export const PullToRefresh = ({ children }: { children: ReactNode }) => {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setPull(Math.min(dy * 0.5, 90));
    };
    const onTouchEnd = () => {
      if (pull > 70 && !refreshing) {
        setRefreshing(true);
        setPull(60);
        setTimeout(() => window.location.reload(), 400);
        return;
      }
      setPull(0);
      startY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing]);

  return (
    <>
      {pull > 0 && (
        <div
          className="fixed top-0 inset-x-0 z-[70] grid place-items-center pointer-events-none"
          style={{ height: pull }}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 border-camera-yellow border-t-transparent ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{ transform: `rotate(${pull * 4}deg)` }}
          />
        </div>
      )}
      <div style={{ transform: `translateY(${pull}px)`, transition: pull === 0 ? "transform 200ms" : "none" }}>
        {children}
      </div>
    </>
  );
};
