/**
 * Full-screen "no internet" page. Visibility is controlled by the parent —
 * mount it only when you want to block an online-only action.
 */
export const NoInternetPage = ({ onRetry, onClose }: { onRetry?: () => void; onClose?: () => void }) => {

  return (
    <div className="fixed inset-0 z-[90] bg-background grid place-items-center px-6 text-center">
      <div className="max-w-xs">
        <div className="w-20 h-20 mx-auto rounded-full bg-white/5 grid place-items-center mb-5">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-foreground/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">No internet connection</h2>
        <p className="text-sm text-foreground/60 mt-2">
          The camera and gallery still work offline. Reconnect to use Share & Rate features.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => onRetry?.()}
            className="px-4 py-2 rounded-full bg-camera-yellow text-black text-sm font-semibold"
          >
            Retry
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/10 text-foreground text-sm"
            >
              Continue offline
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
