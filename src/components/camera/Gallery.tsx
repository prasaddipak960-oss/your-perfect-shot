import { useEffect, useState } from "react";
import { GalleryItem, loadGallery, removeItem } from "./gallery";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const Gallery = ({ open, onClose }: Props) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [active, setActive] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const refresh = () => setItems(loadGallery());
    refresh();
    window.addEventListener("gallery-updated", refresh);
    return () => window.removeEventListener("gallery-updated", refresh);
  }, []);

  const download = (it: GalleryItem) => {
    const a = document.createElement("a");
    a.href = it.dataUrl;
    a.download = `${it.type}-${it.id}.${it.type === "photo" ? "jpg" : "webm"}`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-black border-white/10 text-foreground p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-medium">Gallery</h2>
          <button onClick={onClose} className="text-foreground/70 hover:text-foreground" aria-label="Close gallery">
            <X className="w-5 h-5" />
          </button>
        </div>

        {active ? (
          <div className="p-4 space-y-3">
            {active.type === "photo" ? (
              <img src={active.dataUrl} alt="capture" className="max-h-[60vh] mx-auto rounded" />
            ) : (
              <video src={active.dataUrl} controls className="max-h-[60vh] mx-auto rounded" />
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => download(active)}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  removeItem(active.id);
                  setActive(null);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
              <Button variant="outline" onClick={() => setActive(null)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No captures yet. Tap the shutter to start.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {items.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setActive(it)}
                    className="relative aspect-square overflow-hidden rounded-md bg-camera-chip ring-1 ring-white/10 hover:ring-camera-yellow transition"
                  >
                    {it.type === "photo" ? (
                      <img src={it.dataUrl} alt="thumb" className="w-full h-full object-cover" />
                    ) : (
                      <video src={it.dataUrl} className="w-full h-full object-cover" />
                    )}
                    {it.type === "video" && (
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 px-1.5 py-0.5 rounded">VIDEO</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
