/**
 * Minimal DOM helpers. No framework, no innerHTML: content is authored by us
 * but we still build nodes so text can never be parsed as markup.
 */
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2), value);
    } else if (key === 'class') {
      el.className = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, ...children);
  return el;
}

export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Render text where `backticks` become <code> spans. */
export function rich(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  text.split(/(`[^`]+`)/g).forEach((part) => {
    if (!part) return;
    if (part.startsWith('`') && part.endsWith('`')) {
      fragment.appendChild(h('code', {}, part.slice(1, -1)));
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  });
  return fragment;
}

export function clear(el: Element): void {
  el.replaceChildren();
}

// One MediaQueryList for the app: callers ask every frame, so don't re-create it.
const reducedMotionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export const prefersReducedMotion = (): boolean => reducedMotionQuery?.matches ?? false;
