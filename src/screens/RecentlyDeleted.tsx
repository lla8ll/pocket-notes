import type { Ref } from 'react';
import { ClassicButton, ClassicNavigationBar } from '../components/ClassicControls';
import { NoteListItem } from '../components/NoteListItem';
import type { Note } from '../utils/notes';

export function RecentlyDeleted({ notes, now, onBack, onOpen, headingRef }: {
  notes: Note[]; now: number; onBack: () => void; onOpen: (note: Note) => void; headingRef: Ref<HTMLHeadingElement>;
}) {
  return <>
    <ClassicNavigationBar title="Recently Deleted" headingRef={headingRef}
      left={<ClassicButton back onClick={onBack} aria-label="Back to notes">Notes</ClassicButton>} />
    <div className="notepad-binding" aria-hidden="true" />
    <div className="notes-list paper">
      <p className="retention-notice">Notes are kept here for 30 days.</p>
      {notes.length === 0 ? <div className="empty-notes">
        <p className="empty-notes__title">No Deleted Notes</p>
        <p>Deleted notes will appear here.</p>
      </div> : <ul aria-label="Recently deleted notes">
        {notes.map((note) => <NoteListItem key={note.id} note={note} now={now} onOpen={onOpen} />)}
      </ul>}
    </div>
    <footer className="toolbar toolbar--list"><span>{notes.length} {notes.length === 1 ? 'Note' : 'Notes'}</span></footer>
  </>;
}
