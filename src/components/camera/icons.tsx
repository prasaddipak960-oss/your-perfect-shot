import { SVGProps } from "react";

const base = "w-6 h-6";

export const FlashOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

export const NoFlashRunIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <circle cx="13" cy="4" r="1.6" />
    <path d="M5 21l3-6 3 2 3-4 4 3" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

export const ScanIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M21 7V5a2 2 0 0 0-2-2h-2M3 17v2a2 2 0 0 0 2 2h2M21 17v2a2 2 0 0 1-2 2h-2" />
    <circle cx="12" cy="12" r="3.5" />
  </svg>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const LocationOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
);

export const MoonIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const ExposureIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="6" x2="12" y2="18" />
    <line x1="6" y1="12" x2="18" y2="12" />
  </svg>
);

export const SparkleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export const FlipIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={base} {...p}>
    <path d="M17 3l4 4-4 4" />
    <path d="M21 7H9a4 4 0 0 0-4 4v1" />
    <path d="M7 21l-4-4 4-4" />
    <path d="M3 17h12a4 4 0 0 0 4-4v-1" />
  </svg>
);
