import { CameraApp } from "@/components/camera/CameraApp";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Camera — Capture Photos & Videos";
    const desc = "Browser camera app with Photo, Video, Portrait, Document and Pro modes, zoom, flash, filters and a local gallery.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-background">
      <h1 className="sr-only">Camera App</h1>
      <CameraApp />
    </main>
  );
};

export default Index;
