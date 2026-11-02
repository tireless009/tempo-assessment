import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { trackPointer } from '../interaction/trackPointer';
import {
  containsPoint,
  fitInside,
  keepInside,
  rectFromCorners,
  resizeWithin,
  type Point,
  type Rect,
  type Size,
} from '../model/geometry';
import { DEFAULT_NOTE_SIZE, MIN_NOTE_SIZE, type Note, type NoteId } from '../model/note';
import type { NotesAction } from '../model/notesReducer';
import { NoteView, type DragStartHandler, type NoteDragState, type NudgeHandler } from './NoteView';
import { TrashZone } from './TrashZone';
import { NOTE_DRAG_TYPE } from './Toolbar';

/** What the user is doing with the pointer right now. Kept local: only the final result reaches the store. */
type Interaction =
  | { readonly kind: 'moving'; readonly noteId: NoteId; readonly rect: Rect; readonly overTrash: boolean }
  | { readonly kind: 'resizing'; readonly noteId: NoteId; readonly rect: Rect }
  | { readonly kind: 'drawing'; readonly rect: Rect };

/** Pointer travel (px) below which a press counts as a click, not a drag. */
const DRAG_THRESHOLD = 4;

interface BoardProps {
  readonly boardRef: RefObject<HTMLElement>;
  readonly notes: readonly Note[];
  readonly focusNoteId: NoteId | null;
  readonly dispatch: Dispatch<NotesAction>;
  readonly onCreateNote: (rect: Rect) => void;
}

interface BoardGeometry {
  /** Board's top-left corner in client coordinates. */
  readonly origin: Point;
  readonly bounds: Size;
}

function measureBoard(board: HTMLElement): BoardGeometry {
  const { left, top } = board.getBoundingClientRect();
  return { origin: { x: left, y: top }, bounds: { width: board.clientWidth, height: board.clientHeight } };
}

function toBoardPoint(client: Point, { origin, bounds }: BoardGeometry): Point {
  return {
    x: Math.min(Math.max(client.x - origin.x, 0), bounds.width),
    y: Math.min(Math.max(client.y - origin.y, 0), bounds.height),
  };
}

function travelledPastThreshold(from: Point, to: Point): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) >= DRAG_THRESHOLD;
}

function rectOf({ x, y, width, height }: Rect): Rect {
  return { x, y, width, height };
}

function liveRectOf(note: Note, interaction: Interaction | null): Rect | undefined {
  if (interaction === null || interaction.kind === 'drawing' || interaction.noteId !== note.id) return undefined;
  return interaction.rect;
}

function dragStateOf(note: Note, interaction: Interaction | null): NoteDragState {
  if (interaction === null || interaction.kind === 'drawing' || interaction.noteId !== note.id) return 'resting';
  if (interaction.kind === 'resizing') return 'resizing';
  return interaction.overTrash ? 'overTrash' : 'moving';
}

export function Board({ boardRef, notes, focusNoteId, dispatch, onCreateNote }: BoardProps) {
  const trashRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [dropPreview, setDropPreview] = useState<Rect | null>(null);
  const [bounds, setBounds] = useState<Size | null>(null);

  // Notes are drawn inside the current board size, but their stored positions only change when the user
  // moves them. Shrinking the window and restoring it therefore leaves every note where it was.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const update = () => {
      const { clientWidth: width, clientHeight: height } = board;
      setBounds((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  // Drag handlers read notes through a ref so they keep a stable identity;
  // otherwise every memoized NoteView would re-render on each change.
  const notesRef = useRef(notes);
  useLayoutEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const findNote = (id: NoteId) => notesRef.current.find((note) => note.id === id);

  /** Where a note is actually drawn on a board of the given size; gestures start from here. */
  const shownRect = (note: Note, boardBounds: Size): Rect => fitInside(note, boardBounds);

  const handleMoveStart: DragStartHandler = useCallback(
    (id, event) => {
      const note = findNote(id);
      const board = boardRef.current;
      if (!note || !board) return;

      const geometry = measureBoard(board);
      const start: Point = { x: event.clientX, y: event.clientY };
      let dragging = false;

      // The trash zone grows while a note is dragged, so it is measured on every move rather than once.
      const isOverTrash = (client: Point) => {
        const trash = trashRef.current?.getBoundingClientRect();
        return trash !== undefined && containsPoint(rectOf(trash), client);
      };
      const from = shownRect(note, geometry.bounds);
      const at = (client: Point) => ({
        rect: keepInside({ ...from, x: from.x + client.x - start.x, y: from.y + client.y - start.y }, geometry.bounds),
        overTrash: isOverTrash(client),
      });

      trackPointer(event, {
        onMove: (client) => {
          dragging ||= travelledPastThreshold(start, client);
          if (dragging) setInteraction({ kind: 'moving', noteId: id, ...at(client) });
        },
        onEnd: (client, committed) => {
          setInteraction(null);
          // The pointer may be released before the queued animation frame runs.
          if (!committed || (!dragging && !travelledPastThreshold(start, client))) return;
          const { rect, overTrash } = at(client);
          dispatch(overTrash ? { type: 'deleted', id } : { type: 'rectChanged', id, rect });
        },
      });
    },
    [dispatch],
  );

  const handleResizeStart: DragStartHandler = useCallback(
    (id, event) => {
      const note = findNote(id);
      const board = boardRef.current;
      if (!note || !board) return;

      const { bounds: boardBounds } = measureBoard(board);
      const from = shownRect(note, boardBounds);
      const start: Point = { x: event.clientX, y: event.clientY };
      const at = (client: Point) =>
        resizeWithin(
          from,
          { width: from.width + client.x - start.x, height: from.height + client.y - start.y },
          MIN_NOTE_SIZE,
          boardBounds,
        );

      trackPointer(event, {
        onMove: (client) => setInteraction({ kind: 'resizing', noteId: id, rect: at(client) }),
        onEnd: (client, committed) => {
          setInteraction(null);
          if (committed) dispatch({ type: 'rectChanged', id, rect: at(client) });
        },
      });
    },
    [dispatch],
  );

  /** Keyboard alternative to dragging: arrow keys on a note's move handle or resize corner. */
  const handleNudge: NudgeHandler = useCallback(
    (id, gesture, delta) => {
      const note = findNote(id);
      const board = boardRef.current;
      if (!note || !board) return;

      const { bounds: boardBounds } = measureBoard(board);
      const from = shownRect(note, boardBounds);
      const rect =
        gesture === 'move'
          ? keepInside({ ...from, x: from.x + delta.x, y: from.y + delta.y }, boardBounds)
          : resizeWithin(
              from,
              { width: from.width + delta.x, height: from.height + delta.y },
              MIN_NOTE_SIZE,
              boardBounds,
            );
      dispatch({ type: 'rectChanged', id, rect });
    },
    [dispatch],
  );

  /** Pressing on empty board space and dragging draws a new note of that size. */
  const handleBoardPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.button !== 0) return;
    const board = boardRef.current;
    if (!board) return;
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    const geometry = measureBoard(board);
    const start = toBoardPoint({ x: event.clientX, y: event.clientY }, geometry);
    let drawing = false;

    // The note can't be smaller than the minimum, so the preview shows the size it will actually get.
    const at = (client: Point) => {
      const drawn = rectFromCorners(start, toBoardPoint(client, geometry));
      const sized = resizeWithin(drawn, drawn, MIN_NOTE_SIZE, { width: Infinity, height: Infinity });
      return keepInside(sized, geometry.bounds);
    };

    trackPointer(event, {
      onMove: (client) => {
        drawing ||= travelledPastThreshold(start, toBoardPoint(client, geometry));
        if (drawing) setInteraction({ kind: 'drawing', rect: at(client) });
      },
      onEnd: (client, committed) => {
        setInteraction(null);
        // Quick drags must commit even when their first frame has not yet rendered.
        if (committed && (drawing || travelledPastThreshold(start, toBoardPoint(client, geometry)))) {
          onCreateNote(at(client));
        }
      },
    });
  };

  /** Double-clicking empty board space creates a default-sized note centered on the pointer. */
  const handleBoardDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const board = boardRef.current;
    if (event.target !== event.currentTarget || !board) return;
    const geometry = measureBoard(board);
    const center = toBoardPoint({ x: event.clientX, y: event.clientY }, geometry);
    const rect: Rect = {
      x: center.x - DEFAULT_NOTE_SIZE.width / 2,
      y: center.y - DEFAULT_NOTE_SIZE.height / 2,
      ...DEFAULT_NOTE_SIZE,
    };
    onCreateNote(keepInside(rect, geometry.bounds));
  };

  // Native drag and drop from the toolbar. The same creation callback is used by
  // drawing on the board, so all creation paths produce the same note shape.
  const paletteRect = (client: Point): Rect | null => {
    const board = boardRef.current;
    if (!board) return null;
    const geometry = measureBoard(board);
    const at = toBoardPoint(client, geometry);
    return fitInside({
      x: at.x - 20, y: at.y - 20, ...DEFAULT_NOTE_SIZE,
    }, geometry.bounds);
  };

  const dragOver = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropPreview(paletteRect({ x: event.clientX, y: event.clientY }));
  };

  const dragLeave = (event: DragEvent<HTMLElement>) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect && !containsPoint({ x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      { x: event.clientX, y: event.clientY })) setDropPreview(null);
  };

  const drop = (event: DragEvent<HTMLElement>) => {
    if (event.dataTransfer.getData(NOTE_DRAG_TYPE) !== 'new') return;
    event.preventDefault();
    const rect = paletteRect({ x: event.clientX, y: event.clientY });
    setDropPreview(null);
    if (rect) onCreateNote(rect);
  };

  useLayoutEffect(() => {
    const stopPreview = () => setDropPreview(null);
    window.addEventListener('dragend', stopPreview);
    return () => window.removeEventListener('dragend', stopPreview);
  }, []);

  const draft = interaction?.kind === 'drawing' ? interaction.rect : dropPreview;
  const isMoving = interaction?.kind === 'moving';
  const isOverTrash = interaction?.kind === 'moving' && interaction.overTrash;

  return (
    <main
      ref={boardRef}
      className="board"
      data-interaction={interaction?.kind ?? 'none'}
      onPointerDown={handleBoardPointerDown}
      onDoubleClick={handleBoardDoubleClick}
      onDragOver={dragOver}
      onDragLeave={dragLeave}
      onDrop={drop}
    >
      <div className="board__notes">
        {notes.map((note) => (
          <NoteView
            key={note.id}
            note={note}
            liveRect={liveRectOf(note, interaction)}
            bounds={bounds}
            dragState={dragStateOf(note, interaction)}
            autoFocus={note.id === focusNoteId}
            onMoveStart={handleMoveStart}
            onResizeStart={handleResizeStart}
            onNudge={handleNudge}
            dispatch={dispatch}
          />
        ))}
        {draft && (
          <div
            className="draft"
            style={{
              transform: `translate(${draft.x}px, ${draft.y}px)`,
              width: draft.width,
              height: draft.height,
            }}
          />
        )}
      </div>

      {notes.length === 0 && interaction === null && dropPreview === null && (
        <p className="board__hint">Draw a note by dragging, or drop a note from the toolbar.</p>
      )}

      <TrashZone ref={trashRef} active={isMoving} armed={isOverTrash} />
    </main>
  );
}
