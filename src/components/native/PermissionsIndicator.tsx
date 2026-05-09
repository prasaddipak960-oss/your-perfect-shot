import { useState } from "react";
import { allGranted, anyBlocked, usePermissions } from "./usePermissions";
import { PermissionsDialog } from "./PermissionsDialog";

/**
 * Tiny persistent pill on the camera top bar showing permission status.
 * Tap to open the permissions dialog (Retry / Open Settings).
 */
export const PermissionsIndicator = () => {
  const [open, setOpen] = useState(false);
  const { status } = usePermissions();
  const ok = allGranted(status);
  const bad = anyBlocked(status);

  const tone = ok
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
    : bad
    ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
    : "bg-amber-500/15 text-amber-300 border-amber-400/30";

  const label = ok ? "Granted" : bad ? "Blocked" : "Pending";
  const icon = ok ? "✓" : bad ? "!" : "•";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tone}`}
        aria-label={`Permissions ${label}`}
      >
        {icon} Perms: {label}
      </button>
      <PermissionsDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
