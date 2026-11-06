/**
 * The three timetables of the dispatch trial. Fixed signs are listed in
 * order; the tray holds every operation you may place (decoys included:
 * a decoy is only wrong because of where the rules say it lands).
 */
import type { Token, TokenOp } from './rules';

export interface Level {
  id: string;
  title: string;
  brief: string;
  skeleton: Token[];
  tray: Token[];
}

const sign = (op: TokenOp, n?: number, k = 0): Token => ({ id: `${op}${n ?? ''}${k ? `-${k}` : ''}`, op, n, fixed: true });
const t = (op: TokenOp, n?: number): Token => ({ id: `${op}${n ?? ''}`, op, n });
const frames = (ns: number[], ops: TokenOp[]) => ns.flatMap((n) => ops.map((op) => t(op, n)));

export const LEVELS: Level[] = [
  {
    id: 'first-run',
    title: 'First run',
    brief: 'One paint, one train. Hand the worker its canvas, ship the snapshot, draw it, close it, and read the form’s position once its geometry is home.',
    skeleton: [sign('paint', 1), sign('worker-free')],
    tray: [t('read'), t('close', 1), t('transfer'), t('draw', 1), t('trap-worker-paint'), t('send', 1), t('geometry'), t('capture', 1)],
  },
  {
    id: 'rush-hour',
    title: 'Rush hour',
    brief: 'The worker is busy through two paints, so two images wait for it. Ship both, but show only the freshest. Leave nothing in the yard.',
    skeleton: [sign('paint', 1), sign('paint', 2), sign('worker-free')],
    tray: [
      t('send', 2), t('draw', 1), t('capture', 1), t('close', 2), t('transfer'), t('geometry'),
      t('trap-worker-element'), t('capture', 2), t('read'), t('draw', 2), t('send', 1), t('close', 1),
    ],
  },
  {
    id: 'long-haul',
    title: 'The long haul',
    brief: 'Three paints and two worker breaks. Keep every train on time, close every image, and only then read the geometry.',
    skeleton: [sign('paint', 1), sign('worker-free', undefined, 1), sign('paint', 2), sign('paint', 3), sign('worker-free', undefined, 2)],
    tray: [
      ...frames([3, 1, 2], ['close', 'capture', 'draw', 'send']),
      t('trap-worker-paint'), t('read'), t('transfer'), t('trap-worker-element'), t('geometry'),
    ],
  },
];
