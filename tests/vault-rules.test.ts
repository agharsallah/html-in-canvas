/**
 * The vault's rules, pinned to the explainer's own text: every scored item
 * must sit in the right README list, and open items are never scored.
 */
import { describe, expect, it } from 'vitest';
import { MAX_STRIKES, newDeck, playCard, shuffled } from '../src/chapters/roll-10-vault/deck';
import {
  channelOf, DISCUSS_IDS, heistOutcome, HEISTS, itemById, judgeHeist, leakLevel, listDifferences,
  scoreSort, SORT_IDS, spyReads, VAULT_ITEMS,
} from '../src/chapters/roll-10-vault/rules';
import { tallyLinkPixels, UNVISITED_RGB, VISITED_RGB } from '../src/chapters/roll-10-vault/spy';
import readme from '../docs-llm/git-official-docs/README.md?raw';
import questionnaire from '../docs-llm/git-official-docs/security-privacy-questionnaire.md?raw';

const section = readme.slice(readme.indexOf('## Read-back-allowed rendering'), readme.indexOf('## Accessibility'));
const sensitiveList = section.slice(section.indexOf('Sensitive information includes'), section.indexOf('not considered sensitive'));
const safeList = section.slice(section.indexOf('not considered sensitive'));

// The phrase each README-backed item is pinned to.
const PHRASE: Record<string, [string, 'sensitive' | 'safe' | 'accessibility']> = {
  'xo-img': ['Cross-origin data in', 'sensitive'],
  'xo-url': ['background-image', 'sensitive'],
  'xo-iframe-in-same': ['cross-origin content in them would not', 'sensitive'],
  visited: ['Visited link information', 'sensitive'],
  spelling: ['Spelling and grammar markers', 'sensitive'],
  autofill: ['Pending form autofill information', 'sensitive'],
  'system-colors': ['System colors, themes, or preferences', 'sensitive'],
  'subpixel-aa': ['Subpixel text anti-aliasing', 'sensitive'],
  captions: ['Captions and video controls', 'sensitive'],
  ime: ['IME pop-ups', 'sensitive'],
  caret: ['Caret blink rate', 'safe'],
  find: ['Search text (find-in-page)', 'safe'],
  scrollbar: ['Scrollbar and form element appearance', 'safe'],
  'form-control': ['Scrollbar and form element appearance', 'safe'],
  'text-fragment': ['text-fragment', 'safe'],
  'same-origin-iframe': ['same-origin iframes would still paint', 'sensitive'],
  'focus-ring': ['accessibility indicators such as focus or carets will be rendered', 'accessibility'],
};

describe('vault items are pinned to the README', () => {
  it.each(Object.entries(PHRASE))('%s sits in the right list', (id, [phrase, where]) => {
    const item = itemById(id)!;
    expect(item).toBeDefined();
    if (where === 'accessibility') expect(readme).toContain(phrase);
    else expect(where === 'sensitive' ? sensitiveList : safeList).toContain(phrase);
    const expected = where === 'safe' || where === 'accessibility' || id === 'same-origin-iframe' ? 'painted' : 'never';
    expect(item.status).toBe(expected);
  });

  it('pins every scored item that cites the README', () => {
    const cited = VAULT_ITEMS.filter((item) => item.status !== 'open' && item.readme);
    cited.forEach((item) => expect(PHRASE[item.id], item.id).toBeDefined());
  });

  it('only scores text selection on the questionnaire’s word', () => {
    expect(questionnaire).toContain('text selection');
    expect(readme).not.toContain('text selection');
    expect(itemById('text-selection')!.questionnaire).toBeDefined();
  });

  it('marks the forced-colors boundary as open', () => {
    expect(safeList).toContain('forced-colors');
    expect(itemById('forced-colors')!.status).toBe('open');
  });

  it('lists exactly the README and questionnaire differences', () => {
    expect(listDifferences().map((i) => i.id)).toEqual(expect.arrayContaining(['text-fragment', 'text-selection']));
    expect(questionnaire).not.toContain('text-fragment');
  });
});

describe('the sort', () => {
  const perfect = Object.fromEntries(SORT_IDS.map((id) => [id, itemById(id)!.status as 'never' | 'painted']));

  it('sorts at least twelve unambiguous items and never scores open ones', () => {
    expect(SORT_IDS.length).toBeGreaterThanOrEqual(12);
    SORT_IDS.forEach((id) => expect(itemById(id)!.status).not.toBe('open'));
    DISCUSS_IDS.forEach((id) => expect(itemById(id)!.status).toBe('open'));
  });

  it('passes a perfect sort and fails a single swap', () => {
    expect(scoreSort(perfect).solved).toBe(true);
    const swapped = { ...perfect, caret: 'never' as const };
    const score = scoreSort(swapped);
    expect(score.solved).toBe(false);
    expect(score.wrong).toEqual(['caret']);
  });

  it('ignores open items whatever the learner says', () => {
    const score = scoreSort({ ...perfect, 'forced-colors': 'never' }, [...SORT_IDS, ...DISCUSS_IDS]);
    expect(score.solved).toBe(true);
    expect(score.ignored).toEqual(['forced-colors']);
  });

  it('fails an incomplete sort', () => {
    expect(scoreSort({ visited: 'never' }).solved).toBe(false);
  });
});

describe('the copier deck', () => {
  it('requeues wrong cards and is cleared by right ones', () => {
    let deck = newDeck(['visited', 'caret']);
    let play = playCard(deck, 'painted');
    expect(play.correct).toBe(false);
    expect(play.deck.queue).toEqual(['caret', 'visited']);
    deck = playCard(play.deck, 'painted').deck;
    play = playCard(deck, 'never');
    expect(play.cleared).toBe(true);
    expect(play.deck.strikes).toBe(1);
  });

  it('is lost after the strike limit', () => {
    let deck = newDeck(['visited']);
    let lost = false;
    for (let i = 0; i < MAX_STRIKES; i++) ({ deck, lost } = playCard(deck, 'painted'));
    expect(lost).toBe(true);
  });

  it('drops open items and shuffles deterministically', () => {
    expect(newDeck(['visited', 'forced-colors']).queue).toEqual(['visited']);
    const seq = [0.1, 0.9, 0.5, 0.3];
    let i = 0;
    expect(shuffled([1, 2, 3, 4], () => seq[i++ % seq.length]!).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('the heists', () => {
  it('maps methods to the README’s two channels', () => {
    expect(channelOf('readback')).toBe('painting');
    expect(channelOf('timing')).toBe('painting');
    expect(channelOf('onpaint')).toBe('invalidation');
  });

  it('blocks sensitive targets and lets safe ones through', () => {
    expect(heistOutcome('visited')).toBe('blocked');
    expect(heistOutcome('caret')).toBe('learns');
    expect(heistOutcome('forced-colors')).toBeNull();
  });

  it('needs both the outcome and the channel', () => {
    const heist = HEISTS.find((h) => h.id === 'h-squiggle')!;
    expect(judgeHeist(heist, { outcome: 'blocked', channel: 'invalidation' }).correct).toBe(true);
    expect(judgeHeist(heist, { outcome: 'blocked', channel: 'painting' }).correct).toBe(false);
    expect(judgeHeist(heist, { outcome: 'learns', channel: 'invalidation' }).correct).toBe(false);
  });

  it('only aims at scored items', () => {
    HEISTS.forEach((h) => expect(heistOutcome(h.target)).not.toBeNull());
  });
});

describe('the lab model', () => {
  it('never leaks with read-back-allowed rendering on', () => {
    const ids = ['visited', 'spelling', 'xo-img', 'system-colors', 'caret', 'focus-ring'];
    expect(leakLevel(ids, true)).toEqual({ leaked: 0, sensitive: 4, allowed: 2 });
    expect(leakLevel(ids, false).leaked).toBe(4);
    expect(spyReads('caret', true)).toBe('readable');
    expect(spyReads('visited', true)).toBe('redacted');
  });

  it('tells visited purple from unvisited blue in read-back pixels', () => {
    const px = (rgb: readonly number[]) => [...rgb, 255];
    const data = new Uint8ClampedArray([...px(UNVISITED_RGB), ...px(UNVISITED_RGB), ...px(VISITED_RGB), ...px([250, 250, 250])]);
    expect(tallyLinkPixels(data)).toEqual({ visited: 1, unvisited: 2 });
  });
});
