import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../model/geometry';

export interface PointerTrackingHandlers {
  /** Called at most once per animation frame with the latest pointer position (client coordinates). */
  readonly onMove: (client: Point) => void;
  /** `committed` is false when the drag was cancelled (Escape, lost capture, or pointercancel). */
  readonly onEnd: (client: Point, committed: boolean) => void;
}

/**
 * Follows one pointer from a pointerdown until it is released or the drag is cancelled.
 *
 * Uses pointer capture, so the drag keeps working when the pointer leaves the element or the window,
 * and coalesces moves into animation frames so a fast mouse cannot trigger more renders than the screen shows.
 */
export function trackPointer(start: ReactPointerEvent<HTMLElement>, handlers: PointerTrackingHandlers): void {
  const target = start.currentTarget;
  const { pointerId } = start;
  target.setPointerCapture(pointerId);

  let latest: Point = { x: start.clientX, y: start.clientY };
  let frame = 0;
  let finished = false;

  const flushMove = () => {
    frame = 0;
    handlers.onMove(latest);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    latest = { x: event.clientX, y: event.clientY };
    if (frame === 0) frame = requestAnimationFrame(flushMove);
  };

  const finish = (committed: boolean) => {
    if (finished) return;
    finished = true;
    if (frame !== 0) cancelAnimationFrame(frame);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onCancel);
    target.removeEventListener('lostpointercapture', onCancel);
    window.removeEventListener('keydown', onKeyDown, true);
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    handlers.onEnd(latest, committed);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    latest = { x: event.clientX, y: event.clientY };
    finish(true);
  };

  const onCancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) finish(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    finish(false);
  };

  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onCancel);
  target.addEventListener('lostpointercapture', onCancel);
  window.addEventListener('keydown', onKeyDown, true);
}
