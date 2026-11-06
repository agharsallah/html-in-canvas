/**
 * The sound toggle: a pressed/unpressed button with a speaker glyph. Every
 * instance (HUD, chapter header) mirrors the one shared preference.
 */
import { s } from '../charts/svg';
import { h } from '../dom';
import { sound } from '../fx/sound';

function speaker(): SVGSVGElement {
  const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return s('svg', { viewBox: '0 0 24 24', width: 18, height: 18, class: 'glyph', 'aria-hidden': 'true' },
    s('path', { ...line, d: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z' }),
    s('g', { class: 'glyph-sound-wave' },
      s('path', { ...line, d: 'M15.5 9a4 4 0 0 1 0 6' }),
      s('path', { ...line, d: 'M18 6.5a7.5 7.5 0 0 1 0 11' })),
    s('g', { class: 'glyph-sound-off' },
      s('path', { ...line, d: 'M16 9.5l5 5M21 9.5l-5 5' })));
}

/** `attrs` lets a host style it as its own buttons (HUD pill, chapter button). */
export function createSoundToggle(className: string, attrs: Record<string, string> = {}): HTMLButtonElement {
  // The name stays "Sound"; aria-pressed and the glyph carry on/off.
  const el = h('button', { type: 'button', class: `sound-toggle ${className}`, 'aria-pressed': 'false', ...attrs },
    speaker(), h('span', { class: 'sound-toggle-label' }, 'Sound'));
  const render = (on: boolean) => {
    el.setAttribute('aria-pressed', String(on));
    el.title = on ? 'Sound effects are on' : 'Sound effects are off';
  };
  render(sound.enabled);
  el.addEventListener('click', () => sound.set(!sound.enabled));
  // Chapter headers come and go: a toggle that has left the page unsubscribes
  // at the next change instead of being tracked.
  const stop = sound.onChange((on) => (el.isConnected ? render(on) : stop()));
  return el;
}
