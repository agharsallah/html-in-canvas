/**
 * Lab: the exhibition. Your negatives as holographic foil cards (real
 * element snapshots in WebGL when supported), a radar of how much of each
 * roll you have mastered, and the escape hatch: live feature detection for
 * every context, with the path each one would take.
 */
import { button } from '../../ui/components/button';
import { createObjectives } from '../../ui/components/objectives';
import { createToggle } from '../../ui/components/toggle';
import { createCoverageRadar } from '../../ui/charts/coverage-radar';
import { h, rich } from '../../ui/dom';
import { ROLLS } from '../../story/rolls';
import type { Beat } from '../shared/chapter';
import { coverage } from './coverage';
import { createGallery } from './gallery';
import { detectSupport, pathFor, type DetectEnv, type RenderContext } from './rules';

const CONTEXTS: Array<[RenderContext, string, string]> = [
  ['2d', '2D', '`drawElementImage` on CanvasRenderingContext2D'],
  ['webgl', 'WebGL', '`texElementSubImage2D` on the WebGL context'],
  ['webgpu', 'WebGPU', '`drawElementImageToTexture` on GPUQueue'],
  ['worker', 'Worker', '`captureElementImage` on the canvas'],
];

export const lab: Beat = (host, ctx) => {
  const state = ctx.progress?.();
  const galleryHost = h('div', { class: 'reel-gallery-host', tabindex: '0', 'aria-label': 'Exhibition. Use the left and right arrow keys to walk along it.' });
  const gallery = createGallery(galleryHost, ctx.caps, ctx.roll.process, state);
  const seen = new Set<number>([0]);
  let foilWentOff = false;

  const goals = createObjectives([
    { id: 'browse', text: 'Walk past at least three cards in your exhibition.' },
    { id: 'foil', text: 'Switch the foil shader off and on: only colour changes, the card never moves.' },
    { id: 'detect', text: 'Run feature detection and read which path each context takes.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Detect, then draw for real or take the escape hatch. And keep collecting: the reel never ends.');
  });

  const caption = h('div', { class: 'reel-caption', 'aria-live': 'polite' });
  const renderCaption = () => {
    const card = gallery.cards[gallery.index]!;
    const owned = gallery.collected.has(card.id);
    const secretHidden = !owned && card.rarity === 'secret';
    caption.replaceChildren(
      h('p', { class: 'reel-caption-count' }, `Card ${gallery.index + 1} of ${gallery.cards.length} · ${owned ? 'developed' : 'undeveloped'}`),
      h('p', { class: 'reel-caption-name' }, secretHidden ? 'Secret' : card.name),
      h('p', {}, rich(owned ? card.text : secretHidden ? 'Found by exploring.' : 'Finish its frame to develop it.')));
  };
  const turn = (delta: number) => {
    seen.add(gallery.turn(delta));
    renderCaption();
    if (seen.size >= 3) goals.complete('browse');
    if (seen.size === gallery.cards.length) {
      ctx.collect('secret-full-turn');
      ctx.say('You walked the whole reel. Every card, developed or not, is part of the show.');
    }
  };
  galleryHost.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      turn(event.key === 'ArrowRight' ? 1 : -1);
    }
  });

  const foil = createToggle({ kind: 'switch', checked: true, label: 'Foil shader', description: 'A colour-only fragment shader over each card.', onChange: (on) => {
    gallery.setFoil(on);
    if (!on) foilWentOff = true;
    if (on && foilWentOff) goals.complete('foil');
  } });

  const radarAxes = coverage(state ?? { frames: {}, negatives: [] }).map((c) => {
    const roll = ROLLS.find((r) => r.id === c.roll)!;
    return { id: c.roll, short: roll.frame, label: roll.title, value: c.value,
      detail: `${c.frames}/4 frames, ${c.negatives}/${c.negativesTotal} negatives (${Math.round(c.value * 100)}%)` };
  });

  const results = h('ul', { class: 'reel-detect', 'aria-live': 'polite' });
  const detect = button({ label: 'Run feature detection', variant: 'primary', onClick: () => {
    const report = detectSupport(globalThis as unknown as DetectEnv);
    const row = (ok: boolean, name: string, how: string, path?: string) =>
      h('li', { 'data-ok': String(ok) }, h('span', { class: 'reel-detect-mark', 'aria-hidden': 'true' }, ok ? '✓' : '×'),
        h('span', {}, h('strong', {}, name), ' ', rich(how)), path ? h('span', { class: 'reel-detect-path' }, path) : null);
    results.replaceChildren(
      row(report.content, 'supportsHtmlInCanvas()', '`content` reflects `"drawable"`'),
      ...CONTEXTS.map(([id, name, how]) => row(report[id], name, how, pathFor(report, id) === 'native' ? 'draw for real' : 'escape hatch')),
      row(report.geometry, 'Geometry', '`updateElementGeometry` on the canvas'));
    goals.complete('detect');
    ctx.say(report.content ? 'This browser speaks HTML-in-Canvas. Still probe each context before you rely on it.' : 'No support here. Time for the escape hatch.');
  } });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'reel-lab' },
      h('section', { class: 'reel-exhibition' },
        galleryHost,
        h('div', { class: 'reel-side' },
          caption,
          h('div', { class: 'panel-actions' },
            button({ label: '← Previous', size: 'sm', onClick: () => turn(-1) }),
            button({ label: 'Next →', size: 'sm', onClick: () => turn(1) })),
          foil.el,
          h('p', { class: 'panel-help' }, rich(gallery.native
            ? 'Native: each card is a real HTML element drawn into WebGL with `texElementSubImage2D`, re-uploaded only when `changedElements` lists it.'
            : 'Simulated: the cards are drawn with canvas text, the way you would without the API.')))),
      h('div', { class: 'reel-lower' },
        createCoverageRadar(radarAxes, 'Your mastery, roll by roll'),
        h('section', { class: 'panel reel-hatch' },
          h('h3', { class: 'panel-title' }, 'The escape hatch'),
          h('p', { class: 'panel-help' }, rich('Detect the attribute first, then the exact method each context will call.')),
          detect, results))),
    goals.el));

  renderCaption();
  return () => gallery.destroy();
};
