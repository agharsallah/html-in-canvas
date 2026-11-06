/**
 * The journey: one "roll of film" per chapter, in prerequisite order.
 *
 * Every roll is printed with a different historical photographic process.
 * That process is the chapter's visual identity (palette, texture, motion),
 * so no two chapters are reskins of each other.
 */
import type { ChapterModule } from '../chapters/shared/chapter';

export type RollId =
  | 'prologue'
  | 'fog'
  | 'bells'
  | 'lens'
  | 'projector'
  | 'mirrors'
  | 'observatory'
  | 'foundry'
  | 'railway'
  | 'lighthouse'
  | 'vault'
  | 'clockwork'
  | 'epilogue';

export interface PrintProcess {
  /** Name of the photographic process the chapter is printed with. */
  name: string;
  paper: string;
  ink: string;
  accent: string;
  /** Glow used for the chapter's light source / highlights. */
  glow: string;
  /** Second accent: duotone partner for gradients, 3D rim light and charts. */
  second: string;
}

export interface Roll {
  id: RollId;
  /** Film-edge frame label printed on the hub. */
  frame: string;
  title: string;
  /** Who or what you face in this chapter. */
  foe: string;
  /** One sentence shown on the hanging print. */
  logline: string;
  /** APIs and ideas covered, shown on the print once developed. */
  concepts: string[];
  process: PrintProcess;
  /** Lazily loads the playable chapter. Absent = sealed (not built yet). */
  load?: () => Promise<{ default: ChapterModule }>;
}

export const ROLLS: readonly Roll[] = [
  {
    id: 'prologue',
    frame: '00',
    title: 'The blank canvas',
    foe: 'The Smudge',
    logline: 'A kingdom of pixels that cannot be read, selected, or translated.',
    concepts: ['Why HTML-in-Canvas', 'Use cases'],
    process: { name: 'Digital proof', paper: '#f4f6ff', ink: '#141a3a', accent: '#2b59ff', glow: '#9fb6ff', second: '#ff3df2' },
    load: () => import('../chapters/prologue'),
  },
  {
    id: 'fog',
    frame: '01',
    title: 'The fallback fog',
    foe: 'The Fog',
    logline: 'Call the elements out of the fog and give them a place to stand.',
    concepts: ['content="drawable"', 'drawable', 'Nested drawables'],
    process: { name: 'Platinum print', paper: '#e9ebf3', ink: '#23263a', accent: '#6b5cff', glow: '#bfe9ff', second: '#14b8a6' },
    load: () => import('../chapters/roll-01-fog'),
  },
  {
    id: 'bells',
    frame: '02',
    title: 'The bell tower',
    foe: 'The Restless Bell',
    logline: 'Every rendering update rings a bell. Learn when it rings, and why.',
    concepts: ['paint event', 'changedElements', 'requestPaint()'],
    process: { name: 'Sepia toning', paper: '#f7e9d2', ink: '#3d2414', accent: '#c4501d', glow: '#ffc65c', second: '#11907a' },
    load: () => import('../chapters/roll-02-bells'),
  },
  {
    id: 'lens',
    frame: '03',
    title: 'The lens grinder',
    foe: 'Blur',
    logline: 'Grind the canvas grid until every glyph is razor sharp.',
    concepts: ['device-pixel-content-box', 'devicePixelRatio', 'getElementImageDefaultSize()'],
    process: { name: 'Daguerreotype', paper: '#dfe3e8', ink: '#1f252b', accent: '#4f7cac', glow: '#f2f5f8', second: '#c9a227' },
    load: () => import('../chapters/roll-03-lens'),
  },
  {
    id: 'projector',
    frame: '04',
    title: 'The projector hall',
    foe: 'The Crooked Reel',
    logline: 'Project an element anywhere: crop it, scale it, spin it.',
    concepts: ['drawElementImage()', 'Source and destination rects'],
    process: { name: 'Three-strip colour', paper: '#fbf0e2', ink: '#2c1f2e', accent: '#e0263f', glow: '#ffd25e', second: '#1d6fd8' },
    load: () => import('../chapters/roll-04-projector'),
  },
  {
    id: 'mirrors',
    frame: '05',
    title: 'The mirror maze',
    foe: 'Ghost Clicks',
    logline: 'What you see and what you click must be the same place.',
    concepts: ['updateElementGeometry()', 'canvasTransform', 'canvasClip', 'Hit-test order'],
    process: { name: 'Tintype', paper: '#2d2a27', ink: '#f1e9db', accent: '#d8a657', glow: '#f0d9a8', second: '#7fb3d5' },
    load: () => import('../chapters/roll-05-mirrors'),
  },
  {
    id: 'observatory',
    frame: '06',
    title: 'The orbit observatory',
    foe: 'The Flat Earth Society',
    logline: 'Wrap a living form around a spinning world.',
    concepts: ['texElementSubImage2D()', '3D hit testing'],
    process: { name: 'Cyanotype', paper: '#1d4f95', ink: '#f1f6fd', accent: '#8ec5ff', glow: '#cfe6ff', second: '#ffd166' },
    load: () => import('../chapters/roll-06-observatory'),
  },
  {
    id: 'foundry',
    frame: '07',
    title: 'The GPU foundry',
    foe: 'The Melt',
    logline: 'Pour HTML into molten shaders without losing a word.',
    concepts: ['drawElementImageToTexture()', 'Shaders over HTML'],
    process: { name: 'Lith print', paper: '#f7dcb9', ink: '#3b1607', accent: '#ff5a1f', glow: '#ffb067', second: '#7a1fff' },
    load: () => import('../chapters/roll-07-foundry'),
  },
  {
    id: 'railway',
    frame: '08',
    title: 'The worker railway',
    foe: 'The Late Train',
    logline: 'Ship snapshots to a worker and bring their geometry home.',
    concepts: ['OffscreenCanvas', 'captureElementImage()', 'elementgeometryupdate'],
    process: { name: 'Instant film', paper: '#fbfbf7', ink: '#202124', accent: '#2f8f6b', glow: '#f7d046', second: '#ef476f' },
    load: () => import('../chapters/roll-08-railway'),
  },
  {
    id: 'lighthouse',
    frame: '09',
    title: 'The lighthouse of voices',
    foe: 'Silence',
    logline: 'Make the canvas speak to everyone, not only to eyes.',
    concepts: ['Accessibility tree', 'inert', 'Focus rings', 'drawFocusIfNeeded()'],
    process: { name: 'Salt print', paper: '#f2e4cf', ink: '#4a2c1e', accent: '#1f7a9c', glow: '#ffe9a6', second: '#e76f51' },
    load: () => import('../chapters/roll-09-lighthouse'),
  },
  {
    id: 'vault',
    frame: '10',
    title: 'The vault',
    foe: 'The Leak',
    logline: 'Some pixels must never be read back. Guard them.',
    concepts: ['Read-back-allowed rendering', 'Sensitive information'],
    process: { name: 'Redacted photocopy', paper: '#f4f4ee', ink: '#121212', accent: '#1d1d1d', glow: '#e9ff70', second: '#ff2e63' },
    load: () => import('../chapters/roll-10-vault'),
  },
  {
    id: 'clockwork',
    frame: '11',
    title: 'The clockwork heart',
    foe: 'The Deadlock',
    logline: 'Open the rendering update and see why paint fires where it does.',
    concepts: ['Update the rendering', 'Paint timing options A, B, C'],
    process: { name: 'Albumen print', paper: '#f2e2c4', ink: '#41281b', accent: '#b0602c', glow: '#ffd9a0', second: '#2a9d8f' },
    load: () => import('../chapters/roll-11-clockwork'),
  },
  {
    id: 'epilogue',
    frame: '12',
    title: 'The endless reel',
    foe: 'The future',
    logline: 'An auto-updating canvas, and your own exhibition.',
    concepts: ['Auto-updating canvas', 'Threaded effects'],
    process: { name: 'Hologram', paper: '#ecefff', ink: '#1b1e2b', accent: '#7b61ff', glow: '#7ff3e1', second: '#ff6ec7' },
    load: () => import('../chapters/roll-12-epilogue'),
  },
];

export function getRoll(id: string): Roll | undefined {
  return ROLLS.find((roll) => roll.id === id);
}

export function rollIndex(id: RollId): number {
  return ROLLS.findIndex((roll) => roll.id === id);
}

export function nextRoll(id: RollId): Roll | undefined {
  return ROLLS[rollIndex(id) + 1];
}
