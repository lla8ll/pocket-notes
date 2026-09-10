import { useEffect, useRef, useState } from 'react';
import { copyNote } from '../utils/sharing';

export function CopyNoteSheet({ open, content, onCancel, onCopied }: {
  open: boolean; content: string; onCancel: () => void; onCopied: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  // A cancelled/reopened sheet must not receive an older clipboard result.
  useEffect(() => {
    requestVersion.current += 1;
    setManual(false);
    setBusy(false);
    return () => { requestVersion.current += 1; };
  }, [open, content]);
  useEffect(() => {
    if (open && !dialog.current?.open) {
      setManual(false);
      setBusy(false);
      dialog.current?.showModal();
    }
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (open && manual) { text.current?.focus(); text.current?.select(); }
  }, [open, manual]);

  async function copy() {
    if (manual) { text.current?.focus(); text.current?.select(); return; }
    const request = ++requestVersion.current;
    setBusy(true);
    const result = await copyNote(content, navigator);
    if (request !== requestVersion.current || !dialog.current?.open) return;
    setBusy(false);
    if (result === 'copied') onCopied();
    else setManual(true);
  }

  return <dialog ref={dialog} className="classic-action-sheet" aria-labelledby="copy-title" aria-describedby="copy-description"
    onCancel={(event) => { event.preventDefault(); onCancel(); }} onKeyDown={(event) => event.stopPropagation()}>
    <h2 id="copy-title">Copy Note</h2>
    <p id="copy-description">{manual ? 'Select the note below, then choose Copy.' : 'Copy the complete note to your clipboard.'}</p>
    {manual && <textarea ref={text} readOnly value={content} dir="auto" aria-label="Note to copy" className="manual-copy-text" />}
    <button type="button" autoFocus className="sheet-action" onClick={() => { void copy(); }} disabled={busy}>
      {manual ? 'Select All' : 'Copy Note'}
    </button>
    <button type="button" className="sheet-action sheet-action--cancel" onClick={onCancel}>Cancel</button>
  </dialog>;
}
