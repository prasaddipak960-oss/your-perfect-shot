export type FilterId =
  | "original"
  | "warm"
  | "pink"
  | "mono"
  | "forest"
  | "gold"
  | "cool"
  | "vintage"
  | "noir";

export type FilterDef = {
  id: FilterId;
  label: string;
  css: string; // CSS filter string
};

export const FILTERS: FilterDef[] = [
  { id: "original", label: "Original", css: "none" },
  { id: "warm", label: "Warm", css: "saturate(1.25) contrast(1.05) sepia(0.15) hue-rotate(-8deg)" },
  { id: "pink", label: "Blush", css: "saturate(1.3) contrast(1.05) hue-rotate(310deg) brightness(1.05)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.15)" },
  { id: "forest", label: "Forest", css: "saturate(1.4) contrast(1.1) hue-rotate(70deg) brightness(0.95)" },
  { id: "gold", label: "Gold", css: "sepia(0.4) saturate(1.3) contrast(1.05) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(180deg) contrast(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.55) contrast(1.1) brightness(0.95) saturate(0.9)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.9)" },
];

export const filterById = (id: FilterId) => FILTERS.find((f) => f.id === id) ?? FILTERS[0];
