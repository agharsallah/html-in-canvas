/** Live markup preview for the fog lab. Pure: easy to test. */
import type { ContentMode } from './rules';

export interface MarkupChild {
  tag: string;
  drawable: boolean;
}

export function renderMarkup(content: ContentMode, children: MarkupChild[]): string {
  const open = content === 'drawable' ? '<canvas content="drawable">' : '<canvas> <!-- content="fallback" -->';
  const lines = children.map(({ tag, drawable }) => {
    const name = tag.replace(/[<>]/g, '');
    const attr = drawable ? ' drawable' : '';
    return name === 'input' ? `  <input${attr}>` : `  <${name}${attr}>…</${name}>`;
  });
  return [open, ...lines, '</canvas>'].join('\n');
}
