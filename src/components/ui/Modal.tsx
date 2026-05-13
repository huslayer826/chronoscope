import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${widthClassName} mx-4 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/70`}
      >
        <div className="flex items-start justify-between border-b border-zinc-900 p-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-900 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
