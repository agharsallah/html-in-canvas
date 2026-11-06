/**
 * Roll 05 rules, pinned to the explainer (README "5. Synchronizing the DOM
 * and drawing", the IDL comments) and Chrome docs concepts.md.
 */
import { describe, expect, it } from 'vitest';
import {
  classifyClick, clearElementGeometry, drawElementImage, EMPTY, getElementTransform, gridToCss, hitArea,
  hitTest, IDENTITY, insideQuad, pose, quadOf, runPaints, stackRank, toAffine, updateElementGeometry,
} from '../src/chapters/roll-05-mirrors/rules';
import { drawnAt, LEVELS, levelSolved, registeredAt, targetAt, targetPasses, type Config, type Level } from '../src/chapters/roll-05-mirrors/levels';

const box = { width: 100, height: 40 };
const sizes = { a: box, b: box, wall: { width: 400, height: 300 } };

describe('geometry starts empty', () => {
  it('drawn children are not hit testable until they get geometry (R:26)', () => {
    expect(hitTest(EMPTY, sizes, { x: 10, y: 10 })).toBeNull();
  });
  it('getElementTransform returns identity when nothing was set (R:126-130)', () => {
    expect(getElementTransform(EMPTY, 'a')).toEqual(IDENTITY);
  });
});

describe('2D drawElementImage', () => {
  it('updates geometry to where it drew, by default (R:49)', () => {
    const g = drawElementImage(EMPTY, 'a', pose(200, 100));
    expect(hitTest(g, sizes, { x: 250, y: 120 })).toBe('a');
    expect(toAffine(getElementTransform(g, 'a'))).toMatchObject({ e: 200, f: 100 });
  });
  it('leaves geometry alone with preserveElementGeometry: true (R:162-168)', () => {
    const before = drawElementImage(EMPTY, 'a', pose(0, 0));
    const after = drawElementImage(before, 'a', pose(200, 100), { preserveElementGeometry: true });
    expect(hitTest(after, sizes, { x: 250, y: 120 })).toBeNull(); // drawn there, but…
    expect(hitTest(after, sizes, { x: 50, y: 20 })).toBe('a'); // …the ghost answers here
  });
  it('follows rotation and scale of the context transform', () => {
    const g = drawElementImage(EMPTY, 'a', pose(100, 100, 90, 2));
    // Rotated 90°: the box now extends down from (100,100) to the left.
    expect(hitTest(g, sizes, { x: 60, y: 150 })).toBe('a');
    expect(hitTest(g, sizes, { x: 150, y: 150 })).toBeNull();
  });
});

describe('updateElementGeometry', () => {
  it('keeps the previous transform when canvasTransform is omitted (IDL)', () => {
    const g = updateElementGeometry(updateElementGeometry(EMPTY, 'a', { canvasTransform: pose(10, 10) }), 'a', {});
    expect(toAffine(getElementTransform(g, 'a'))).toMatchObject({ e: 10, f: 10 });
  });
  it('limits hits to canvasClip (element-local CSS px, our labelled assumption)', () => {
    const g = updateElementGeometry(EMPTY, 'a', { canvasTransform: pose(0, 0), canvasClip: { x: 0, y: 0, width: 100, height: 20 } });
    expect(hitTest(g, sizes, { x: 50, y: 10 })).toBe('a');
    expect(hitTest(g, sizes, { x: 50, y: 30 })).toBeNull();
  });
  it('moves the element to the top of the stack by default (concepts.md: last drawn = topmost)', () => {
    let g = drawElementImage(EMPTY, 'a', pose(0, 0));
    g = drawElementImage(g, 'b', pose(0, 0));
    expect(hitTest(g, sizes, { x: 5, y: 5 })).toBe('b');
    g = updateElementGeometry(g, 'a', {});
    expect(hitTest(g, sizes, { x: 5, y: 5 })).toBe('a');
    expect(stackRank(g, 'a')).toBe(1);
  });
  it('preserveHitTestOrder keeps an element that is already in the stack where it is', () => {
    let g = drawElementImage(EMPTY, 'a', pose(0, 0));
    g = drawElementImage(g, 'b', pose(0, 0));
    g = updateElementGeometry(g, 'a', { canvasTransform: pose(0, 0), preserveHitTestOrder: true });
    expect(hitTest(g, sizes, { x: 5, y: 5 })).toBe('b');
  });
  it('preserveHitTestOrder still places a new element on top: "in all other cases" (IDL)', () => {
    const g = updateElementGeometry(drawElementImage(EMPTY, 'a', pose(0, 0)), 'b', { canvasTransform: pose(0, 0), preserveHitTestOrder: true });
    expect(hitTest(g, sizes, { x: 5, y: 5 })).toBe('b');
  });
  it('a background updated after the foreground, with preserveHitTestOrder, settles below it from the second paint', () => {
    const calls = [
      { kind: 'draw', id: 'a', matrix: pose(0, 0) },
      { kind: 'update', id: 'wall', options: { canvasTransform: pose(0, 0), preserveHitTestOrder: true } },
    ] as const;
    expect(hitTest(runPaints(EMPTY, calls, 1), sizes, { x: 5, y: 5 })).toBe('wall');
    expect(hitTest(runPaints(EMPTY, calls, 2), sizes, { x: 5, y: 5 })).toBe('a');
  });
});

describe('clearElementGeometry', () => {
  it('removes hit testing and resets the transform to identity (R:47, R:126-130)', () => {
    const g = clearElementGeometry(drawElementImage(EMPTY, 'a', pose(20, 20)), 'a');
    expect(hitTest(g, sizes, { x: 30, y: 30 })).toBeNull();
    expect(getElementTransform(g, 'a')).toEqual(IDENTITY);
    expect(hitArea(g, 'a', box)).toBeNull();
  });
});

describe('units', () => {
  it('converts a grid-px translation to CSS px by dividing by the scale', () => {
    expect(gridToCss(300, 2)).toBe(150);
  });
});

describe('projective quads', () => {
  it('maps corners and tests insideness for either winding', () => {
    const quad = quadOf(pose(10, 10), { x: 0, y: 0, ...box })!;
    expect(insideQuad(quad, { x: 50, y: 30 })).toBe(true);
    expect(insideQuad([...quad].reverse(), { x: 50, y: 30 })).toBe(true);
    expect(insideQuad(quad, { x: 200, y: 30 })).toBe(false);
  });
  it('refuses areas behind the camera', () => {
    const behind = [...IDENTITY];
    behind[15] = -1;
    expect(quadOf(behind, { x: 0, y: 0, ...box })).toBeNull();
  });
});

describe('classifyClick', () => {
  it('names the four outcomes', () => {
    expect(classifyClick('a', 'a')).toBe('hit');
    expect(classifyClick('a', null)).toBe('missed');
    expect(classifyClick('a', 'b')).toBe('missed');
    expect(classifyClick(null, 'a')).toBe('ghost');
    expect(classifyClick(null, null)).toBe('empty');
  });
});

describe('trial levels', () => {
  const byId = (id: string) => LEVELS.find((l) => l.id === id)!;
  const solvedBy = (level: Level, patch: Config) => levelSolved(level, { ...level.initial, ...patch });

  it('none starts solved, so the trial cannot be passed by clicking alone', () => {
    for (const level of LEVELS) expect(levelSolved(level, level.initial), level.id).toBe(false);
  });

  it('door: either stop preserving, or sync by hand', () => {
    const door = byId('door');
    expect(solvedBy(door, { preserve: false })).toBe(true);
    expect(solvedBy(door, { sync: true })).toBe(true);
    expect(registeredAt(door, door.initial, { x: 60, y: 60 })).toBe('door'); // the ghost
  });

  it('lever: only dividing by the scale lines up', () => {
    const lever = byId('lever');
    expect(solvedBy(lever, { units: 'divide' })).toBe(true);
    expect(solvedBy(lever, { units: 'multiply' })).toBe(false);
  });

  it('wall: preserveHitTestOrder fixes it; opting the buttons out breaks them', () => {
    const wall = byId('wall');
    expect(solvedBy(wall, { order: true })).toBe(true);
    expect(solvedBy(wall, { order: true, buttonsPreserve: true })).toBe(false);
    expect(targetPasses(wall, { ...wall.initial, order: true, buttonsPreserve2: true }, wall.targets[0]!)).toBe(true);
  });

  it('menu: erasing pixels does nothing, clearing geometry does', () => {
    const menu = byId('menu');
    expect(solvedBy(menu, { erase: true })).toBe(false);
    expect(solvedBy(menu, { clear: true })).toBe(true);
    expect(registeredAt(menu, menu.initial, { x: 360, y: 150 })).toBe('menu');
  });

  it('tilt: only the full projective matrix lines up', () => {
    const tilt = byId('tilt');
    expect(solvedBy(tilt, { matrix: 'model' })).toBe(false);
    expect(solvedBy(tilt, { matrix: 'full' })).toBe(true);
  });

  it('every target spot is recognised as that target, on what the learner sees', () => {
    for (const level of LEVELS) {
      level.targets.forEach((t, i) => {
        expect(targetAt(level, t.at), `${level.id} #${i}`).toBe(i);
        if (t.expect) expect(drawnAt(level, t.at)).toBe(t.expect);
      });
    }
  });

  it('the wall is scenery: clicking bare wall aims at no target', () => {
    expect(targetAt(byId('wall'), { x: 20, y: 20 })).toBe(-1);
  });
});
