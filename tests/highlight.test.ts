import { describe, expect, it } from 'vitest';
import { tokenize, type Language } from '../src/ui/editor/highlight';

const samples: Array<[Language, string]> = [
  ['js', "canvas.addEventListener('paint', () => {\n  ctx.reset(); // clear\n  ctx.drawElementImage(form, 100, 0);\n});"],
  ['js', 'const s = "unterminated'],
  ['html', '<canvas content="drawable">\n  <form drawable>\n    <input id="name">\n  </form>\n</canvas>'],
  ['html', 'text with < sign and <!-- a comment --> <p class=\'x\'>hi</p>'],
  ['html', '<div unfinished'],
];

describe('tokenize', () => {
  it.each(samples)('%s: tokens rebuild the source exactly', (language, source) => {
    expect(tokenize(source, language).map((t) => t.text).join('')).toBe(source);
  });

  it('labels JS strings, comments, keywords, numbers and calls', () => {
    const kinds = Object.fromEntries(tokenize("const x = f(10); // hi\n'str'", 'js').map((t) => [t.text, t.kind]));
    expect(kinds).toMatchObject({ const: 'keyword', f: 'call', '10': 'number', '// hi': 'comment', "'str'": 'string' });
  });

  it('labels HTML tags and attributes only inside tags', () => {
    const tokens = tokenize('<canvas content="drawable">drawable text</canvas>', 'html');
    expect(tokens.find((t) => t.text === 'canvas')?.kind).toBe('tag');
    expect(tokens.find((t) => t.text === 'content')?.kind).toBe('attr');
    expect(tokens.find((t) => t.text === '"drawable"')?.kind).toBe('string');
    expect(tokens.find((t) => t.text.includes('drawable text'))?.kind).toBe('plain');
  });
});
