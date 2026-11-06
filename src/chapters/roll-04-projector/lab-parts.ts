/**
 * Pieces of the projector lab: the drawable ticket, and the live code
 * readout that colours each number by its unit.
 */
import { h } from '../../ui/dom';
import { argList, usesSource, type DrawCall } from './rules';

/** The ticket's border box, CSS px (box-sizing: border-box in projector.css). */
export const LAB_TICKET = { w: 220, h: 110 };

/** A real HTML ticket: text, emoji, RTL script, vertical stub, and a glow that overflows its border box. */
export function makeTicket(): HTMLElement {
  return h('div', { class: 'proj-ticket' },
    h('p', { class: 'proj-ticket-title' }, 'CROOKED REEL'),
    h('p', { class: 'proj-ticket-sub' }, 'Hall 4 · Row C · ', h('span', { 'aria-label': 'film' }, '🎞️')),
    h('p', { class: 'proj-ticket-rtl', dir: 'rtl', lang: 'ar' }, 'سينما الليلة'),
    h('p', { class: 'proj-ticket-stub' }, 'ADMIT ONE'));
}

const fmt = (n: number) => String(Math.round(n));

/** `ctx.drawElementImage(ticket, …)` with CSS-px numbers and grid-px numbers styled apart. */
export function renderReadout(target: HTMLElement, call: DrawCall): void {
  const nums = argList(call);
  const sourceCount = usesSource(call.args) ? 4 : 0;
  const parts: Array<Node | string> = [];
  if (call.rotate) parts.push('ctx.rotate(', h('span', { class: 'pj-deg' }, fmt(call.rotate)), ' * Math.PI / 180);\n');
  parts.push('ctx.drawElementImage(ticket');
  nums.forEach((n, i) => {
    parts.push(', ', h('span', { class: i < sourceCount ? 'pj-css' : 'pj-grid', title: i < sourceCount ? 'CSS px' : 'canvas grid px' }, fmt(n)));
  });
  parts.push(');');
  target.replaceChildren(...parts);
}
