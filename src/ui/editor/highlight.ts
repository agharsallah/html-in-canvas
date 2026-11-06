/**
 * A tiny syntax highlighter for the practice editor. Pure: it only splits
 * text into typed tokens, so it is easy to test and never touches the DOM.
 * Concatenating every token's text always gives back the input exactly.
 */
export type Language = 'html' | 'js';
export type TokenKind = 'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'call' | 'tag' | 'attr' | 'punct';

export interface Token {
  text: string;
  kind: TokenKind;
}

const JS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|\b(const|let|var|function|return|if|else|new|await|async|of|for|true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
const JS_KINDS: TokenKind[] = ['comment', 'string', 'keyword', 'number', 'call'];

export function tokenize(source: string, language: Language): Token[] {
  return language === 'js' ? scan(source, JS, JS_KINDS) : scanHtml(source);
}

function scan(source: string, pattern: RegExp, kinds: TokenKind[]): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: source.slice(last, index), kind: 'plain' });
    const group = match.slice(1).findIndex((g) => g !== undefined);
    tokens.push({ text: match[0], kind: kinds[group] ?? 'plain' });
    last = index + match[0].length;
  }
  if (last < source.length) tokens.push({ text: source.slice(last), kind: 'plain' });
  return tokens;
}

/** HTML: only highlight names and attributes inside tags, never in text. */
function scanHtml(source: string): Token[] {
  const tokens: Token[] = [];
  const tagPattern = /<!--[\s\S]*?(?:-->|$)|<\/?[A-Za-z][^>]*>?/g;
  let last = 0;
  for (const match of source.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ text: source.slice(last, index), kind: 'plain' });
    tokens.push(...(match[0].startsWith('<!--') ? [{ text: match[0], kind: 'comment' as const }] : scanTag(match[0])));
    last = index + match[0].length;
  }
  if (last < source.length) tokens.push({ text: source.slice(last), kind: 'plain' });
  return tokens;
}

function scanTag(tag: string): Token[] {
  const tokens: Token[] = [];
  const open = /^<\/?/.exec(tag)![0];
  tokens.push({ text: open, kind: 'punct' });
  const name = /^[A-Za-z][\w-]*/.exec(tag.slice(open.length))?.[0] ?? '';
  if (name) tokens.push({ text: name, kind: 'tag' });
  const rest = tag.slice(open.length + name.length);
  tokens.push(...scan(rest, /([A-Za-z_:@][\w:.-]*)|("[^"]*"?|'[^']*'?)|(\/?>)/g, ['attr', 'string', 'punct']));
  return tokens;
}
