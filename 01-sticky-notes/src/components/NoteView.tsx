import { memo, type Dispatch, type KeyboardEvent, type PointerEvent } from 'react';
import { fitInside, type Point, type Rect, type Size } from '../model/geometry';
import { COLOR_LABELS, NOTE_COLORS, type Note, type NoteId } from '../model/note';
import type { NotesAction } from '../model/notesReducer';

export type NoteDragState = 'resting' | 'moving' | 'resizing' | 'overTrash';
export type NoteGesture = 'move' | 'resize';

export type DragStartHandler = (id: NoteId, event: PointerEvent<HTMLElement>) => void;
export type NudgeHandler = (id: NoteId, gesture: NoteGesture, delta: Point) => void;

interface NoteViewProps {
  readonly note: Note;
  /** Geometry shown instead of the stored one while the note is being dragged; undefined otherwise. */
  readonly liveRect: Rect | undefined;
  /** Current board size; notes are drawn inside it without changing their stored position. */
  readonly bounds: Size | null;
  readonly dragState: NoteDragState;
  readonly autoFocus: boolean;
  readonly onMoveStart: DragStartHandler;
  readonly onResizeStart: DragStartHandler;
  readonly onNudge: NudgeHandler;
  readonly dispatch: Dispatch<NotesAction>;
}

const ARROW_DIRECTIONS: Readonly<Partial<Record<string, Point>>> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/** Arrow keys move or resize by this many pixels; with Shift, by one pixel for fine adjustment. */
const KEY_STEP = 10;
const FINE_KEY_STEP = 1;

function arrowKeyDelta(event: KeyboardEvent): Point | undefined {
  const direction = ARROW_DIRECTIONS[event.key];
  if (!direction || event.altKey || event.ctrlKey || event.metaKey) return undefined;
  const step = event.shiftKey ? FINE_KEY_STEP : KEY_STEP;
  return { x: direction.x * step, y: direction.y * step };
}

const HANDLE_DOTS: readonly Point[] = [2, 7, 12].flatMap((y) => [3, 7].map((x) => ({ x, y })));

function isPrimaryButton(event: PointerEvent): boolean {
  return event.button === 0;
}

function NoteViewImpl({
  note,
  liveRect,
  bounds,
  dragState,
  autoFocus,
  onMoveStart,
  onResizeStart,
  onNudge,
  dispatch,
}: NoteViewProps) {
  const { x, y, width, height } = liveRect ?? (bounds ? fitInside(note, bounds) : note);
  const bringToFront = () => dispatch({ type: 'broughtToFront', id: note.id });

  const handleGripPointerDown = (event: PointerEvent<HTMLElement>) => {
    // The color and delete buttons handle their own clicks; the rest of the strip, including the handle, drags.
    if (!isPrimaryButton(event) || (event.target as Element).closest('[data-no-drag]')) return;
    event.preventDefault();
    onMoveStart(note.id, event);
  };

  const handleResizePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!isPrimaryButton(event)) return;
    event.preventDefault();
    onResizeStart(note.id, event);
  };

  const nudgeOnArrowKey = (gesture: NoteGesture) => (event: KeyboardEvent<HTMLElement>) => {
    const delta = arrowKeyDelta(event);
    if (!delta) return;
    event.preventDefault();
    onNudge(note.id, gesture, delta);
  };

  return (
    <article
      className={`note note--${note.color}`}
      data-drag-state={dragState}
      style={{ transform: `translate(${x}px, ${y}px)`, width, height, zIndex: note.z }}
      onPointerDownCapture={bringToFront}
      onFocusCapture={bringToFront}
      aria-label="Note"
    >
      <div className="note__paper">
        <header className="note__grip" onPointerDown={handleGripPointerDown}>
          <button
            type="button"
            className="note__handle"
            aria-label="Move note"
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
            title="Drag to move, or use the arrow keys"
            onKeyDown={nudgeOnArrowKey('move')}
          >
            <svg viewBox="0 0 10 14" width="10" height="14" aria-hidden="true">
              {HANDLE_DOTS.map(({ x: cx, y: cy }) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" />
              ))}
            </svg>
          </button>
          <div className="note__colors" role="radiogroup" aria-label="Note color">
            {NOTE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={color === note.color}
                aria-label={COLOR_LABELS[color]}
                className={`swatch swatch--${color}`}
                data-no-drag
                onClick={() => dispatch({ type: 'colorChanged', id: note.id, color })}
              />
            ))}
          </div>
          <button
            type="button"
            className="note__delete"
            aria-label="Delete note"
            title="Delete note"
            data-no-drag
            onClick={() => dispatch({ type: 'deleted', id: note.id })}
          >
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <textarea
          className="note__text"
          value={note.text}
          placeholder="Write something"
          aria-label="Note text"
          autoFocus={autoFocus}
          onChange={(event) => dispatch({ type: 'textChanged', id: note.id, text: event.target.value })}
        />
        <button
          type="button"
          className="note__resize"
          aria-label="Resize note"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          title="Drag to resize, or use the arrow keys"
          onPointerDown={handleResizePointerDown}
          onKeyDown={nudgeOnArrowKey('resize')}
        />
      </div>
    </article>
  );
}

/** Memoized so dragging or editing one note doesn't re-render the others. */
export const NoteView = memo(NoteViewImpl);
