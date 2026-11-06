/**
 * One exercise: the task, the editor, a live requirements checklist, and
 * three escalating levels of help (hint, next hint, solution).
 */
import { button, setVariant } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { h, rich } from '../../ui/dom';
import { createCodeEditor } from '../../ui/editor/code-editor';
import { evaluate, type Exercise } from './exercise';
import { createProofPanel, PROOFS, proofReplayButton } from './proof';

export interface ExerciseViewOptions {
  exercise: Exercise;
  position: string;
  /** Previously saved draft, if any. */
  draft?: string;
  solved: boolean;
  conceptTitle?: string;
  onDraft(code: string): void;
  onOpenConcept(id: string): void;
  onSolved(revealed: boolean): void;
  onNext?: () => void;
  say(text: string): void;
}

export function mountExerciseView(host: HTMLElement, o: ExerciseViewOptions): () => void {
  const { exercise } = o;
  let hintsShown = 0;
  let revealed = false;
  let solved = o.solved;

  const checklist = h('ul', { class: 'ex-checks', 'aria-label': 'Your code should' },
    ...exercise.checks.map((check) => h('li', { 'data-state': 'idle' }, h('span', { class: 'ex-check-mark', 'aria-hidden': 'true' }), check.label)));
  const feedback = h('div', { class: 'ex-feedback', 'aria-live': 'polite' });
  const help = h('div', { class: 'ex-help' });
  // After a pass, a live scene shows what this code does.
  const proof = createProofPanel(exercise.id);

  const markChecks = (code: string) => {
    const { results, passed } = evaluate(exercise, code);
    results.forEach((r, i) => {
      const row = checklist.children[i] as HTMLElement;
      row.dataset.state = r.passed ? 'pass' : 'fail';
    });
    return passed;
  };

  const editor = createCodeEditor({
    language: exercise.language,
    value: o.draft ?? exercise.starter,
    label: `Code for: ${exercise.title}`,
    onChange: (code) => {
      o.onDraft(code);
      if (checklist.dataset.checked) markChecks(code);
    },
    onSubmit: () => runCheck(),
    onReset: () => {
      editor.value = exercise.starter;
      editor.focus();
    },
  });

  const runCheck = () => {
    checklist.dataset.checked = 'true';
    const passed = markChecks(editor.value);
    const failing = exercise.checks.length - [...checklist.children].filter((c) => (c as HTMLElement).dataset.state === 'pass').length;
    feedback.replaceChildren(passed
      ? callout({ kind: 'success', title: revealed ? 'It works, now make it yours' : 'Developed by hand', body: revealed ? 'Try retyping it from memory next time to earn the silver.' : 'Every requirement is met.' })
      : callout({ kind: 'error', title: `${failing} ${failing === 1 ? 'requirement' : 'requirements'} still missing`, body: 'The red rows in the list show what your code does not do yet.' }));
    if (passed) {
      proof.open();
      if (replay) replay.hidden = true;
    }
    if (passed && !solved) {
      solved = true;
      o.onSolved(revealed);
    }
    if (passed && nextButton) {
      nextButton.hidden = false;
      setVariant(checkButton, 'secondary');
    }
    o.say(!passed ? 'Close. Read the red rows, then try again.'
      : revealed ? 'It runs. Come back later and write it from memory.'
      : 'Clean print, all by hand. On to the next one.');
  };

  const showHint = () => {
    if (hintsShown >= exercise.hints.length) return;
    hintsShown += 1;
    help.append(callout({ kind: 'hint', title: `Hint ${hintsShown} of ${exercise.hints.length}`, body: exercise.hints[hintsShown - 1]! }));
    hintButton.disabled = hintsShown >= exercise.hints.length;
  };

  const showSolution = () => {
    revealed = true;
    solutionButton.disabled = true;
    const code = h('pre', { class: 'code ex-solution-code' }, h('code', {}, exercise.solution));
    help.append(h('div', { class: 'ex-solution' },
      callout({ kind: 'info', title: 'One possible solution', body: 'Read it, then type it yourself. Copying it in works too, but earns no silver.' }),
      code,
      button({ label: 'Copy into the editor', variant: 'secondary', size: 'sm', onClick: () => {
        editor.value = exercise.solution;
        editor.focus();
      } })));
  };

  const checkButton = button({ label: 'Check my code', variant: 'primary', kbd: '⌘↵', onClick: runCheck });
  const hintButton = button({ label: 'Show a hint', variant: 'secondary', onClick: showHint });
  const solutionButton = button({ label: 'Show the solution', variant: 'ghost', onClick: showSolution });
  const nextButton = o.onNext ? button({ label: 'Next exercise', variant: 'primary', onClick: o.onNext }) : null;
  if (nextButton) nextButton.hidden = !solved;
  const replay = solved && PROOFS[exercise.id] ? proofReplayButton(() => {
    proof.open();
    replay!.hidden = true;
  }) : null;

  const seen = button({
    label: o.conceptTitle ? h('span', {}, 'Seen in: ', rich(o.conceptTitle)) : 'Open the notebook',
    variant: 'ghost', size: 'sm', onClick: () => o.onOpenConcept(exercise.seenIn),
  });

  host.append(h('article', { class: 'ex', 'aria-labelledby': `ex-${exercise.id}` },
    h('div', { class: 'ex-brief' },
      h('p', { class: 'ex-position' }, o.position, solved ? h('span', { class: 'ex-solved' }, 'Solved') : null),
      h('h3', { class: 'ex-title', id: `ex-${exercise.id}` }, exercise.title),
      h('p', { class: 'ex-task' }, rich(exercise.task)),
      seen,
      h('h4', { class: 'ex-checks-title' }, 'Your code should'),
      checklist),
    h('div', { class: 'ex-work' },
      editor.el,
      h('div', { class: 'ex-actions' }, checkButton, hintButton, solutionButton, replay, nextButton),
      feedback,
      proof.el,
      help)));

  return () => {
    proof.destroy();
    host.replaceChildren();
  };
}
