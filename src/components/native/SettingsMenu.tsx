import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { openRateUs, shareApp } from "./nativeBridge";
import { PermissionsDialog } from "./PermissionsDialog";
import { toast } from "sonner";

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

type InfoKey = "about" | "privacy" | "contact" | null;

export const SettingsMenu = () => {
  const [info, setInfo] = useState<InfoKey>(null);

  const handleShare = async () => {
    const res = await shareApp();
    if (res === "copied") toast.success("Store link copied to clipboard");
    else if (!res) toast.error("Couldn't share — try again");
  };

  const items: { key: string; label: string; icon: string; onClick: () => void }[] = [
    { key: "share", label: "Share App", icon: "📤", onClick: handleShare },
    { key: "rate", label: "Rate this App", icon: "⭐", onClick: openRateUs },
    { key: "about", label: "About", icon: "ℹ️", onClick: () => setInfo("about") },
    { key: "privacy", label: "Privacy Policy", icon: "🔒", onClick: () => setInfo("privacy") },
    { key: "contact", label: "Contact", icon: "✉️", onClick: () => setInfo("contact") },
  ];

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <button
            aria-label="Menu"
            className="w-9 h-9 grid place-items-center rounded-full bg-camera-chip text-foreground/85"
          >
            <MenuIcon />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-background border-r border-white/10 text-foreground w-72 p-0">
          <SheetHeader className="px-5 pt-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-camera-yellow to-amber-500 grid place-items-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-black" fill="currentColor">
                  <path d="M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                </svg>
              </div>
              <div>
                <SheetTitle className="text-foreground text-base">Your Perfect Shot</SheetTitle>
                <p className="text-[11px] text-foreground/50">v1.0 · Offline mode</p>
              </div>
            </div>
          </SheetHeader>
          <nav className="p-3 space-y-1">
            {items.map((it) => (
              <button
                key={it.key}
                onClick={it.onClick}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm hover:bg-white/5 transition"
              >
                <span className="text-lg w-6 text-center">{it.icon}</span>
                <span className="text-foreground/90">{it.label}</span>
              </button>
            ))}
          </nav>
          <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-foreground/40">
            © 2026 Your Perfect Shot
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!info} onOpenChange={(o) => !o && setInfo(null)}>
        <DialogContent className="bg-background border-white/10 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {info === "about" && "About"}
              {info === "privacy" && "Privacy Policy"}
              {info === "contact" && "Contact"}
            </DialogTitle>
            <DialogDescription className="text-foreground/70 text-sm pt-2 leading-relaxed">
              {info === "about" &&
                "Your Perfect Shot is an HD camera app with Pro, Beauty, Night, Time-Lapse, Video and a stylish editor. All photos and videos are saved locally on your device — no cloud, no account needed."}
              {info === "privacy" && (
                <span className="block space-y-2">
                  <span className="block">Your Perfect Shot respects your privacy. We do <strong>not</strong> collect, upload or share any of your photos, videos, or personal data.</span>
                  <span className="block"><strong>Camera & Microphone:</strong> Used only on your device to capture photos and videos. Nothing leaves the device.</span>
                  <span className="block"><strong>Storage:</strong> Captures are saved to your device's local gallery / app storage only.</span>
                  <span className="block"><strong>Notifications:</strong> Optional. Used only to inform you about app updates and tips.</span>
                  <span className="block"><strong>Network:</strong> The app works fully offline. Internet is only used for the optional "Share" feature.</span>
                  <span className="block">Contact: support@yourperfectshot.app</span>
                </span>
              )}
              {info === "contact" &&
                "Need help or want to report an issue? Email us at support@yourperfectshot.app — we usually reply within 24 hours."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
