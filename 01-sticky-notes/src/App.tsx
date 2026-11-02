import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Board } from './components/Board';
import { Toolbar } from './components/Toolbar';
import { UndoToast } from './components/UndoToast';
import { fitInside, type Rect } from './model/geometry';
import { createNoteId, DEFAULT_NOTE_SIZE, NOTE_COLORS, type NoteId } from './model/note';
import { notesReducer, type NotesState } from './model/notesReducer';
import { loadNotes, saveNotes } from './persistence/localNotes';

export function App() {
  const [state, dispatch] = useReducer(notesReducer, undefined, (): NotesState => ({
    notes: loadNotes(), recentlyDeleted: null,
  }));
  const [focused, setFocused] = useState<NoteId | null>(null);
  const [storageError, setStorageError] = useState(false);
  const boardRef = useRef<HTMLElement>(null);
  const notesRef = useRef(state.notes);
  notesRef.current = state.notes;

  // Save after edits settle, and flush any pending change on page exit.
  useEffect(() => {
    const timer = window.setTimeout(() => setStorageError(!saveNotes(state.notes)), 200);
    return () => window.clearTimeout(timer);
  }, [state.notes]);
  useEffect(() => {
    const flush = () => { saveNotes(notesRef.current); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const createNote = useCallback((rect: Rect) => {
    const id = createNoteId();
    const color = NOTE_COLORS[notesRef.current.length % NOTE_COLORS.length] ?? 'butter';
    dispatch({ type: 'created', id, rect, color });
    setFocused(id);
  }, []);

  const createFromToolbar = (requested?: Rect) => {
    const board = boardRef.current;
    if (!board) return;
    const bounds = { width: board.clientWidth, height: board.clientHeight };
    const offset = (state.notes.length % 8) * 24;
    const chosen = requested ?? {
      x: bounds.width / 2 - DEFAULT_NOTE_SIZE.width / 2 + offset,
      y: bounds.height / 2 - DEFAULT_NOTE_SIZE.height / 2 + offset,
      ...DEFAULT_NOTE_SIZE,
    };
    createNote(fitInside(chosen, bounds));
  };

  const undoDeletion = useCallback(() => dispatch({ type: 'deletionUndone' }), []);
  const expireUndo = useCallback(() => dispatch({ type: 'undoExpired' }), []);

  useEffect(() => {
    if (!state.recentlyDeleted) return;
    const onUndo = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable)) return;
      event.preventDefault();
      undoDeletion();
    };
    window.addEventListener('keydown', onUndo);
    return () => window.removeEventListener('keydown', onUndo);
  }, [state.recentlyDeleted, undoDeletion]);

  return (
    <div className="app">
      <Toolbar onAdd={createFromToolbar} storageError={storageError} />
      <Board boardRef={boardRef} notes={state.notes} focusNoteId={focused}
        dispatch={dispatch} onCreateNote={createNote} />
      <UndoToast deletedNote={state.recentlyDeleted}
        onUndo={undoDeletion}
        onExpire={expireUndo} />
      <p className="app__count">{state.notes.length} {state.notes.length === 1 ? 'note' : 'notes'} · {storageError ? 'changes not saved' : 'saved locally'}</p>
    </div>
  );
}
