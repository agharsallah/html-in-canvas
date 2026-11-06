/**
 * Safe key/value persistence. localStorage can be missing or throw (private
 * windows, blocked site data), so every access is guarded and the app keeps
 * working in memory.
 */
export interface KeyValueStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export function createBrowserStore(): KeyValueStore {
  const memory = new Map<string, string>();
  const ls = (): Storage | null => {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  };
  return {
    read(key) {
      try {
        return ls()?.getItem(key) ?? memory.get(key) ?? null;
      } catch {
        return memory.get(key) ?? null;
      }
    },
    write(key, value) {
      memory.set(key, value);
      try {
        ls()?.setItem(key, value);
      } catch {
        /* quota or privacy mode: memory copy is enough */
      }
    },
    remove(key) {
      memory.delete(key);
      try {
        ls()?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export function createMemoryStore(seed: Record<string, string> = {}): KeyValueStore {
  const memory = new Map(Object.entries(seed));
  return {
    read: (key) => memory.get(key) ?? null,
    write: (key, value) => void memory.set(key, value),
    remove: (key) => void memory.delete(key),
  };
}
