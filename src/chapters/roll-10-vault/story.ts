import type { StoryLine } from '../shared/chapter';
import { channelsFigure, listsFigure } from './figures';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Below the darkroom sits a steel vault. Every print that leaves it passes a photocopier that blacks out anything that is not yours to see.',
  },
  {
    speaker: 'caret',
    text: 'A canvas is not a sealed frame. Script can read its pixels back. So anything we develop into it must be safe to read.',
    concept: {
      id: 'vault-read-back',
      title: 'Read-back-allowed rendering',
      kind: 'rule',
      what: 'Element snapshots and the `paint` event must never reveal security- or privacy-sensitive information that author code could not already observe.',
      body: [
        'It applies to `drawElementImage()`, every other method that draws element snapshots, and the `paint` event.',
        'The name says why: pixel read-back must stay allowed, because it is always possible with WebGL and WebGPU. So there is no “tainted canvas” here: the sensitive parts are simply never painted.',
      ],
      code: "canvas.onpaint = () => {\n  ctx.reset();\n  ctx.drawElementImage(card, 0, 0);\n  // allowed: the snapshot holds nothing secret\n  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);\n};",
      source: 'README.md, Read-back-allowed rendering',
    },
  },
  {
    speaker: 'foe',
    text: 'I am the Leak. I do not need to steal your prints. I only need to look at them, or count how often you make them.',
  },
  {
    speaker: 'caret',
    text: 'Two doors, then. Painting, where you read pixels or time the draw. And invalidation, where you count `paint` events.',
    concept: {
      id: 'vault-channels',
      title: 'Two ways to leak',
      kind: 'idea',
      what: 'Sensitive data could escape through painting (pixel read-back or timing attacks) or through invalidation (the `paint` event firing).',
      figure: channelsFigure,
      body: ['Both are closed the same way: sensitive information is left out when painting and when invalidating. Not painting it also means it can never make `paint` fire.'],
      source: 'README.md, Read-back-allowed rendering; security-privacy-questionnaire.md, Q3',
    },
  },
  {
    speaker: 'caret',
    text: 'Here is what the photocopier always blacks out.',
    concept: {
      id: 'vault-never-painted',
      title: 'Never painted',
      kind: 'rule',
      what: 'The README’s list of sensitive information that snapshots leave out.',
      body: [
        'Cross-origin data in embedded content (`<iframe>`, `<img>`), in `<url>` references (`background-image`, `clip-path`), in `<canvas>` elements tainted with cross-origin data, and in SVG (`<use>`, `<pattern>`, `<feImage>`).',
        'System colours, themes or preferences. Spelling and grammar markers. Visited link information. Pending form autofill information not otherwise available to JavaScript.',
        'Subpixel text anti-aliasing. Captions and video controls. IME pop-ups and distinctive IME text formatting.',
      ],
      source: 'README.md, Read-back-allowed rendering',
    },
  },
  {
    speaker: 'caret',
    text: 'One subtle line on that list: a frame from your own origin still develops. Only what it pulls in from elsewhere is blacked out.',
    concept: {
      id: 'vault-same-origin',
      title: 'Same-origin iframes',
      kind: 'rule',
      what: 'Same-origin iframes still paint into a snapshot, but cross-origin content inside them does not.',
      source: 'README.md, Read-back-allowed rendering',
    },
  },
  {
    speaker: 'caret',
    text: 'And here is what stays visible. Including me: my blink is not a secret.',
    concept: {
      id: 'vault-not-sensitive',
      title: 'Painted on purpose',
      kind: 'idea',
      what: 'New information the README does not consider sensitive, so snapshots do show it.',
      body: [
        'Search text (find-in-page) and text-fragment markers. Scrollbar and form element appearance, already detectable through `foreignObject` in Blink and WebKit. Caret blink rate. `forced-colors`, already available to script through the media query and system colours.',
        'Focus and carets are rendered by `drawElementImage` and the WebGL and WebGPU equivalents, so accessibility indicators survive the trip into the canvas.',
      ],
      source: 'README.md, Read-back-allowed rendering; Accessibility',
    },
  },
  {
    speaker: 'caret',
    text: 'Two documents keep these lists, and they do not quite match. Read both.',
    concept: {
      id: 'vault-two-lists',
      title: 'README versus questionnaire',
      kind: 'idea',
      what: 'The security and privacy questionnaire repeats the core of the README’s lists, with a few differences.',
      figure: listsFigure,
      body: [
        'Its “must not be painted” list (Q3) is a subset: cross-origin, visited-link, spellcheck and autofill-preview information.',
        'Its “revealed” list (Q1) names text selection, which the README never mentions. The README names text-fragment markers, which the questionnaire never mentions.',
        'Still open: the README treats system colours as sensitive but `forced-colors` as not, and does not say where one ends and the other begins.',
      ],
      source: 'security-privacy-questionnaire.md, Q1, Q3, Q6; README.md, Read-back-allowed rendering',
    },
  },
  {
    speaker: 'foe',
    text: 'Then I will wait in the dark. A page in the back-forward cache. A private window. A third-party frame.',
  },
  {
    speaker: 'caret',
    text: 'The questionnaire already answered you, Leak.',
    concept: {
      id: 'vault-questionnaire',
      title: 'The questionnaire’s answers',
      kind: 'rule',
      what: 'The API only works in fully active documents, behaves the same in first- and third-party contexts and in private browsing, and adds no persistent state or identifiers.',
      body: [
        'It sends no data to the platform, reads no sensors, adds no script-loading mechanism, reaches no other devices, controls no native UI, and creates no temporary identifiers.',
        'It does not let an origin downgrade default protections. The normative text for read-back-allowed rendering lives in its own WHATWG HTML pull request, 12554.',
      ],
      source: 'security-privacy-questionnaire.md, Q5, Q8-Q18',
    },
  },
  {
    speaker: 'caret',
    text: 'Why go to all this trouble? Because then the pixels may leave the canvas. Exporting HTML as images or video is one of the five use cases.',
    concept: {
      id: 'vault-media-export',
      title: 'Media export',
      kind: 'idea',
      what: 'Exporting HTML content as images or video is a stated use case; read-back-safe snapshots are what make sending those pixels onward reasonable.',
      body: ['The docs name the use case but describe no export mechanism. Ordinary canvas calls such as `toBlob()` are what you would reach for; treat this as a direction, not a recipe.'],
      code: "canvas.onpaint = () => {\n  ctx.reset();\n  ctx.drawElementImage(card, 0, 0);\n  canvas.toBlob(save, 'image/png');\n};",
      source: 'README.md, Use cases (Media Export)',
    },
  },
  {
    speaker: 'caret',
    text: 'Into the vault. Find what the Leak wants, and prove the photocopier keeps it out.',
  },
];
