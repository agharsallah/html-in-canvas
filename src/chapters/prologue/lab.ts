/**
 * Lab: two shop signs. The left is painted with fillText. The right is a real
 * HTML element drawn with drawElementImage. Try to select, focus, and type.
 */
import { observeCanvasSize } from '../../hic/canvas-sizing';
import { createDial } from '../../ui/components/dial';
import { createObjectives } from '../../ui/components/objectives';
import { h } from '../../ui/dom';
import type { Beat } from '../shared/chapter';
import { createLabCanvas } from '../shared/lab-canvas';
import { sfx } from '../../ui/fx/lab-sfx';

const SIGN_TEXT = ['Fresh prints daily', 'Impresiones frescas', 'ताज़ा प्रिंट रोज़', 'مطبوعات طازجة'];

export const lab: Beat = (host, ctx) => {
  const goals = createObjectives([
    { id: 'pixels', text: 'Try to select a word on the painted sign.' },
    { id: 'select', text: 'Select a word on the HTML sign.' },
    { id: 'focus', text: 'Click the name field on the HTML sign and type.' },
  ], () => {
    ctx.completeLab();
    ctx.say('Same words, two worlds. Only one of them is still text.');
  });

  // Left: pixels.
  const painted = h('canvas', { class: 'prologue-painted', 'aria-label': 'A sign painted with fillText' });
  const stopPainted = observeCanvasSize(painted, ({ scale }) => {
    const c = painted.getContext('2d')!;
    c.reset();
    c.scale(scale, scale);
    c.fillStyle = '#1d2126';
    c.font = '600 22px "Bodoni Moda", serif';
    SIGN_TEXT.forEach((line, i) => c.fillText(line, 20, 44 + i * 34));
  });
  painted.addEventListener('pointerup', () => {
    sfx('smudge');
    ctx.say('Nothing to select. That sign is paint, not text.');
    goals.complete('pixels');
  });

  // Right: HTML drawn into canvas.
  const right = h('div', { class: 'prologue-right' });
  const name = h('input', { type: 'text', class: 'ui-field', placeholder: 'Your name', 'aria-label': 'Your name' });
  const sign = h('div', { class: 'prologue-sign', drawable: true },
    ...SIGN_TEXT.map((line, i) => h('p', { lang: ['en', 'es', 'hi', 'ar'][i]!, dir: i === 3 ? 'rtl' : 'auto' }, line)),
    h('label', {}, 'Signed by ', name));

  let rotation = -1.5;
  const dial = createDial({
    label: 'Rotate the HTML sign', min: -30, max: 30, value: rotation, unit: '°',
    onInput: (value) => {
      rotation = value;
      lab.requestPaint();
      ctx.say('Rotated, and still text. Try selecting a word now.');
    },
  });

  host.append(h('div', { class: 'lab-layout' },
    h('div', { class: 'prologue-lab' },
      h('figure', {}, painted, h('figcaption', {}, 'Painted with fillText')),
      h('figure', {}, right, h('figcaption', {}, 'Drawn with drawElementImage')),
      h('div', { class: 'prologue-dial' }, dial.el,
        h('p', { class: 'panel-help' }, 'Turn the dial: the canvas rotates the drawing, and the sign stays real, selectable HTML.'))),
    goals.el));

  const lab = createLabCanvas(right, ctx.caps, 'A sign drawn from HTML');
  lab.adopt(sign);
  const stopPaint = lab.onPaint(() => {
    lab.beginFrame();
    lab.drawElement(sign, 40, 30, { rotate: rotation });
  });
  lab.requestPaint();

  const onSelection = () => {
    const selection = document.getSelection();
    if (selection && !selection.isCollapsed && sign.contains(selection.anchorNode)) {
      if (!goals.isDone('select')) sfx('reveal');
      goals.complete('select');
    }
  };
  document.addEventListener('selectionchange', onSelection);
  name.addEventListener('input', () => {
    goals.complete('focus');
    lab.simulateChange(sign);
    if (lab.native) ctx.collect('secret-caret');
  });

  return () => {
    document.removeEventListener('selectionchange', onSelection);
    stopPaint();
    stopPainted();
    lab.destroy();
  };
};
