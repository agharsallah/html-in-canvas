import type { Exercise } from '../shared/exercise';

export const exercises: Exercise[] = [
  {
    id: 'prologue-detect',
    title: 'Ask the browser',
    task: 'Finish `supportsHtmlInCanvas()`. Set the canvas’ `content` attribute to `drawable`, then return whether the `content` property reads back `"drawable"`.',
    language: 'js',
    starter: `function supportsHtmlInCanvas() {
  const canvas = document.createElement('canvas');
  // 1. set the content attribute

  // 2. return whether it was understood

}`,
    solution: `function supportsHtmlInCanvas() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('content', 'drawable');
  return canvas.content === 'drawable';
}`,
    checks: [
      { label: 'Sets the attribute with setAttribute, not by assigning the property', test: /canvas\.setAttribute\(\s*"content"\s*,\s*"drawable"\s*\)/ },
      { label: 'Returns whether canvas.content equals "drawable"', test: /return\s*\(?\s*(canvas\.content\s*===?\s*"drawable"|"drawable"\s*===?\s*canvas\.content)/ },
      { label: 'Does not assign canvas.content directly', test: (code) => !/canvas\.content\s*=[^=]/.test(code) },
    ],
    hints: [
      'Two lines go in the blanks: one that sets an attribute, one that returns a comparison.',
      'An unsupported browser ignores the attribute, so `canvas.content` stays `undefined` there. Compare it with `===`.',
    ],
    seenIn: 'feature-detect',
  },
];
