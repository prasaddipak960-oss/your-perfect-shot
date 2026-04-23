const KEY = "camera_gallery_v1";

export type GalleryItem = {
  id: string;
  type: "photo" | "video";
  dataUrl: string;
  createdAt: number;
  filter?: string;
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
  const trimmed = all.slice(0, 30);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    localStorage.setItem(KEY, JSON.stringify(trimmed.slice(0, 10)));
  }
  window.dispatchEvent(new Event("gallery-updated"));
};

export const updateItem = (id: string, patch: Partial<GalleryItem>) => {
  const all = loadGallery().map((i) => (i.id === id ? { ...i, ...patch } : i));
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("gallery-updated"));
};

export const removeItem = (id: string) => {
  const all = loadGallery().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("gallery-updated"));
};
