/**
 * Drafts keep your code per exercise across visits, survive bad storage,
 * and are written in one debounced batch, not on every keystroke.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyValueStore } from '../src/core/storage';
import { createDrafts } from '../src/game/drafts';

function memoryKv(initial: Record<string, string> = {}): KeyValueStore & { writes: number; data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    writes: 0,
    read: (k) => data.get(k) ?? null,
    write(k, v) {
      this.writes += 1;
      data.set(k, v);
    },
    remove: (k) => void data.delete(k),
  };
}

describe('drafts', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('come back in a new session', () => {
    const kv = memoryKv();
    createDrafts(kv).set('fog-opt-in', '<canvas content="drawable">');
    vi.runAllTimers();
    expect(createDrafts(kv).get('fog-opt-in')).toBe('<canvas content="drawable">');
  });

  it('batch a burst of keystrokes into one write', () => {
    const kv = memoryKv();
    const drafts = createDrafts(kv);
    for (const code of ['c', 'ca', 'can', 'canv', 'canva', 'canvas']) drafts.set('ex', code);
    expect(kv.writes).toBe(0);
    vi.runAllTimers();
    expect(kv.writes).toBe(1);
  });

  it('flush writes right away, and clear forgets everything', () => {
    const kv = memoryKv();
    const drafts = createDrafts(kv);
    drafts.set('a', '1');
    drafts.flush();
    expect(createDrafts(kv).get('a')).toBe('1');
    drafts.clear();
    expect(createDrafts(kv).get('a')).toBeUndefined();
  });

  it('ignore corrupt or foreign data', () => {
    expect(createDrafts(memoryKv({ 'drawable:drafts:v1': 'not json' })).get('a')).toBeUndefined();
    const mixed = createDrafts(memoryKv({ 'drawable:drafts:v1': JSON.stringify({ a: 'ok', b: 42 }) }));
    expect(mixed.get('a')).toBe('ok');
    expect(mixed.get('b')).toBeUndefined();
  });
});
