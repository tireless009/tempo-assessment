import { forwardRef } from 'react';

interface TrashZoneProps {
  /** A note is being dragged, so the zone is a possible drop target. */
  readonly active: boolean;
  /** The dragged note is over the zone and will be deleted on release. */
  readonly armed: boolean;
}

export const TrashZone = forwardRef<HTMLDivElement, TrashZoneProps>(function TrashZone({ active, armed }, ref) {
  return (
    <div ref={ref} className="trash" data-active={active} data-armed={armed} aria-hidden={!active}>
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path
          d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="trash__label">{armed ? 'Release to delete' : 'Drop here to delete'}</span>
    </div>
  );
});
