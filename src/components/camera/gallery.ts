const KEY = "camera_gallery_v1";

export type GalleryItem = {
  id: string;
  type: "photo" | "video";
  dataUrl: string;
  createdAt: number;
};

export const loadGallery = (): GalleryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveItem = (item: GalleryItem) => {
  const all = loadGallery();
  all.unshift(item);
  // Keep last 30 to avoid quota issues
  const trimmed = all.slice(0, 30);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // quota — drop oldest aggressively
    localStorage.setItem(KEY, JSON.stringify(trimmed.slice(0, 10)));
  }
  window.dispatchEvent(new Event("gallery-updated"));
};

export const removeItem = (id: string) => {
  const all = loadGallery().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("gallery-updated"));
};
