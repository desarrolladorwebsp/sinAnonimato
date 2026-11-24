import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

export function CalendarDialog({ dayLabel, busy, onClose, children }: {
  dayLabel: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return <dialog ref={dialogRef} className="authorization-calendar-dialog" aria-labelledby="calendar-dialog-title" aria-describedby="calendar-dialog-date" onCancel={event => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <div className="authorization-calendar-dialog-header">
      <div><h2 id="calendar-dialog-title">Agregar al calendario</h2><p id="calendar-dialog-date">{dayLabel}</p></div>
      <button className="authorization-calendar-dialog-close" type="button" aria-label="Cerrar modal" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </div>
    {children}
  </dialog>;
}
