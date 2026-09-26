import { useEffect, useRef } from 'react';
import type { SyncStatus } from '../cloud/useCloudSync';

const STATUS_TEXT: Record<SyncStatus, string> = {
  offline: 'Offline — changes sync when you reconnect.',
  idle: 'All notes are synced.',
  syncing: 'Syncing…',
  error: 'Sync failed — will retry automatically.',
};

export function AccountSheet({ open, email, online, status, onClose, onSignOut, onSignIn }: {
  open: boolean; email: string | null; online: boolean; status: SyncStatus;
  onClose: () => void; onSignOut: () => void; onSignIn: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);

  return <dialog ref={dialog} className="classic-action-sheet" aria-labelledby="account-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={(event) => event.stopPropagation()}>
    <h2 id="account-title">Account</h2>
    {email ? <>
      <p className="account-email">{email}</p>
      <p className="account-status">{online ? STATUS_TEXT[status] : STATUS_TEXT.offline}</p>
      <button type="button" autoFocus className="sheet-action" onClick={onSignOut}>Sign Out</button>
    </> : <>
      <p className="account-status">You're using Pocket Notes offline on this device.</p>
      <button type="button" autoFocus className="sheet-action" onClick={onSignIn}>Sign In to Sync</button>
    </>}
    <button type="button" className="sheet-action sheet-action--cancel" onClick={onClose}>Close</button>
  </dialog>;
}
