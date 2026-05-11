import { Link } from "react-router-dom";
import { ReactNode } from "react";

export const LegalLayout = ({ title, children }: { title: string; children: ReactNode }) => (
  <main className="min-h-[100dvh] bg-background text-foreground px-5 py-6 max-w-2xl mx-auto">
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6">
      ← Back to app
    </Link>
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <div className="prose prose-invert text-sm text-foreground/80 leading-relaxed space-y-3">{children}</div>
    <footer className="mt-10 pt-6 border-t border-white/10 text-xs text-foreground/50 flex flex-wrap gap-x-4 gap-y-2">
      <Link to="/about">About</Link>
      <Link to="/contact">Contact</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/terms">Terms</Link>
      <span className="ml-auto">© 2026 Your Perfect Shot</span>
    </footer>
  </main>
);
