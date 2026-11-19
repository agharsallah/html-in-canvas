/** Escape text for HTML (attribute-safe). */
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Tagged template: interpolations are escaped unless wrapped in raw(). */
export class Raw {
  constructor(readonly value: string) {}
}
export const raw = (value: string): Raw => new Raw(value);

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let out = strings[0] ?? '';
  values.forEach((v, i) => {
    const part = Array.isArray(v) ? v.map((x) => (x instanceof Raw ? x.value : esc(String(x)))).join('') : v instanceof Raw ? v.value : v == null || v === false ? '' : esc(String(v));
    out += part + (strings[i + 1] ?? '');
  });
  return out;
}
