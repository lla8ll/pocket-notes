import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CopyNoteSheet } from './components/CopyNoteSheet';
import { DeleteConfirmation } from './components/DeleteConfirmation';
import { useNotes } from './hooks/useNotes';
import { NoteEditor } from './screens/NoteEditor';
import { NotesList } from './screens/NotesList';
import { RecentlyDeleted } from './screens/RecentlyDeleted';
import { activeNotes } from './utils/notes';
import type { Note } from './utils/notes';
import { shareNote } from './utils/sharing';

type ListScreen = 'list' | 'deleted';

export default function App() {
  const { notes, active, deleted, now, createNote, updateNote, deleteNote, recoverNote,
    permanentlyDeleteNote, togglePin, storageError, storageBlocked, retrySave } = useNotes();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [screen, setScreen] = useState<ListScreen | 'editor'>('list');
  const [editorSource, setEditorSource] = useState<ListScreen>('list');
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [confirmation, setConfirmation] = useState<'move' | 'permanent' | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const shareRequest = useRef(0);
  const editor = useRef<HTMLTextAreaElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const deletedHeading = useRef<HTMLHeadingElement>(null);
  const activeNote = notes.find((note) => note.id === activeId) ?? null;
  const results = useMemo(() => activeNotes(active, query), [active, query]);
  const editorNotes = activeNote?.deletedAt != null ? deleted : active;

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      if (viewport && viewport.scale === 1) {
        document.documentElement.style.setProperty('--viewport-height', viewport.height + 'px');
        document.documentElement.style.setProperty('--viewport-top', viewport.offsetTop + 'px');
      }
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 2200);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (screen !== 'editor' || activeNote) return;
    setScreen(editorSource);
    setEditing(false);
    setConfirmation(null);
    setCopyOpen(false);
    shareRequest.current += 1;
    setSharing(false);
    const frame = requestAnimationFrame(() => {
      (editorSource === 'deleted' ? deletedHeading : listHeading).current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [screen, activeNote, editorSource]);

  function resetSharing() {
    shareRequest.current += 1;
    setSharing(false);
    setCopyOpen(false);
    setFeedback('');
  }

  function newNote() {
    let created: Note | null = null;
    // Keep focus inside the initiating tap so mobile keyboards can open.
    flushSync(() => {
      created = createNote();
      if (created) {
        resetSharing();
        setActiveId(created.id);
        setEditorSource('list');
        setScreen('editor');
        setEditing(true);
        setQuery('');
      }
    });
    if (created) {
      editor.current?.focus({ preventScroll: true });
      editor.current?.setSelectionRange(0, 0);
      if (editor.current) editor.current.scrollTop = 0;
    }
  }

  function openNote(note: Note) {
    flushSync(() => {
      resetSharing();
      setActiveId(note.id);
      setEditorSource(note.deletedAt !== null ? 'deleted' : 'list');
      setScreen('editor');
      setEditing(false);
    });
    if (editor.current) editor.current.scrollTop = 0;
    editorHeading.current?.focus({ preventScroll: true });
  }

  function showList(target: ListScreen = 'list') {
    editor.current?.blur();
    flushSync(() => { resetSharing(); setScreen(target); setEditing(false); });
    (target === 'deleted' ? deletedHeading : listHeading).current?.focus({ preventScroll: true });
  }

  function finishEditing() {
    editor.current?.blur();
    setEditing(false);
    editorHeading.current?.focus({ preventScroll: true });
  }

  function removeNote() {
    if (!activeNote || storageBlocked) return;
    const id = activeNote.id;
    const permanent = confirmation === 'permanent';
    setConfirmation(null);
    showList(permanent ? 'deleted' : 'list');
    if (permanent) permanentlyDeleteNote(id);
    else deleteNote(id);
  }

  function recover() {
    if (!activeNote || storageBlocked) return;
    const id = activeNote.id;
    setQuery('');
    showList('list');
    recoverNote(id);
  }

  async function share() {
    if (!activeNote || activeNote.deletedAt !== null || sharing) return;
    const request = ++shareRequest.current;
    setSharing(true);
    const result = await shareNote(activeNote.content, navigator);
    if (shareRequest.current !== request) return;
    setSharing(false);
    if (result === 'copy') setCopyOpen(true);
  }

  return <div className="desktop-surface">
    <main className="notes-app" aria-label="Pocket Notes"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !confirmation && !copyOpen) {
          if (screen === 'editor') { event.preventDefault(); showList(editorSource); }
          else if (screen === 'deleted') { event.preventDefault(); showList(); }
        }
      }}>
      {storageError && <div className="storage-warning" role="alert">
        <span>{storageError}</span>
        <button type="button" onClick={retrySave}>Retry</button>
      </div>}
      <div className={'screen-stack screen-stack--' + screen + ' editor-source--' + editorSource}>
        <section className="screen screen--list" aria-label="Notes list" aria-hidden={screen !== 'list'} inert={screen !== 'list'}>
          <NotesList notes={results} total={active.length} deletedCount={deleted.length} query={query} onQueryChange={setQuery}
            onCreate={newNote} onOpen={openNote} onDeleted={() => showList('deleted')} blocked={storageBlocked} headingRef={listHeading} />
        </section>
        <section className="screen screen--deleted" aria-label="Recently Deleted" aria-hidden={screen !== 'deleted'} inert={screen !== 'deleted'}>
          <RecentlyDeleted notes={deleted} now={now} onBack={() => showList()} onOpen={openNote} headingRef={deletedHeading} />
        </section>
        <section className="screen screen--editor" aria-label="Note editor" aria-hidden={screen !== 'editor'} inert={screen !== 'editor'}>
          <NoteEditor note={activeNote} editorRef={editor} headingRef={editorHeading} editing={editing}
            onEditing={setEditing} onChange={updateNote} onBack={() => showList(editorSource)} onDone={finishEditing}
            onCreate={newNote} onDelete={() => { editor.current?.blur(); setConfirmation(activeNote?.deletedAt != null ? 'permanent' : 'move'); }}
            onRecover={recover} onPin={() => { if (activeNote) togglePin(activeNote.id); }} onShare={() => { void share(); }}
            sharing={sharing} feedback={feedback} blocked={storageBlocked} now={now}
            count={editorNotes.length} position={editorNotes.findIndex((note) => note.id === activeId) + 1} />
        </section>
      </div>
      <DeleteConfirmation open={confirmation !== null} permanent={confirmation === 'permanent'}
        onCancel={() => setConfirmation(null)} onDelete={removeNote} />
      <CopyNoteSheet open={copyOpen} content={activeNote?.content ?? ''} onCancel={() => setCopyOpen(false)}
        onCopied={() => { setCopyOpen(false); setFeedback('Copied'); }} />
    </main>
  </div>;
}
