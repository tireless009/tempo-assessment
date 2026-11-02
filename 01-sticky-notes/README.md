# Sticky Notes (React + TypeScript)

A desktop sticky-notes board. The four required interactions are implemented, plus editing, note colors, stacking, local storage, and a short Undo for deletion.

## Run

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open the local address shown by Vite (usually `http://localhost:5173`).

Other commands:

```bash
npm test        # Node's built-in test runner, no browser required
npm run build   # Type-check and build for production
npm run preview # Preview the production build
```

## Using the board

- **Draw a note:** drag across empty board space; release at the desired width and height. Dragging in any direction works. A plain click does nothing to avoid accidental notes.
- **Drop a note:** drag the **New note** tile from the toolbar to the board. Clicking it also creates a default note.
- **Exact placement:** enter X, Y, W and H in the toolbar, then press Add.
- **Move:** drag the note's top strip. **Resize:** drag its bottom-right corner. Notes stay inside the board.
- **Delete:** drag a note into the trash zone at bottom right, or use the × button. Undo restores the last deleted note for eight seconds.
- **Edit and organize:** type inside the note, choose a color, or click a note to bring it to the front. Use arrow keys on the move or resize handles (Shift + arrow for one-pixel steps).
- **Cancel a drag:** press Escape. Changes are saved to this browser and restored after refreshing.

## What to check manually

1. Draw notes in each direction, including starting near the board edges. Draw a very small note and a large note.
2. Drop the toolbar tile on blank space and over another note. Click the tile and use the coordinate fields.
3. Move a note to every edge; resize smaller than the minimum and larger than the available space.
4. Drag a note into the trash, undo deletion, and try cancelling a drag with Escape. Release a drag outside the note.
5. Type multiline text, change colors, overlap notes, and confirm the selected one comes to the front.
6. Refresh to check saved notes. Resize the browser window and restore it; note positions should not be permanently overwritten.
7. With storage disabled, the board should still work during the session, with a save warning.

See `ARCHITECTURE.md` for the requested architecture description.
