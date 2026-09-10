import { Icon } from './ClassicControls';
import { formatListDate, getPreview, getTitle, remainingLabel } from '../utils/notes';
import type { Note } from '../utils/notes';

export function NoteListItem({ note, onOpen, now }: { note: Note; onOpen: (note: Note) => void; now?: number }) {
  const title = getTitle(note.content);
  const removed = note.deletedAt !== null;
  const pinned = !removed && note.isPinned;
  const subtitle = removed ? remainingLabel(note, now) : getPreview(note.content);
  return <li>
    <button type="button" className="note-row" onClick={() => onOpen(note)}
      aria-label={`${pinned ? 'Pinned note' : 'Open note'}: ${title}`}>
      <span className="note-row__copy">
        <span className="note-row__heading">
          {pinned && <span className="pin-indicator" title="Pinned"><Icon name="pin" /></span>}
          <span className="note-row__title" dir="auto">{title}</span>
        </span>
        {subtitle && <span className={`note-row__preview ${removed ? 'note-row__remaining' : ''}`} dir={removed ? 'ltr' : 'auto'}>{subtitle}</span>}
      </span>
      {!removed && <time dateTime={note.updatedAt}>{formatListDate(note.updatedAt)}</time>}
      <Icon name="chevron" />
    </button>
  </li>;
}
