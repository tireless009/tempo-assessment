import type { Rect, Size } from './geometry';

export type NoteId = string;

export const NOTE_COLORS = ['butter', 'rose', 'mint', 'sky', 'lilac'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Note extends Rect {
  readonly id: NoteId;
  readonly text: string;
  readonly color: NoteColor;
  /** Stacking order; higher is in front. */
  readonly z: number;
}

export const MIN_NOTE_SIZE: Size = { width: 120, height: 90 };
export const DEFAULT_NOTE_SIZE: Size = { width: 200, height: 160 };

export const COLOR_LABELS: Readonly<Record<NoteColor, string>> = {
  butter: 'Yellow',
  rose: 'Pink',
  mint: 'Green',
  sky: 'Blue',
  lilac: 'Purple',
};

export function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value);
}

/** Runtime check for data coming from storage or the network. */
export function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<Record<keyof Note, unknown>>;
  return (
    typeof v.id === 'string' && v.id.length > 0 &&
    typeof v.text === 'string' &&
    isNoteColor(v.color) &&
    [v.x, v.y, v.width, v.height, v.z].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    (v.width as number) > 0 && (v.height as number) > 0 &&
    (v.x as number) >= 0 && (v.y as number) >= 0
  );
}

export function createNoteId(): NoteId {
  // crypto.randomUUID only exists in secure contexts, e.g. not over plain http on a LAN address.
  if (typeof crypto.randomUUID === 'function' && globalThis.isSecureContext) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
