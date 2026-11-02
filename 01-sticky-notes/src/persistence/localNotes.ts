import { isNote, type Note } from '../model/note.ts';

const STORAGE_KEY = 'sticky-notes-v2';

export function loadNotes(storage?: Pick<Storage, 'getItem'>): Note[] {
  try {
    const items: unknown = JSON.parse((storage ?? window.localStorage).getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    return items.filter((item): item is Note => {
      if (!isNote(item) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch {
    return []; // Bad stored data or blocked storage should not prevent the board from loading.
  }
}

export function saveNotes(notes: readonly Note[], storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false; // The current session is still usable if storage is unavailable or full.
  }
}
