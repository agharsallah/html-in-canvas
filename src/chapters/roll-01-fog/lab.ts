/**
 * Lab: the fog machine. Flip the canvas between fallback and drawable, mark
 * children drawable, and press Expose. In native mode every error you see is
 * thrown by the browser itself.
 */
import { createFogScene } from '../../scenes/fog-scene';
import { button } from '../../ui/components/button';
import { createObjectives } from '../../ui/components/objectives';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle, type Toggle } from '../../ui/components/toggle';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createLabCanvas, describeError, simulatedException } from '../shared/lab-canvas';
import { FOG_CARDS } from './diorama';
import { renderMarkup } from './markup';
import { describeState, drawError, type ContentMode, type ElementState } from './rules';

interface Child {
  label: string;
  el: HTMLElement;
  toggle: Toggle;
  status: HTMLElement;
  state: ElementState;
}

export const lab: Beat = (host, ctx) => {
  const lab = createLabCanvas(h('div'), ctx.caps, 'The fog machine canvas');
  let content: ContentMode = 'fallback';
  let exposing = false;
  let logNextPaint = false;

  const goals = createObjectives([
    { id: 'fallback-error', text: 'Press Expose while the canvas is `fallback`, and read the console.' },
    { id: 'missing-attr', text: 'Switch to `drawable`, then make one child throw by leaving it unmarked.' },
    { id: 'drawn', text: 'Get at least one child drawn onto the canvas.' },
  ], () => {
    ctx.completeLab();
    ctx.say('You have seen all three states: fog, error, print.');
  });

  const sceneHost = h('div', { class: 'view-scene' });
  const consoleLog = h('ol', { class: 'console', 'aria-live': 'polite', 'aria-label': 'Console' });
  const code = h('code');
  const log = (text: string) => {
    consoleLog.prepend(h('li', {}, text));
    while (consoleLog.children.length > 4) consoleLog.lastElementChild?.remove();
  };

  const make = (id: string, label: string, el: HTMLElement): Child => {
    el.id = `fog-${id}`;
    el.classList.add('fog-child');
    lab.adopt(el);
    const toggle = createToggle({
      kind: 'switch',
      label: h('span', {}, h('code', {}, label), ' is drawable'),
      onChange: (on) => {
        el.toggleAttribute('drawable', on);
        lab.simulateChange(el);
        refresh();
      },
    });
    return { label, el, toggle, status: h('span', { class: 'fog-status' }), state: 'fog' };
  };

  const children: Child[] = [
    make('title', '<h3>', h('h3', {}, 'Roses are red')),
    make('field', '<input>', h('input', { type: 'text', class: 'ui-field', value: 'violets are blue', 'aria-label': 'A line of the poem' })),
    make('note', '<p>', h('p', {}, 'Sugar is sweet, and so are you.')),
  ];

  const contentControl = createSegmented<ContentMode>({
    label: 'The canvas content attribute',
    value: 'fallback',
    options: [
      { value: 'fallback', label: h('code', {}, 'fallback') },
      { value: 'drawable', label: h('code', {}, 'drawable') },
    ],
    onChange: (mode) => {
      content = mode;
      lab.canvas.setAttribute('content', mode);
      lab.canvas.toggleAttribute('layoutsubtree', mode === 'drawable');
      children.forEach((c) => (c.state = 'fog'));
      lab.requestPaint();
      refresh();
    },
  });
  lab.canvas.setAttribute('content', 'fallback');
  lab.canvas.removeAttribute('layoutsubtree');

  const refresh = () => {
    for (const child of children) {
      if (child.state !== 'drawn' && child.state !== 'error') child.state = content === 'drawable' ? 'laid-out' : 'fog';
      child.status.textContent = describeState(child.state);
      child.status.dataset.state = child.state;
    }
    children.forEach((child, i) => scene.setState(i, child.state));
    lab.root.dataset.content = content;
    code.textContent = renderMarkup(content, children.map((c) => ({ tag: c.label, drawable: c.toggle.checked })));
  };

  lab.onPaint(() => {
    lab.beginFrame();
    if (!exposing) return;
    let y = 16;
    for (const child of children) {
      try {
        if (!lab.native) {
          const error = drawError(content, child.el.hasAttribute('drawable'));
          if (error) throw simulatedException(error.replace(/^Exception: /, ''));
        }
        lab.drawElement(child.el, 16, y);
        child.state = 'drawn';
        goals.complete('drawn');
      } catch (error) {
        child.state = 'error';
        if (logNextPaint) log(`drawElementImage(#${child.el.id}) → ${describeError(error)}`);
        goals.complete(content === 'fallback' ? 'fallback-error' : 'missing-attr');
        if (content === 'drawable') ctx.stamp('fog-walker');
      }
      y += Math.max(child.el.offsetHeight, 32) + 14;
    }
    logNextPaint = false;
    refresh();
  });

  const expose = button({ label: 'Expose', variant: 'primary', onClick: () => {
    exposing = true;
    logNextPaint = true;
    children.forEach((child) => (child.state = 'fog'));
    lab.requestPaint();
    ctx.say(content === 'fallback'
      ? 'Exposing while the canvas is in fallback mode. Watch the console.'
      : 'Lamp on. Only drawable children will survive.');
  } });
  const clear = button({ label: 'Clear the print', variant: 'ghost', onClick: () => {
    exposing = false;
    children.forEach((child) => (child.state = 'fog'));
    consoleLog.replaceChildren();
    lab.requestPaint();
    refresh();
  } });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'fog-lab' },
      h('div', { class: 'panel fog-controls' },
        h('h3', { class: 'panel-title' }, 'The canvas'),
        h('p', { class: 'panel-help' }, h('code', {}, 'content'), ' decides if children get laid out.'),
        contentControl.el,
        h('h3', { class: 'panel-title' }, 'Its children'),
        ...children.map((child) => h('div', { class: 'fog-row' }, child.toggle.el, child.status)),
        h('div', { class: 'panel-actions' }, expose, clear)),
      h('div', { class: 'fog-stage' },
        h('div', { class: 'fog-views' },
          h('figure', { class: 'view' }, sceneHost, h('figcaption', {}, 'What the browser sees')),
          h('figure', { class: 'view' }, lab.root, h('figcaption', {}, 'What your canvas shows'))),
        consoleLog, h('pre', { class: 'code' }, code))),
    goals.el));

  const scene = createFogScene(sceneHost, FOG_CARDS, ctx.roll.process);
  refresh();
  lab.requestPaint();
  return () => {
    scene.destroy();
    lab.destroy();
  };
};
