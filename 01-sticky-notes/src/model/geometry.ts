export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

/** The axis-aligned rectangle spanned by two corner points, in any order. */
export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Moves the rectangle (without resizing it) so it lies inside `bounds`. */
export function keepInside(rect: Rect, bounds: Size): Rect {
  return {
    ...rect,
    x: clamp(rect.x, 0, bounds.width - rect.width),
    y: clamp(rect.y, 0, bounds.height - rect.height),
  };
}

/**
 * Shrinks the rectangle if it is larger than `bounds`, then moves it inside.
 * Used when drawing, so a smaller window shows every note without changing where it is stored.
 */
export function fitInside(rect: Rect, bounds: Size): Rect {
  const { x, y } = rect;
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  return keepInside({ x, y, width, height }, bounds);
}

/** Resizes the rectangle (keeping its top-left corner) to at least `min` and at most what fits in `bounds`. */
export function resizeWithin(rect: Rect, size: Size, min: Size, bounds: Size): Rect {
  const roomWidth = Math.max(0, bounds.width - rect.x);
  const roomHeight = Math.max(0, bounds.height - rect.y);
  return {
    ...rect,
    width: clamp(size.width, Math.min(min.width, roomWidth), roomWidth),
    height: clamp(size.height, Math.min(min.height, roomHeight), roomHeight),
  };
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
