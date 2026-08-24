"use client";

import { Icon } from "@/components/Icon";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", busy = false, danger = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="pmp-dialogBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className="pmp-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pmp-dialog-title" aria-describedby="pmp-dialog-description">
        <div className="pmp-dialogIcon"><Icon name={danger ? "warning" : "shield"} size={23} /></div>
        <h2 id="pmp-dialog-title">{title}</h2>
        <p id="pmp-dialog-description">{description}</p>
        <div className="pmp-dialogActions">
          <button className="pmp-ctaSecondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={danger ? "pmp-dangerAction" : "pmp-ctaPrimary"} type="button" onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
