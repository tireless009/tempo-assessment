import { useEffect } from 'react';
import type { Note } from '../model/note';

/** How long a deleted note can be restored. */
export const UNDO_WINDOW_MS = 8000;

interface UndoToastProps {
  readonly deletedNote: Note | null;
  readonly onUndo: () => void;
  readonly onExpire: () => void;
}

export function UndoToast({ deletedNote, onUndo, onExpire }: UndoToastProps) {
  useEffect(() => {
    if (!deletedNote) return;
    // Keyed on the note, so deleting another note restarts the countdown.
    const timer = setTimeout(onExpire, UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [deletedNote, onExpire]);

  // The live region stays mounted so screen readers announce content as it appears.
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {deletedNote && (
        <div className="toast">
          <span>Note deleted</span>
          <button type="button" className="toast__undo" onClick={onUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
