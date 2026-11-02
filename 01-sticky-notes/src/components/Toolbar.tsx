import { useState, type DragEvent, type FormEvent } from 'react';
import type { Rect } from '../model/geometry';
import { DEFAULT_NOTE_SIZE, MIN_NOTE_SIZE } from '../model/note';

export const NOTE_DRAG_TYPE = 'application/x-sticky-note-create';

interface ToolbarProps {
  readonly onAdd: (rect?: Rect) => void;
  readonly storageError: boolean;
}

export function Toolbar({ onAdd, storageError }: ToolbarProps) {
  const [fields, setFields] = useState({
    x: '60', y: '60',
    width: String(DEFAULT_NOTE_SIZE.width), height: String(DEFAULT_NOTE_SIZE.height),
  });

  const dragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(NOTE_DRAG_TYPE, 'new');
    event.dataTransfer.setData('text/plain', 'sticky-note');
    event.dataTransfer.effectAllowed = 'copy';
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.values(fields).some((value) => value.trim() === '')) return;
    const rect: Rect = {
      x: Number(fields.x), y: Number(fields.y),
      width: Number(fields.width), height: Number(fields.height),
    };
    if (!Object.values(rect).every(Number.isFinite)) return;
    onAdd({ ...rect, width: Math.max(MIN_NOTE_SIZE.width, rect.width), height: Math.max(MIN_NOTE_SIZE.height, rect.height) });
  };

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <h1 className="toolbar__title">Sticky notes</h1>
        <span className="toolbar__subtitle">Draw on the board or drag a new note onto it</span>
      </div>
      <button className="toolbar__palette" type="button" draggable onDragStart={dragStart}
        onClick={() => onAdd()} title="Drag onto the board, or click to add">
        <span aria-hidden="true">⠿</span> New note
      </button>
      <form className="toolbar__form" onSubmit={submit} aria-label="Add at exact coordinates and size">
        {(['x', 'y', 'width', 'height'] as const).map((field) => (
          <label key={field}>
            <span>{field === 'width' ? 'W' : field === 'height' ? 'H' : field.toUpperCase()}</span>
            <input type="number" value={fields[field]} min="0" step="1"
              onChange={(event) => setFields((current) => ({ ...current, [field]: event.target.value }))} />
          </label>
        ))}
        <button className="toolbar__add" type="submit">Add</button>
      </form>
      {storageError && <span className="toolbar__warning" role="status">Could not save notes</span>}
    </header>
  );
}
