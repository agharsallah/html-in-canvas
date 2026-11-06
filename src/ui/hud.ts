/**
 * The HUD: wordmark, render mode, silver and rank, and the Album button.
 */
import { ENABLE_HINT, type Capabilities } from '../core/capabilities';
import type { GameStore } from '../game/store';
import { RANKS, rankFor, type GameState } from '../game/state';
import { NEGATIVES } from '../story/negatives';
import { createGauge } from './components/gauge';
import { glyph } from './components/glyphs';
import { h } from './dom';

export interface HudOptions {
  caps: Capabilities;
  store: GameStore;
  onOpenAlbum(): void;
  /** The wordmark was clicked: return to the main darkroom view. */
  onHome(): void;
}

export function mountHud(root: HTMLElement, { caps, store, onOpenAlbum, onHome }: HudOptions): void {
  const meter = createGauge('Silver and progress to the next rank');
  const albumCount = h('span', { class: 'hud-album-count' });

  const modeInfo = h('div', { class: 'hud-mode-info', id: 'mode-info', hidden: true },
    h('p', {}, caps.mode === 'native'
      ? 'Your browser supports HTML-in-Canvas. The prints on the wire are real HTML drawn into WebGL: Tab to them, hover them, click their buttons.'
      : caps.forcedSimulation
        ? 'Simulation was forced with ?sim. Remove it from the address to use the real API.'
        : 'Your browser does not support HTML-in-Canvas yet, so the prints are shown with CSS 3D transforms and the labs use faithful simulations.'),
    caps.mode === 'simulated' && !caps.forcedSimulation ? h('p', {}, ENABLE_HINT) : null,
  );
  const modeButton = h('button', {
    class: 'hud-mode', type: 'button', 'data-mode': caps.mode, 'aria-expanded': 'false', 'aria-controls': 'mode-info',
    onclick: () => {
      const open = modeInfo.hidden;
      modeInfo.hidden = !open;
      modeButton.setAttribute('aria-expanded', String(open));
    },
  }, caps.mode === 'native' ? 'Native HTML-in-Canvas' : 'Simulated');

  root.append(
    h('header', { class: 'hud' },
      h('a', {
        class: 'hud-wordmark', href: '#/', 'aria-label': 'Drawable: back to the darkroom',
        onclick: (e: Event) => {
          const event = e as MouseEvent;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onHome();
        },
      },
        h('span', { class: 'hud-title' }, 'Drawable'),
        h('span', { class: 'hud-subtitle' }, 'a darkroom adventure through HTML-in-Canvas')),
      h('div', { class: 'hud-status' },
        h('div', { class: 'hud-mode-wrap' }, modeButton, modeInfo),
        meter.el,
        h('a', { class: 'hud-album hud-guide', href: 'guide.html' }, glyph('story', 18), 'Guide'),
        h('button', { class: 'hud-album', type: 'button', onclick: onOpenAlbum }, glyph('album', 18), 'Album ', albumCount)),
    ),
    h('p', { class: 'hud-hint' }, 'Scroll or drag to walk the line. Click a print to turn it over. Press X to see its HTML.'),
  );

  const render = (state: GameState) => {
    const rank = rankFor(state.silver);
    const next = RANKS[RANKS.indexOf(rank) + 1];
    const progress = next ? (state.silver - rank.minSilver) / (next.minSilver - rank.minSilver) : 1;
    meter.update(progress, `${state.silver} silver`,
      next ? `${rank.title}, ${next.minSilver - state.silver} to ${next.title}` : rank.title);
    albumCount.textContent = `${state.negatives.length}/${NEGATIVES.length}`;
  };
  render(store.getState());
  store.onChange(render);
}
