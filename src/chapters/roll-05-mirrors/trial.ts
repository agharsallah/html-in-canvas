/**
 * Trial: the mirror maze. Five mirrors, each a paint handler with one bug.
 * Fix the code (chips and choices), then click every visible target: each
 * click must land on the element you see. The pure rules (rules.ts,
 * levels.ts) decide where every click goes. A click that a ghost steals
 * counts as a mistake; the ghosts show themselves after your first click.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { LEVELS, registeredAt, targetAt, type Config, type Level } from './levels';
import { createBoard, type Board } from './trial-board';
import type { Point } from './rules';

const nameOf = (level: Level, id: string | null) =>
  id === null ? 'the canvas itself' : level.pieces.find((p) => p.id === id)?.label ?? id;

export const trial: Beat = (host, ctx) => {
  let mistakes = 0;
  let index = 0;
  let board: Board | null = null;
  const root = h('div', { class: 'maze-trial' });
  host.append(root);

  const mount = () => {
    board?.destroy();
    const level = LEVELS[index]!;
    const config: Config = { ...level.initial };
    const done = new Set<number>();
    let revealed = false;
    board = createBoard(level);
    const feedback = h('div', { class: 'maze-feedback', 'aria-live': 'polite' });
    const progress = h('p', { class: 'maze-progress' });
    const next = button({ label: index === LEVELS.length - 1 ? 'Leave the maze' : 'Next mirror', variant: 'primary', onClick: () => {
      if (index === LEVELS.length - 1) {
        ctx.say(mistakes === 0 ? 'Not one ghost click. The mirrors tell the truth now.' : 'Every mirror tells the truth now.');
        ctx.completeTrial({ mistakes, stamps: mistakes === 0 ? ['mirror-master'] : [] });
        return;
      }
      index += 1;
      mount();
    } });
    next.hidden = true;

    const render = () => {
      board!.render(config, revealed, done);
      progress.textContent = `Mirror ${index + 1} of ${LEVELS.length} · ${done.size} of ${level.targets.length} targets answered · ${mistakes} ghost ${mistakes === 1 ? 'click' : 'clicks'}`;
      fireButtons.forEach((b, i) => (b.dataset.done = String(done.has(i))));
    };
    const changed = () => {
      if (done.size) feedback.replaceChildren(callout({ kind: 'hint', body: 'The code changed, so every target must answer again.' }));
      done.clear();
      render();
    };

    const fire = (p: Point) => {
      if (!next.hidden) return;
      revealed = true;
      const aimed = targetAt(level, p);
      const got = registeredAt(level, config, p);
      if (aimed < 0) {
        board!.mark(p, false);
        feedback.replaceChildren(callout({ kind: 'info', body: got ? `That spot answers as “${nameOf(level, got)}”. Ghosts are now visible.` : 'Nothing there. The ghosts are now visible: dashed outlines, numbered from the top of the hit-test stack.' }));
        render();
        return;
      }
      const target = level.targets[aimed]!;
      const ok = got === target.expect;
      board!.mark(p, ok);
      if (ok) {
        done.add(aimed);
        feedback.replaceChildren(callout({ kind: 'success', body: `“${target.label}” answered.` }));
      } else {
        mistakes += 1;
        feedback.replaceChildren(callout({ kind: 'error', title: 'Ghost click', body: `You clicked “${target.label}”, but ${nameOf(level, got)} got it. Fix the code, then try again.` }));
        ctx.say('Your click went to my double. Mine now.', 'foe');
      }
      if (done.size === level.targets.length) {
        feedback.replaceChildren(callout({ kind: 'success', title: 'This mirror tells the truth', body: level.lesson }));
        next.hidden = false;
        next.focus();
        ctx.say('Every click landed where you aimed.');
      }
      render();
    };
    board.onPoint(fire);

    const fireButtons = level.targets.map((t) => button({ label: `Click “${t.label}”`, size: 'sm', onClick: () => fire(t.at) }));

    const code = h('div', { class: 'code-tree', role: 'group', 'aria-label': 'The paint code: toggle the parts' },
      ...level.code.map((line) => h('div', { class: `tree-line${line.indent ? ` indent-${line.indent}` : ''}` },
        ...line.tokens.map((token) => {
          if (typeof token === 'string') return h('code', {}, token);
          if ('chip' in token) {
            return createToggle({ kind: 'chip', label: token.label, checked: !!config[token.chip], onChange: (on) => {
              config[token.chip] = on;
              changed();
            } }).el;
          }
          return createSegmented<string>({ label: 'Pick a value', value: String(config[token.choice]), options: token.options.map((o) => ({ value: o.value, label: h('code', {}, o.label) })), onChange: (v) => {
            config[token.choice] = v;
            changed();
          } }).el;
        }))));

    root.replaceChildren(
      h('div', { class: 'maze-head' }, h('h3', { class: 'maze-title' }, level.title), progress),
      h('p', { class: 'maze-brief' }, level.brief),
      h('div', { class: 'maze-grid' },
        h('div', { class: 'maze-play' }, board.el,
          h('div', { class: 'maze-fire', role: 'group', 'aria-label': 'Click a target with the keyboard' }, ...fireButtons)),
        h('div', { class: 'maze-side' }, h('h4', { class: 'panel-title' }, 'The code'), code, feedback, next)));
    render();
  };

  mount();
  return () => {
    board?.destroy();
    root.remove();
  };
};
