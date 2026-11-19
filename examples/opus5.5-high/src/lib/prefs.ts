/**
 * Two user preferences the whole page reacts to: theme and motion.
 * Both start from the system setting, can be overridden from the nav, and
 * persist when storage is available.
 */
import { readPalette } from './palette';

type Listener = () => void;
const listeners = new Set<Listener>();
const store = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string | null): void {
    try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* private mode */ }
  },
};

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const forcedQuery = matchMedia('(forced-colors: active)');

export const prefs = {
  get theme(): 'light' | 'dark' {
    const saved = store.get('kiosk-theme');
    return saved === 'light' || saved === 'dark' ? saved : darkQuery.matches ? 'dark' : 'light';
  },
  get reducedMotion(): boolean {
    const saved = store.get('kiosk-motion');
    return saved ? saved === 'reduce' : motionQuery.matches;
  },
  get forcedColors(): boolean {
    return forcedQuery.matches;
  },
  setTheme(theme: 'light' | 'dark'): void {
    store.set('kiosk-theme', theme);
    apply();
  },
  setReducedMotion(reduce: boolean): void {
    store.set('kiosk-motion', reduce ? 'reduce' : 'full');
    apply();
  },
  /** Called on any theme or motion change (after the DOM is updated). */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function apply(): void {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.motion = prefs.reducedMotion ? 'reduce' : 'full';
  readPalette();
  listeners.forEach((fn) => fn());
}

for (const q of [darkQuery, motionQuery, forcedQuery]) q.addEventListener('change', apply);
