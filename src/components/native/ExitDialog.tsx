import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { exitApp, isNative, onBackButton } from "./nativeBridge";

/**
 * Listens to Android hardware back-button. On the camera home route shows an
 * "Exit app?" confirmation. On web this is a no-op.
 */
export const ExitDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    const cleanup = onBackButton(() => {
      setOpen(true);
    });
    return cleanup;
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="bg-background border-white/10 text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Exit app?</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/70">
            Are you sure you want to close Your Perfect Shot?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-camera-chip border-0 text-foreground hover:bg-white/10">No</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => exitApp()}
            className="bg-camera-yellow text-black hover:bg-camera-yellow/90"
          >
            Yes, Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
