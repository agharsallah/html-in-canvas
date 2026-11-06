/**
 * Hash routes:
 *   #/                       the darkroom (hub)
 *   #/roll/<id>              a roll, starting at its first unfinished frame
 *   #/roll/<id>/<frame>      a specific frame: story | lab | practice | trial
 */
import type { FrameId } from '../game/state';
import { getRoll, type RollId } from '../story/rolls';

export type Route = { name: 'hub' } | { name: 'roll'; roll: RollId; frame?: FrameId };

const FRAME_IDS: readonly string[] = ['story', 'lab', 'practice', 'trial'];

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'roll' && parts[1] && getRoll(parts[1])) {
    const frame = parts[2] && FRAME_IDS.includes(parts[2]) ? (parts[2] as FrameId) : undefined;
    return { name: 'roll', roll: parts[1] as RollId, ...(frame ? { frame } : {}) };
  }
  return { name: 'hub' };
}

export function formatRoute(route: Route): string {
  if (route.name === 'hub') return '#/';
  return `#/roll/${route.roll}${route.frame ? `/${route.frame}` : ''}`;
}

export function onRouteChange(listener: (route: Route) => void): () => void {
  const handler = () => listener(parseRoute(location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

export function navigate(route: Route): void {
  const hash = formatRoute(route);
  if (location.hash !== hash) location.hash = hash;
}
