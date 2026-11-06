import type { StoryLine } from '../shared/chapter';
import { matrixFigure, uploadFigure } from './figures';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Above the darkroom turns the orbit observatory: a dome of Prussian blue where elements ride on satellites around a white-lined world.',
  },
  {
    speaker: 'foe',
    text: 'We are the Flat Earth Society. An element is a flat rectangle on a flat page. Paint it on your ball if you must; it will still be clicked where it always was.',
  },
  {
    speaker: 'caret',
    text: 'In WebGL you do not draw an element. You copy its snapshot into a texture, and the texture can go on anything.',
    concept: {
      id: 'tex-sub-image',
      title: '`gl.texElementSubImage2D()`',
      kind: 'method',
      what: 'Copies a drawable element’s latest snapshot into the bound WebGL texture, at an x/y offset, like `texSubImage2D` does for images.',
      body: [
        'The element argument can also be an `ElementImage` from `captureElementImage()`.',
        'It is declared on `WebGLRenderingContext`; the official demo uses a `webgl2` context.',
      ],
      code: 'gl.texElementSubImage2D(\n  gl.TEXTURE_2D, /* level */ 0,\n  /* xoffset */ 0, /* yoffset */ 0,\n  myElement, /* config, optional */\n);',
      figure: uploadFigure,
      source: 'README.md, IDL changes; Chrome docs, webgl.md',
    },
  },
  {
    speaker: 'caret',
    text: 'It is a sub-image upload, so the storage must exist first. Allocate it once, at the element’s default size.',
    concept: {
      id: 'pre-allocate',
      title: 'Pre-allocate the texture',
      kind: 'rule',
      what: 'Reserve texture storage with `texImage2D(…, null)` before uploading, sized with `getElementImageDefaultSize()` and rounded up.',
      body: [
        'It lets the browser do fast sub-image updates without expensive GPU memory re-allocations. Allocate once, or whenever the element changes size.',
        'The default size is in canvas grid px. The official `webGL.html` demo re-allocates on every upload; the Chrome guide recommends doing it once.',
      ],
      code: 'const { width, height } = canvas.getElementImageDefaultSize(myElement);\ngl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8,\n  Math.ceil(width), Math.ceil(height), 0,\n  gl.RGBA, gl.UNSIGNED_BYTE, null);',
      source: 'Chrome docs, webgl.md (Pre-allocate texture storage); Examples/webGL.html',
    },
  },
  {
    speaker: 'caret',
    text: 'Then upload from the `paint` event, and only for elements that actually changed.',
    concept: {
      id: 'upload-changed',
      title: 'Upload only what changed',
      kind: 'rule',
      what: 'In `paint`, re-upload a texture only when its element is in `event.changedElements`, or when your own state switched which element is shown.',
      body: [
        'The flip-card demo re-uploads the message face when it changed or when the chosen language changed. `changedElements` alone misses a switch to a different element.',
        'Uploading on every frame costs a full texture copy per frame even when nothing moved.',
      ],
      code: "canvas.onpaint = (event) => {\n  const changed = Array.from(event.changedElements);\n  if (changed.includes(langEl) || langId !== lastLangId) {\n    updateTexture(gl, texture, langEl);\n    lastLangId = langId;\n  }\n  render();\n};",
      source: 'Examples/webGL.html; Chrome docs, webgl.md',
    },
  },
  {
    speaker: 'caret',
    text: 'Need only part of the element, or a different size? Pass the optional config.',
    concept: {
      id: 'copy-config',
      title: '`WebGLCopyElementImageConfig`',
      kind: 'property',
      what: 'The optional last argument: `sx`, `sy`, `swidth`, `sheight` pick a source rectangle in CSS px; `width` and `height` set the copy size in texture px.',
      body: ['Leave it out to copy the whole element at its default size: grid px, rounded up.'],
      code: 'gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, form, {\n  sx: 0, sy: 0, swidth: 320, sheight: 48, // CSS px\n  width: 640, height: 96,                // texture px\n});',
      source: 'README.md, IDL changes; Chrome docs, concepts.md (units)',
    },
  },
  {
    speaker: 'caret',
    text: 'Two settings from the official demo: linear filtering for text, and rows flipped for WebGL.',
    concept: {
      id: 'texture-setup',
      title: 'Filtering and `UNPACK_FLIP_Y_WEBGL`',
      kind: 'rule',
      what: 'The `webGL.html` demo sets `LINEAR` minification and `CLAMP_TO_EDGE`, and turns on `UNPACK_FLIP_Y_WEBGL` once.',
      body: [
        'Its comment: “Linear texture filtering produces better results than mipmap with text.”',
        'On the flip: “Flip image pixels into the bottom-to-top order that WebGL expects.” The docs do not say whether the flag applies to element uploads; this project checked in Chrome 157 and it does. The lab lets your browser answer too.',
      ],
      code: 'gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);\ngl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);\ngl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);\ngl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);',
      source: 'Examples/webGL.html',
    },
  },
  {
    speaker: 'foe',
    text: 'There. A picture on a ball. And when they click it, the click still goes to the flat rectangle in the page.',
  },
  {
    speaker: 'caret',
    text: 'Not if we tell the browser where we drew it. A 2D context works that out itself. WebGL cannot.',
    concept: {
      id: 'geometry-3d',
      title: '3D must call `updateElementGeometry()`',
      kind: 'rule',
      what: 'In WebGL and WebGPU the canvas cannot know where a texture landed, so you pass a CSS-px `DOMMatrix` that maps the element’s border box to the canvas.',
      body: [
        'The docs’ order: upload the snapshot, draw the scene, build the transform, then update the geometry. Hit testing, focus rings and accessibility bounds follow it.',
      ],
      code: 'const canvasTransform = new DOMMatrix();\ncanvasTransform.a = canvas.clientWidth / myElement.offsetWidth;\ncanvasTransform.d = canvas.clientHeight / myElement.offsetHeight;\ncanvasTransform.e = 50;  // CSS px\ncanvasTransform.f = 100;\ncanvas.updateElementGeometry(myElement, { canvasTransform });',
      source: 'README.md, 5. Synchronizing the DOM and drawing; Chrome docs, webgl.md (Synchronize geometry)',
    },
  },
  {
    speaker: 'caret',
    text: 'Scale and translate fit a flat card. A tilted card needs the whole projective matrix.',
    concept: {
      id: 'projective-matrix',
      title: 'A projective `canvasTransform`',
      kind: 'idea',
      what: 'For a tilted plane, pass the full 4×4 chain Viewport · Projection · View · Model · ElementToPlane: the matrix CSS `matrix3d()` would need.',
      body: [
        'The docs only show scale-and-translate matrices; perspective hit testing is not documented. This project verified in Chrome 157 that `elementFromPoint` finds the right control on a tilted print.',
        'The official flip card leaves rotation out of its matrix on purpose, and sets `inert` on the face turned away.',
      ],
      figure: matrixFigure,
      source: 'README.md, 5. Synchronizing the DOM and drawing; Examples/webGLSetup.js; this project, src/hic/projective-geometry.ts',
    },
  },
  {
    speaker: 'foe',
    text: 'Matrices, perspective… a fad. Our old upload call never needed any of this.',
  },
  {
    speaker: 'caret',
    text: 'That old call is still around in early builds, and the demos fall back to it.',
    concept: {
      id: 'legacy-tex',
      title: 'Legacy `texElementImage2D()`',
      kind: 'method',
      what: 'The earlier WebGL upload. It allocated the texture itself, so it needed no `texImage2D(…, null)`.',
      code: 'try {\n  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, element);\n} catch (e) {\n  // old builds\n  gl.texElementImage2D(gl.TEXTURE_2D, level, internalFormat,\n                       srcFormat, destType, element);\n}',
      source: 'Examples/webGL.html (comment links to README, IDL changes)',
    },
  },
  {
    speaker: 'caret',
    text: 'Check for the API on the context you actually use, and let a library do the plumbing if you like.',
    concept: {
      id: 'webgl-detect',
      title: 'Detect per context, or use a library',
      kind: 'idea',
      what: 'Test the WebGL context itself for `texElementSubImage2D` (with the legacy name as fallback) and the canvas for `updateElementGeometry`.',
      body: [
        'The flip card checks `canvas.updateElementGeometry !== undefined`.',
        'three.js has experimental `THREE.HTMLTexture`; Babylon.js has `BABYLON.HtmlTexture`. They are wrappers: check each library’s docs for what it supports. This site’s notes found that three r187’s `HTMLTexture` uses the legacy upload.',
      ],
      code: "const glReady = typeof gl.texElementSubImage2D === 'function'\n  || typeof gl.texElementImage2D === 'function';\n\n// three.js\nmaterial.map = new THREE.HTMLTexture(uiElement);",
      source: 'Examples/webGL.html; Chrome docs, index.md (Library and framework support)',
    },
  },
  {
    speaker: 'narrator',
    text: 'The globe turns. The form on the satellite answers every click where it is drawn, not where the Society says it should be.',
  },
];
