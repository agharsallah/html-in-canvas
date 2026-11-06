/**
 * Notes on the back of each print: what a roll teaches, in one line per
 * concept, and what you build by the end. Read from the darkroom before you
 * start, so the line itself is a map of the whole API.
 *
 * Keys of `gists` match `Roll.concepts` exactly (checked in tests).
 */
import type { RollId } from './rolls';

export interface RollNotes {
  /** One plain sentence per concept on the front of the print. */
  gists: Record<string, string>;
  /** What you will have made by the end of the roll. */
  build: string;
}

export const ROLL_NOTES: Record<RollId, RollNotes> = {
  prologue: {
    gists: {
      'Why HTML-in-Canvas': 'Canvas pixels can’t be read aloud, selected, translated or searched. Drawing real HTML into the canvas fixes all four.',
      'Use cases': 'Text in 3D scenes, charts with real labels, shaders over live UI, and game menus a screen reader can use.',
    },
    build: 'Your first drawn element, and the end of the Smudge.',
  },
  fog: {
    gists: {
      'content="drawable"': 'Opts a canvas in: its children are laid out and hit-tested, but only appear where you draw them.',
      drawable: 'Marks a child the canvas may draw. Only drawables get a snapshot.',
      'Nested drawables': 'A drawable inside a drawable leaves a hole in its parent’s snapshot. You draw it separately.',
    },
    build: 'A card that stays readable and clickable inside the canvas.',
  },
  bells: {
    gists: {
      'paint event': 'Fires once per rendering update when a drawable’s snapshot changed. Draw there.',
      changedElements: 'The drawables whose snapshot changed since the last paint, so you redraw only those.',
      'requestPaint()': 'Asks for one paint at the next update, even when nothing changed.',
    },
    build: 'A paint timeline that rings only when it has to.',
  },
  lens: {
    gists: {
      'device-pixel-content-box': 'A ResizeObserver box in device pixels, so the canvas grid matches the screen exactly.',
      devicePixelRatio: 'CSS pixels to device pixels. Size the canvas in CSS pixels only and every glyph blurs.',
      'getElementImageDefaultSize()': 'The snapshot’s natural size in grid pixels: the right size for a texture.',
    },
    build: 'A canvas that stays razor sharp on every screen.',
  },
  projector: {
    gists: {
      'drawElementImage()': 'Draws an element’s snapshot into a 2D canvas, like drawImage for HTML, and places its hit area for you.',
      'Source and destination rects': 'Crop with the source rect, place and scale with the destination, spin with the context transform.',
    },
    build: 'A projector that crops, scales and spins live HTML.',
  },
  mirrors: {
    gists: {
      'updateElementGeometry()': 'Tells the browser where an element is drawn, so hover, clicks and focus land there.',
      canvasTransform: 'A DOMMatrix from element pixels to canvas pixels. It can be fully 3D: these prints use one.',
      canvasClip: 'The part of the canvas where the element can be hit. An empty clip makes it unclickable.',
      'Hit-test order': 'The element updated last sits on top. Update far to near and the nearest wins.',
    },
    build: 'A mirror maze where every reflection clicks true.',
  },
  observatory: {
    gists: {
      'texElementSubImage2D()': 'Uploads an element’s snapshot straight into a WebGL texture.',
      '3D hit testing': 'Turn the mesh’s model-view-projection into a canvasTransform and a form on a globe stays usable.',
    },
    build: 'A living form wrapped around a spinning world.',
  },
  foundry: {
    gists: {
      'drawElementImageToTexture()': 'The WebGPU path: copies a snapshot into a GPUTexture from the queue.',
      'Shaders over HTML': 'Ripple, melt or glow real UI in a fragment shader while its text stays selectable.',
    },
    build: 'Molten shaders poured over HTML without losing a word.',
  },
  railway: {
    gists: {
      OffscreenCanvas: 'Hand the canvas to a worker and draw off the main thread.',
      'captureElementImage()': 'Freezes a snapshot into an ElementImage you can transfer to a worker.',
      elementgeometryupdate: 'Fires when geometry set from a worker has landed, so hit testing is current again.',
    },
    build: 'Snapshots shipped to a worker, with their geometry brought home.',
  },
  lighthouse: {
    gists: {
      'Accessibility tree': 'Drawables stay in the DOM, so screen readers read them like any page.',
      inert: 'Takes hidden or turned-away content out of focus and assistive tech. Turn a print over: its face goes inert.',
      'Focus rings': 'Focus rings and carets are part of the snapshot. Keyboard users can see where they are.',
      'drawFocusIfNeeded()': 'Draws a focus ring around your own canvas shapes, only when focus should show.',
    },
    build: 'A canvas that speaks to everyone, not only to eyes.',
  },
  vault: {
    gists: {
      'Read-back-allowed rendering': 'Snapshots contain only what the page could already know, so reading pixels back is safe.',
      'Sensitive information': 'Cross-origin images, visited links, spelling marks and autofill previews are never painted.',
    },
    build: 'A vault that keeps every secret out of the pixels.',
  },
  clockwork: {
    gists: {
      'Update the rendering': 'The browser’s frame: animation callbacks, style, layout, Paint, then your paint event.',
      'Paint timing options A, B, C': 'Three places paint could fire. The spec picked C: once, right after Paint, DOM locked.',
    },
    build: 'The inside of a frame, taken apart and wound back up.',
  },
  epilogue: {
    gists: {
      'Auto-updating canvas': 'A future idea: draws replay on every scroll or animation, off the main thread.',
      'Threaded effects': 'Why snapshots aren’t re-rendered in a worker on scroll today, and what might change that.',
    },
    build: 'Your own exhibition of everything you developed.',
  },
};

/** What each frame of a roll is, for the contact sheet on the back. */
export const FRAME_NOTES = {
  story: 'Meet the foe',
  lab: 'Play with it',
  practice: 'Write it by hand',
  trial: 'Prove it',
} as const;
