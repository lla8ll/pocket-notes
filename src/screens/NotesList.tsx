import { useRef } from 'react';
import type { Ref } from 'react';
import { ClassicButton, ClassicNavigationBar, Icon } from '../components/ClassicControls';
import { NoteListItem } from '../components/NoteListItem';
import type { Note } from '../utils/notes';

export function NotesList({ notes, total, deletedCount, query, onQueryChange, onCreate, onOpen, onDeleted, blocked, headingRef }: {
  notes: Note[]; total: number; deletedCount: number; query: string; onQueryChange: (query: string) => void;
  onCreate: () => void; onOpen: (note: Note) => void; onDeleted: () => void; blocked: boolean;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const search = useRef<HTMLInputElement>(null);
  const searching = query.trim().length > 0;
  return <>
    <ClassicNavigationBar title="Pocket Notes" headingRef={headingRef} left={
      <img className="app-brand-icon" src={import.meta.env.BASE_URL + 'icons/icon-192.png'} alt="" width="40" height="40" />
    } right={
      <ClassicButton aria-label="New note" title="New note" onClick={onCreate} disabled={blocked}>
        <Icon name="plus" />
      </ClassicButton>
    } />
    <div className="notepad-binding" aria-hidden="true" />
    <div className="classic-search" role="search">
      <Icon name="search" />
      <input ref={search} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search" aria-label="Search notes" autoComplete="off" autoCapitalize="none" spellCheck={false}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); onQueryChange(''); }
        }} />
      {query && <button type="button" aria-label="Clear search" onClick={() => { onQueryChange(''); search.current?.focus(); }}>
        <Icon name="close" />
      </button>}
    </div>
    <div className="notes-list paper">
      {notes.length === 0 ? <div className="empty-notes">
        <p className="empty-notes__title">{searching ? 'No Notes Found' : 'No Notes'}</p>
        <p>{searching ? 'Try another word.' : <>Tap <span aria-label="plus">+</span> to write a note.</>}</p>
      </div> : <ul aria-label="Your notes">
        {notes.map((note) => <NoteListItem key={note.id} note={note} onOpen={onOpen} />)}
      </ul>}
    </div>
    <footer className="toolbar toolbar--notebook">
      <button type="button" className="toolbar-link" onClick={onDeleted} aria-label="Recently Deleted">
        <Icon name="trash" /><span>Recently Deleted{deletedCount > 0 ? ' (' + deletedCount + ')' : ''}</span>
      </button>
      <span role="status">{searching ? notes.length + ' found' : total + (total === 1 ? ' Note' : ' Notes')}</span>
    </footer>
  </>;
}
