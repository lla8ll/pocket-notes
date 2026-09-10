import type { Ref } from 'react';
import { ClassicButton, ClassicNavigationBar, Icon } from '../components/ClassicControls';
import { formatNoteDate, getTitle, remainingLabel } from '../utils/notes';
import type { Note } from '../utils/notes';

export function NoteEditor({ note, editorRef, headingRef, editing, onEditing, onChange, onBack, onDone, onCreate,
  onDelete, onRecover, onPin, onShare, sharing, feedback, blocked, now, count, position }: {
  note: Note | null; editorRef: Ref<HTMLTextAreaElement>; headingRef: Ref<HTMLHeadingElement>;
  editing: boolean; onEditing: (editing: boolean) => void; onChange: (id: string, content: string) => void;
  onBack: () => void; onDone: () => void; onCreate: () => void; onDelete: () => void;
  onRecover: () => void; onPin: () => void; onShare: () => void;
  sharing: boolean; feedback: string; blocked: boolean; now: number; count: number; position: number;
}) {
  const removed = note?.deletedAt != null;
  const readOnly = removed || blocked;
  return <>
    <ClassicNavigationBar title={note ? getTitle(note.content) : 'New Note'} headingRef={headingRef}
      left={<ClassicButton back onClick={onBack} aria-label={removed ? 'Back to Recently Deleted' : 'Back to notes'}>
        {removed ? 'Deleted' : 'Notes'}
      </ClassicButton>}
      right={removed ? <ClassicButton onClick={onRecover} disabled={blocked}>Recover</ClassicButton> :
        editing ? <ClassicButton onClick={onDone}>Done</ClassicButton> :
          <ClassicButton aria-label="New note" title="New note" onClick={onCreate} disabled={blocked}><Icon name="plus" /></ClassicButton>}
    />
    <div className="notepad-binding" aria-hidden="true" />
    <div className="editor-paper paper">
      <div className="note-date">
        <span className="copy-feedback" role="status">{feedback}</span>
        {removed ? <span>Read Only</span> : <time dateTime={note?.updatedAt}>{note ? formatNoteDate(note.updatedAt) : '\u00a0'}</time>}
      </div>
      <textarea ref={editorRef} className="note-input" aria-label={removed ? 'Deleted note text' : 'Note text'} dir="auto"
        value={note?.content ?? ''} readOnly={readOnly} spellCheck={!readOnly} autoCapitalize="sentences" autoCorrect="on"
        onChange={(event) => { if (note && !readOnly) onChange(note.id, event.target.value); }}
        onFocus={() => { if (!readOnly) onEditing(true); }}
      />
    </div>
    <footer className="toolbar">
      <button type="button" className="toolbar-button" aria-label={removed ? 'Delete Permanently' : 'Delete note'}
        title={removed ? 'Delete Permanently' : 'Delete note'} onClick={onDelete} disabled={blocked || !note}>
        <Icon name="trash" />
      </button>
      {!removed && <button type="button" className="toolbar-button" aria-label={note?.isPinned ? 'Unpin Note' : 'Pin Note'}
        title={note?.isPinned ? 'Unpin Note' : 'Pin Note'} aria-pressed={note?.isPinned ?? false} onClick={onPin} disabled={blocked || !note}>
        <Icon name="pin" />
      </button>}
      <span>{removed && note ? remainingLabel(note, now) : position + ' of ' + count}</span>
      {!removed && <button type="button" className="toolbar-button" aria-label="Share Note" title="Share Note" onClick={onShare}
        disabled={sharing || !note} aria-busy={sharing}>
        <Icon name="share" />
      </button>}
      {!removed ? <button type="button" className="toolbar-button" aria-label="Compose a new note" title="New note"
        onClick={onCreate} disabled={blocked}><Icon name="compose" /></button> : <span className="toolbar-spacer" aria-hidden="true" />}
    </footer>
  </>;
}
