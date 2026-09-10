import { useEffect, useRef } from 'react';

export function DeleteConfirmation({ open, permanent, onCancel, onDelete }: {
  open: boolean; permanent: boolean; onCancel: () => void; onDelete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);

  return <dialog ref={dialog} className="classic-alert" aria-labelledby="delete-title" aria-describedby="delete-message"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    onKeyDown={(event) => event.stopPropagation()}>
    <h2 id="delete-title">{permanent ? 'Delete Permanently?' : 'Delete Note?'}</h2>
    <p id="delete-message">{permanent ? 'This note will be permanently deleted. This cannot be undone.' :
      'This note will move to Recently Deleted. You can recover it for 30 days.'}</p>
    <div className="classic-alert__actions">
      <button type="button" autoFocus onClick={onCancel}>Cancel</button>
      <button type="button" className="classic-alert__delete" onClick={onDelete}
        aria-label={permanent ? 'Delete Permanently' : 'Move to Recently Deleted'}>{permanent ? 'Delete' : 'Delete Note'}</button>
    </div>
  </dialog>;
}
