/**
 * The hero card: the first thing anyone sees, lying in the developer tray.
 *
 * It is ordinary HTML (a heading, a live clock, a text field, a button),
 * drawn into the liquid by WebGL. That's the whole pitch in one object: you
 * can select its words, type your name into it, and press its button, all
 * through a rippling 3D surface.
 */
import { h } from './dom';

/** Must match `.hero-card` in hero.css. */
export const HERO_CARD_SIZE = { width: 560, height: 380 } as const;

export interface HeroCard {
  readonly el: HTMLElement;
  readonly input: HTMLInputElement;
  setReturning(name: string, returning: boolean): void;
  destroy(): void;
}

export function createHeroCard(native: boolean): HeroCard {
  const time = h('time', { class: 'hero-clock' });
  const input = h('input', {
    class: 'hero-input', type: 'text', maxlength: '28', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'Your name', 'aria-label': 'Sign the darkroom register with your name',
  });
  const begin = h('button', { class: 'hero-begin', type: 'button', 'data-hero': 'begin' }, 'Begin the story');
  const greeting = h('p', { class: 'hero-greeting' });

  const el = h('article', { class: 'hero-card', 'aria-labelledby': 'hero-title' },
    h('p', { class: 'hero-edge' }, h('span', {}, 'Darkroom register'), h('span', {}, 'Developing since ', time)),
    h('h1', { class: 'hero-title', id: 'hero-title' }, 'Drawable'),
    native
      ? h('p', { class: 'hero-lede' },
        'This paper is ', h('strong', {}, 'real HTML'), ', lying in developer and drawn by WebGL. ',
        'Stir the liquid, select these words, sign your name.')
      : h('p', { class: 'hero-lede' },
        'In Chrome 157 this paper is ', h('strong', {}, 'real HTML drawn by WebGL'), ' under rippling developer. ',
        'Your browser shows it laid on top instead. Sign your name anyway.'),
    greeting,
    h('div', { class: 'hero-actions' },
      h('label', { class: 'hero-sign' }, h('span', {}, 'Sign the register'), input),
      begin));

  // A live clock: every second the HTML changes, the canvas fires `paint`,
  // and the new snapshot is uploaded into the liquid. Proof it's alive.
  const tick = () => {
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  const timer = window.setInterval(tick, 1000);

  return {
    el,
    input,
    setReturning(name, returning) {
      greeting.textContent = returning
        ? `Welcome back${name ? `, ${name}` : ''}. Your prints are still on the line.`
        : '';
      greeting.hidden = !returning;
      begin.textContent = returning ? 'Back to the line' : 'Begin the story';
    },
    destroy: () => clearInterval(timer),
  };
}
