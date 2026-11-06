/**
 * The practice editor: a real <textarea> (so typing, selection, undo, IME
 * and screen readers all just work) laid exactly over a highlighted <pre>.
 *
 * Keys: Tab indents, Shift+Tab outdents, Escape then Tab leaves the editor,
 * Ctrl/Cmd+Enter runs the check.
 */
import { h } from '../dom';
import { button } from '../components/button';
import { tokenize, type Language } from './highlight';

export interface CodeEditorOptions {
  language: Language;
  value: string;
  label: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onReset?: () => void;
}

export interface CodeEditor {
  readonly el: HTMLElement;
  value: string;
  focus(): void;
}

const INDENT = '  ';

export function createCodeEditor(options: CodeEditorOptions): CodeEditor {
  const highlight = h('pre', { class: 'ui-editor-highlight', 'aria-hidden': 'true' });
  const gutter = h('div', { class: 'ui-editor-gutter', 'aria-hidden': 'true' });
  const input = h('textarea', {
    class: 'ui-editor-input', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off',
    autocorrect: 'off', wrap: 'off', 'aria-label': options.label, 'aria-describedby': 'editor-keys',
  });
  input.value = options.value;
  let escaped = false;

  const render = () => {
    const tokens = tokenize(input.value, options.language);
    highlight.replaceChildren(
      ...tokens.map((t) => (t.kind === 'plain' ? document.createTextNode(t.text) : h('span', { class: `tok-${t.kind}` }, t.text))),
      document.createTextNode('\n'),
    );
    const lines = input.value.split('\n').length;
    gutter.replaceChildren(...Array.from({ length: lines }, (_, i) => h('span', {}, String(i + 1))));
  };

  const replaceSelection = (text: string, selectStart: number, selectEnd: number) => {
    input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
    input.setSelectionRange(selectStart, selectEnd);
    input.dispatchEvent(new Event('input'));
  };

  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      options.onSubmit?.();
      return;
    }
    if (event.key === 'Escape') {
      escaped = true;
      return;
    }
    if (event.key !== 'Tab' || escaped) {
      escaped = false;
      return;
    }
    event.preventDefault();
    const { selectionStart: start, value } = input;
    if (event.shiftKey) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      if (value.startsWith(INDENT, lineStart)) {
        input.setSelectionRange(lineStart, lineStart + INDENT.length);
        replaceSelection('', Math.max(lineStart, start - INDENT.length), Math.max(lineStart, start - INDENT.length));
      }
    } else {
      replaceSelection(INDENT, start + INDENT.length, start + INDENT.length);
    }
  });
  input.addEventListener('blur', () => (escaped = false));
  input.addEventListener('input', () => {
    render();
    options.onChange?.(input.value);
  });

  const el = h('div', { class: 'ui-editor', 'data-language': options.language },
    h('div', { class: 'ui-editor-bar' },
      h('span', { class: 'ui-editor-lang' }, options.language === 'js' ? 'JavaScript' : 'HTML'),
      options.onReset ? button({ label: 'Reset code', variant: 'ghost', size: 'sm', onClick: options.onReset }) : null),
    h('div', { class: 'ui-editor-body' }, gutter, h('div', { class: 'ui-editor-code' }, highlight, input)),
    h('p', { class: 'ui-editor-keys', id: 'editor-keys' }, 'Tab indents. Press Esc, then Tab, to leave the editor. Ctrl or ⌘ + Enter checks your code.'));

  render();

  return {
    el,
    get value() {
      return input.value;
    },
    set value(next: string) {
      input.value = next;
      render();
      options.onChange?.(next);
    },
    focus: () => input.focus(),
  };
}
