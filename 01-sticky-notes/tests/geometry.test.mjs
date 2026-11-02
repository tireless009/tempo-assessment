import test from 'node:test';
import assert from 'node:assert/strict';
import { containsPoint, fitInside, keepInside, rectFromCorners, resizeWithin } from '../src/model/geometry.ts';

const board = { width: 800, height: 600 };
const minimum = { width: 120, height: 90 };

test('draw from upper left to lower right', () => {
  assert.deepEqual(rectFromCorners({ x: 20, y: 40 }, { x: 200, y: 170 }),
    { x: 20, y: 40, width: 180, height: 130 });
});
test('reverse drawing direction gives the same rectangle', () => {
  assert.deepEqual(rectFromCorners({ x: 200, y: 170 }, { x: 20, y: 40 }),
    { x: 20, y: 40, width: 180, height: 130 });
});
test('movement clamps on all four sides of the board', () => {
  assert.deepEqual(keepInside({ x: -20, y: -100, width: 200, height: 150 }, board),
    { x: 0, y: 0, width: 200, height: 150 });
  assert.deepEqual(keepInside({ x: 700, y: 500, width: 200, height: 150 }, board),
    { x: 600, y: 450, width: 200, height: 150 });
});
test('oversized notes fit a smaller board without changing original geometry', () => {
  const original = { x: 90, y: 70, width: 400, height: 300 };
  assert.deepEqual(fitInside(original, { width: 180, height: 100 }),
    { x: 0, y: 0, width: 180, height: 100 });
  assert.deepEqual(original, { x: 90, y: 70, width: 400, height: 300 });
});
test('resize respects minimum dimensions', () => {
  assert.deepEqual(resizeWithin({ x: 50, y: 40, width: 250, height: 200 },
    { width: 40, height: 50 }, minimum, board),
    { x: 50, y: 40, width: 120, height: 90 });
});
test('resize respects the right and bottom edges', () => {
  assert.deepEqual(resizeWithin({ x: 600, y: 450, width: 180, height: 130 },
    { width: 800, height: 500 }, minimum, board),
    { x: 600, y: 450, width: 200, height: 150 });
});
test('resize never exceeds available space when viewport shrinks below minimum', () => {
  assert.deepEqual(resizeWithin({ x: 0, y: 0, width: 50, height: 40 },
    { width: 50, height: 40 }, minimum, { width: 80, height: 60 }),
    { x: 0, y: 0, width: 80, height: 60 });
});
test('trash zone hit testing includes its edges', () => {
  const trash = { x: 680, y: 500, width: 100, height: 80 };
  assert.ok(containsPoint(trash, { x: 680, y: 500 }));
  assert.ok(containsPoint(trash, { x: 780, y: 580 }));
  assert.ok(!containsPoint(trash, { x: 679, y: 520 }));
});
