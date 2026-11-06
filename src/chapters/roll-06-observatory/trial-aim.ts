/**
 * Trial phase 2: orbit aim. A mission card hangs at a new tilt each round.
 * Click the named button where it is drawn. The Flat Earth Society overlays
 * its flat box with dashed buttons where it insists they are. Clicks are
 * scored with `hitThrough`: the same inverse the browser applies to the
 * projective canvasTransform.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { elementToCanvasMatrix, projectElementPoint, type Matrix16 } from '../../hic/projective-geometry';
import { MiniStage } from '../../scenes/mini-stage';
import { s } from '../../ui/charts/svg';
import { h } from '../../ui/dom';
import { flatMatrix, hitThrough, type ControlBox } from './rules';

export const AIM_ELEMENT = { width: 320, height: 200 };
export const AIM_CONTROLS: readonly ControlBox[] = [
  { id: 'port', label: 'Port', x: 16, y: 64, width: 136, height: 56 },
  { id: 'starboard', label: 'Starboard', x: 168, y: 64, width: 136, height: 56 },
  { id: 'launch', label: 'Launch', x: 16, y: 130, width: 136, height: 56 },
  { id: 'abort', label: 'Abort', x: 168, y: 130, width: 136, height: 56 },
];
const ROUNDS = [
  { rx: 0, ry: 0.55, rz: 0, x: 0, target: 'launch' },
  { rx: -0.55, ry: -0.45, rz: 0.12, x: 0, target: 'abort' },
  { rx: 0.35, ry: 0.95, rz: -0.15, x: 0.25, target: 'starboard' },
  { rx: 0.75, ry: 0.1, rz: 0.3, x: 0, target: 'port' },
  { rx: -0.3, ry: -1.0, rz: 0, x: -0.2, target: 'launch' },
];
const PLANE = { width: 1.6, height: 1.0 };

export interface AimPhase {
  colors: { accent: string; second: string; ink: string };
  onPass(mistakes: number): void;
  say(text: string, foe?: boolean): void;
}

export function mountAim(host: HTMLElement, phase: AimPhase): () => void {
  let round = 0;
  let mistakes = 0;
  const prompt = h('p', { class: 'obs-aim-prompt' });
  const result = h('p', { class: 'obs-aim-result', 'aria-live': 'polite' });
  const stageHost = h('div', { class: 'obs-aim-stage' });
  host.append(h('div', { class: 'obs-aim' }, prompt, stageHost, result));

  const stage = new MiniStage(stageHost, { label: 'A tilted mission card with four buttons', className: 'scene-aim' });
  stage.canvas.removeAttribute('role');
  stage.canvas.setAttribute('aria-hidden', 'true');
  stage.camera.position.set(0, 0, 2.9);
  const texture = cardTexture(phase.colors);
  const card = new Mesh(new PlaneGeometry(PLANE.width, PLANE.height), new MeshBasicMaterial({ map: texture, toneMapped: false }));
  stage.scene.add(card);

  const ghost = s('g', { class: 'obs-ghost' });
  const cross = s('g', { class: 'obs-cross' }, s('circle', { r: 9 }), s('line', { x1: -14, x2: 14 }), s('line', { y1: -14, y2: 14 }));
  const overlay = s('svg', { class: 'sat-overlay', 'aria-hidden': 'true' }, ghost, cross);
  const aim = { x: -1, y: -1 };
  cross.setAttribute('transform', 'translate(-100 -100)');
  const placeCross = () => cross.setAttribute('transform', `translate(${aim.x} ${aim.y})`);
  stage.el.append(overlay);

  const matrix = (): Matrix16 => {
    card.updateMatrixWorld();
    return elementToCanvasMatrix({
      objectMatrixWorld: card.matrixWorld, camera: stage.camera, plane: PLANE, element: AIM_ELEMENT,
      viewport: { width: stage.canvas.clientWidth, height: stage.canvas.clientHeight },
    });
  };

  const drawGhost = () => {
    const flat = flatMatrix(matrix(), AIM_ELEMENT);
    overlay.setAttribute('viewBox', `0 0 ${stage.canvas.clientWidth} ${stage.canvas.clientHeight}`);
    ghost.replaceChildren(...AIM_CONTROLS.map((c) => {
      const a = projectElementPoint(flat, c.x, c.y);
      const b = projectElementPoint(flat, c.x + c.width, c.y + c.height);
      return s('rect', { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y, rx: 4 });
    }));
  };

  const pose = () => {
    const r = ROUNDS[round]!;
    card.rotation.set(r.rx, r.ry, r.rz);
    card.position.x = r.x;
    const label = AIM_CONTROLS.find((c) => c.id === r.target)!.label;
    prompt.replaceChildren(`Round ${round + 1} of ${ROUNDS.length}: click `, h('strong', {}, label), ' where it is drawn.');
    stage.invalidate();
  };

  stage.onFrame(() => {
    drawGhost();
    return false;
  });

  const fire = (x: number, y: number) => {
    if (round >= ROUNDS.length) return;
    aim.x = x;
    aim.y = y;
    placeCross();
    const hit = hitThrough(matrix(), AIM_ELEMENT, AIM_CONTROLS, x, y);
    const want = ROUNDS[round]!.target;
    const where = hit.point ? `(${Math.round(hit.point.u)}, ${Math.round(hit.point.v)}) in the card` : 'off the card';
    const name = AIM_CONTROLS.find((c) => c.id === hit.target)?.label ?? (hit.target === 'card' ? 'the card itself' : 'empty space');
    if (hit.target === want) {
      result.textContent = `Hit: your click maps to ${where}, inside ${name}.`;
      round += 1;
      if (round < ROUNDS.length) pose();
      else {
        prompt.textContent = 'Every launch landed.';
        phase.onPass(mistakes);
      }
      return;
    }
    mistakes += 1;
    result.textContent = `Missed: your click maps to ${where}, which is ${name}.`;
    phase.say(hit.target === 'space' ? 'Off the edge of the world!' : 'Wrong button. Trust our flat box next time.', true);
  };
  const onClick = (event: PointerEvent) => {
    const rect = stage.canvas.getBoundingClientRect();
    fire(event.clientX - rect.left, event.clientY - rect.top);
  };
  // Keyboard: arrows move the crosshair (Shift for bigger steps), Enter fires.
  const onKey = (event: KeyboardEvent) => {
    if (aim.x < 0) Object.assign(aim, { x: stage.canvas.clientWidth / 2, y: stage.canvas.clientHeight / 2 });
    const step = event.shiftKey ? 24 : 6;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      aim.x = Math.max(0, Math.min(stage.canvas.clientWidth, aim.x + move[0]));
      aim.y = Math.max(0, Math.min(stage.canvas.clientHeight, aim.y + move[1]));
      placeCross();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fire(aim.x, aim.y);
    }
  };
  stageHost.tabIndex = 0;
  stageHost.setAttribute('role', 'group');
  stageHost.setAttribute('aria-label', 'Aim. Click the button, or move the crosshair with the arrow keys and press Enter.');
  stage.canvas.addEventListener('pointerdown', onClick);
  stageHost.addEventListener('keydown', onKey);
  pose();

  return () => {
    stage.canvas.removeEventListener('pointerdown', onClick);
    stageHost.removeEventListener('keydown', onKey);
    texture.dispose();
    stage.destroy();
  };
}

function cardTexture(colors: AimPhase['colors']): CanvasTexture {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = AIM_ELEMENT.width * scale;
  canvas.height = AIM_ELEMENT.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f4f8ff';
  ctx.fillRect(0, 0, AIM_ELEMENT.width, AIM_ELEMENT.height);
  ctx.fillStyle = '#123b73';
  ctx.fillRect(0, 0, AIM_ELEMENT.width, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px "Bodoni Moda", serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mission control', 16, 25);
  ctx.font = '700 17px "Atkinson Hyperlegible Next", sans-serif';
  ctx.textAlign = 'center';
  for (const c of AIM_CONTROLS) {
    ctx.fillStyle = c.id === 'abort' ? colors.accent : c.id === 'launch' ? colors.second : '#dbe8fb';
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.width, c.height, 8);
    ctx.fill();
    ctx.strokeStyle = '#123b73';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0d2c57';
    ctx.fillText(c.label, c.x + c.width / 2, c.y + c.height / 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
