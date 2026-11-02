import { rectsEqual, type Rect } from './geometry.ts';
import type { Note, NoteColor, NoteId } from './note.ts';

export interface NotesState {
  readonly notes: readonly Note[];
  readonly recentlyDeleted: Note | null;
}

export type NotesAction =
  | { readonly type: 'created'; readonly id: NoteId; readonly rect: Rect; readonly color: NoteColor }
  | { readonly type: 'rectChanged'; readonly id: NoteId; readonly rect: Rect }
  | { readonly type: 'textChanged'; readonly id: NoteId; readonly text: string }
  | { readonly type: 'colorChanged'; readonly id: NoteId; readonly color: NoteColor }
  | { readonly type: 'broughtToFront'; readonly id: NoteId }
  | { readonly type: 'deleted'; readonly id: NoteId }
  | { readonly type: 'deletionUndone' }
  | { readonly type: 'undoExpired' };

function updateNote(state: NotesState, id: NoteId, update: (note: Note) => Note): NotesState {
  let changed = false;
  const notes = state.notes.map((note) => {
    if (note.id !== id) return note;
    const next = update(note);
    changed ||= next !== note;
    return next;
  });
  return changed ? { ...state, notes } : state;
}

export function notesReducer(state: NotesState, action: NotesAction): NotesState {
  switch (action.type) {
    case 'created': {
      const z = state.notes.reduce((max, note) => Math.max(max, note.z), 0) + 1;
      const note: Note = { id: action.id, ...action.rect, text: '', color: action.color, z };
      return { ...state, notes: [...state.notes, note] };
    }
    case 'rectChanged': {
      const { x, y, width, height } = action.rect;
      return updateNote(state, action.id, (note) =>
        rectsEqual(note, action.rect) ? note : { ...note, x, y, width, height },
      );
    }
    case 'textChanged':
      return updateNote(state, action.id, (note) => note.text === action.text ? note : { ...note, text: action.text });
    case 'colorChanged':
      return updateNote(state, action.id, (note) => note.color === action.color ? note : { ...note, color: action.color });
    case 'broughtToFront': {
      const top = state.notes.reduce((max, note) => Math.max(max, note.z), 0);
      const selected = state.notes.find((note) => note.id === action.id);
      if (!selected || selected.z === top && state.notes.filter((note) => note.z === top).length === 1) return state;
      return updateNote(state, action.id, (note) => ({ ...note, z: top + 1 }));
    }
    case 'deleted': {
      const deleted = state.notes.find((note) => note.id === action.id);
      return deleted
        ? { notes: state.notes.filter((note) => note.id !== action.id), recentlyDeleted: deleted }
        : state;
    }
    case 'deletionUndone': {
      const deleted = state.recentlyDeleted;
      if (!deleted) return state;
      return {
        ...state,
        notes: state.notes.some((note) => note.id === deleted.id) ? state.notes : [...state.notes, deleted],
        recentlyDeleted: null,
      };
    }
    case 'undoExpired':
      return state.recentlyDeleted ? { ...state, recentlyDeleted: null } : state;
  }
}
