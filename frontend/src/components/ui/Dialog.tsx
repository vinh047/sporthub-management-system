import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}

export default function Dialog({
  open,
  title,
  description,
  onOpenChange,
  children,
  className = '',
  closeLabel = 'Đóng hộp thoại',
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChangeRef.current(false);
      }}
      onClose={() => onOpenChangeRef.current(false)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChangeRef.current(false);
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-dialog border border-border bg-surface-raised p-0 text-foreground shadow-design-lg backdrop:bg-slate-950/50 ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
        <div>
          <h2 id={titleId} className="text-lg font-semibold leading-tight">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onOpenChangeRef.current(false)}
          aria-label={closeLabel}
          className="rounded-control p-1.5 text-muted hover:bg-surface hover:text-foreground"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
