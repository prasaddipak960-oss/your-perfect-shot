import { CameraApp } from "@/components/camera/CameraApp";
import { SplashScreen } from "@/components/native/SplashScreen";
import { ExitDialog } from "@/components/native/ExitDialog";
import { OfflineBanner } from "@/components/native/OfflineBanner";
import { hideNativeSplash } from "@/components/native/nativeBridge";
import { useEffect, useState } from "react";

const Index = () => {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    document.title = "Your Perfect Shot — HD Pro Camera";
    const desc =
      "HD Pro camera app with Beauty, Night, Time-Lapse, Video, gorgeous filters and a stylish editor. Works fully offline.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    // Hide the native (Capacitor) splash as soon as React mounts so our
    // in-app splash takes over smoothly.
    hideNativeSplash();
  }, []);

  return (
    <main className="min-h-[100dvh] bg-background">
      <h1 className="sr-only">Your Perfect Shot — HD Pro Camera</h1>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <CameraApp />
      <ExitDialog />
      <OfflineBanner />
    </main>
  );
};

export default Index;
