/**
 * Roll 09 rules, pinned to the explainer:
 *  - README Accessibility (R:317): drawable content is in the accessibility
 *    tree unless hidden with aria-hidden / inert; a drawable never given
 *    geometry is reported without it.
 *  - README 1 (R:26): canvas children are not hit testable until drawn.
 *  - concepts.md, Reset geometry: clearElementGeometry marks offscreen and
 *    removes the element from canvas hit testing.
 *  - concepts.md: when geometry stops being updated, clicks still land
 *    where the element used to be.
 *  - webGL.html: inert decides which elements are hit tested.
 */
import { describe, expect, it } from 'vitest';
import { auditBoard, BOARD, brokenBoard, bugCount, exposureOf, type BoardConfig } from '../src/chapters/roll-09-lighthouse/board';
import { describeExposure, expose, geometryOf, inherit, isGhostFocus, tally, type NodeSpec } from '../src/chapters/roll-09-lighthouse/rules';

const drawn: NodeSpec = { drawable: true, draw: 'drawn', inert: false, ariaHidden: false, focusable: true };
const with_ = (patch: Partial<NodeSpec>): NodeSpec => ({ ...drawn, ...patch });

describe('expose', () => {
  it('a drawn drawable is announced, has bounds, and is reachable and clickable', () => {
    expect(expose(drawn)).toEqual({ announced: true, geometry: 'bounds', tabbable: true, hitTestable: true, focusOpen: false });
  });

  it('a never-drawn drawable is still announced, but without geometry and not clickable', () => {
    const e = expose(with_({ draw: 'never' }));
    expect(e.announced).toBe(true);
    expect(e.geometry).toBe('none');
    expect(e.hitTestable).toBe(false);
  });

  it('never scores focus on geometry-less content: it is an open question', () => {
    const e = expose(with_({ draw: 'never' }));
    expect(e.focusOpen).toBe(true);
    expect(tally([e]).tabbable).toBe(0);
  });

  it('a layout-only (non-drawable) child never has geometry', () => {
    expect(geometryOf({ drawable: false, draw: 'drawn' })).toBe('none');
  });

  it('aria-hidden silences, but leaves the element focusable and clickable: ghost focus', () => {
    const e = expose(with_({ ariaHidden: true }));
    expect(e.announced).toBe(false);
    expect(e.tabbable).toBe(true);
    expect(e.hitTestable).toBe(true);
    expect(isGhostFocus(e)).toBe(true);
  });

  it('inert silences it and takes it out of Tab and hit testing', () => {
    const e = expose(with_({ inert: true }));
    expect(e).toMatchObject({ announced: false, tabbable: false, hitTestable: false });
    expect(isGhostFocus(e)).toBe(false);
  });

  it('stopping drawing without clearing keeps stale, clickable geometry', () => {
    expect(expose(with_({ draw: 'stale' }))).toMatchObject({ geometry: 'stale', hitTestable: true, announced: true });
  });

  it('clearElementGeometry marks offscreen and removes hit testing', () => {
    expect(expose(with_({ draw: 'cleared' }))).toMatchObject({ geometry: 'offscreen', hitTestable: false, announced: true });
  });

  it('children inherit hiding and geometry from their drawable parent', () => {
    const child = inherit(with_({ ariaHidden: true, draw: 'stale', focusable: false }), { focusable: true });
    expect(isGhostFocus(expose(child))).toBe(true);
    expect(expose(child).geometry).toBe('stale');
  });

  it('describes nodes the way the screen reader view does', () => {
    expect(describeExposure(expose(drawn))).toBe('bounds · focusable · clickable');
    expect(describeExposure(expose(with_({ ariaHidden: true })))).toMatch(/silent, yet Tab/);
    expect(describeExposure(expose(with_({ inert: true })))).toBe('silent');
  });
});

const fixed = (): BoardConfig => {
  const config = brokenBoard();
  config.canvasLabel = true;
  config.nodes.noon.tabindex = true;
  config.duskPreserve = false;
  config.nodes.yesterday.inert = true;
  config.nodes.slider.inert = false;
  config.nodes.readout.inert = true;
  config.ringLast = true;
  return config;
};

describe('the tide board audit', () => {
  it('starts with seven broken elements', () => {
    expect(bugCount(brokenBoard())).toBe(7);
  });

  it('passes once every bug is fixed', () => {
    expect(auditBoard(fixed())).toEqual([]);
  });

  it('dawn is the healthy decoy', () => {
    const dawn = BOARD.find((n) => n.id === 'dawn')!;
    expect(exposureOf(brokenBoard(), dawn)).toMatchObject({ announced: true, tabbable: true, geometry: 'bounds' });
  });

  it('aria-hidden alone cannot retire yesterday’s view: Tab and clicks still reach Replay', () => {
    const config = fixed();
    config.nodes.yesterday = { tabindex: false, inert: false, ariaHidden: true };
    const symptoms = auditBoard(config).map((f) => f.symptom).join(' ');
    expect(symptoms).toMatch(/Tab lands on an invisible Replay/);
    expect(symptoms).toMatch(/clicks where it used to be/);
  });

  it('the readout may be hidden with aria-hidden instead of inert: it is not focusable', () => {
    const config = fixed();
    config.nodes.readout = { tabindex: false, inert: false, ariaHidden: true };
    expect(auditBoard(config)).toEqual([]);
  });

  it('drawing dusk with preserveElementGeometry leaves it without geometry', () => {
    const config = fixed();
    config.duskPreserve = true;
    expect(auditBoard(config).map((f) => f.target)).toEqual(['dusk']);
  });

  it('a focus ring drawn before the wedges is a bug', () => {
    const config = fixed();
    config.ringLast = false;
    expect(auditBoard(config).map((f) => f.target)).toEqual(['paint']);
  });

  it('over-fixing breaks things: an inert healthy label is lost to keyboards and screen readers', () => {
    const config = fixed();
    config.nodes.dawn.inert = true;
    expect(auditBoard(config).map((f) => f.target)).toEqual(['dawn']);
  });

  it('symptoms never name the fix', () => {
    for (const finding of auditBoard(brokenBoard())) {
      expect(finding.symptom).not.toMatch(/\binert\b|aria-hidden|tabindex|preserveElementGeometry|drawFocusIfNeeded/);
    }
  });
});
