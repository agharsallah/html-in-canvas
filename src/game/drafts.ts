/**
 * Exercise drafts: the code you typed, per exercise, kept across tabs,
 * frames and visits. Separate from the game state on purpose: drafts change
 * on every keystroke, and the game state re-renders the darkroom when it
 * changes. Writes are debounced and flushed when the page is hidden.
 */
import { createBrowserStore, type KeyValueStore } from '../core/storage';

const KEY = 'drawable:drafts:v1';
const WRITE_DELAY_MS = 300;

export interface Drafts {
  get(id: string): string | undefined;
  set(id: string, code: string): void;
  delete(id: string): void;
  clear(): void;
  /** Write pending changes now. */
  flush(): void;
}

export function createDrafts(kv: KeyValueStore): Drafts {
  const all = load(kv);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    kv.write(KEY, JSON.stringify(all));
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, WRITE_DELAY_MS);
  };
  return {
    get: (id) => all[id],
    set(id, code) {
      if (all[id] === code) return;
      all[id] = code;
      schedule();
    },
    delete(id) {
      delete all[id];
      schedule();
    },
    clear() {
      for (const id of Object.keys(all)) delete all[id];
      flush();
    },
    flush,
  };
}

function load(kv: KeyValueStore): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(kv.read(KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
}

/** The app's drafts, in this browser. */
export const drafts = createDrafts(createBrowserStore());
if (typeof addEventListener === 'function') addEventListener('pagehide', () => drafts.flush());
