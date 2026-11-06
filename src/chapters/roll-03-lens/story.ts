import { workedExampleFigure } from '../../ui/charts/lens-grids';
import type { StoryLine } from '../shared/chapter';
import { unitsTableFigure } from './figures';

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'In the lens grinder’s workshop, every print comes out of the tray soft at the edges. The grinder blames the glass. The glass is fine.',
  },
  {
    speaker: 'caret',
    text: 'The real trouble is that a canvas lives in three grids at once, and they rarely agree.',
    concept: {
      id: 'three-grids',
      title: 'Three coordinate systems',
      kind: 'idea',
      what: 'CSS pixels lay out the page, device pixels are the physical screen, and the canvas grid is set by the canvas’ `width` and `height` attributes, separate from both.',
      body: [
        'Device px = CSS px × `devicePixelRatio`, so positions often land between device pixels.',
        'The browser snaps boxes, borders and layer offsets to whole device pixels, and anti-aliases glyphs, curves and transformed edges.',
      ],
      source: 'Chrome docs, concepts.md, Sizing and units',
    },
  },
  {
    speaker: 'caret',
    text: 'Drawable HTML is laid out in CSS px, drawn onto the canvas grid, then stretched onto device pixels. Every step that doesn’t line up blends the edges again.',
    concept: {
      id: 'double-blend',
      title: 'Why drawn HTML blurs',
      kind: 'rule',
      what: 'If the canvas grid doesn’t match the device pixels it covers, edges are anti-aliased once into the grid and blended a second time when the grid is resampled to the screen.',
      figure: workedExampleFigure,
      body: [
        'The docs’ example: a canvas of 360 × 180 CSS px with the default 300 × 150 grid, at DPR 1.5, covers 540 × 270 device px. One canvas px spans 1.2 CSS px, or 1.8 device px.',
        'The fix is a 540 × 270 grid: one blend, straight onto the device grid, no resampling.',
      ],
      source: 'Chrome docs, concepts.md, Sizing and units',
    },
  },
  {
    speaker: 'foe',
    text: 'Three hundred by one hundred and fifty. Nobody ever changes it. Every print you make is mine.',
  },
  {
    speaker: 'caret',
    text: 'Blur lives in the default grid. A canvas starts at 300 × 150 whatever its CSS size. The rule that beats it is short.',
    concept: {
      id: 'match-device',
      title: 'Grid = device pixels',
      kind: 'rule',
      what: 'For crisp rendering, give the canvas grid exactly as many pixels as the device pixels the canvas covers.',
      body: [
        'The docs’ “Hello from the DOM!” card: 400 × 200 CSS px at DPR 1.5. A 400 × 200 grid is blurry; a 600 × 300 grid is sharp.',
        'Then CSS px → canvas px matches the browser’s own CSS px → device px conversion, and showing the canvas adds no blur.',
      ],
      source: 'Chrome docs, concepts.md, Sizing and units',
    },
  },
  {
    speaker: 'caret',
    text: 'That number moves. `devicePixelRatio` changes when the user zooms, or drags the window to another screen.',
    concept: {
      id: 'device-pixel-ratio',
      title: '`window.devicePixelRatio`',
      kind: 'property',
      what: 'How many device pixels make one CSS pixel on this screen, at this zoom level.',
      body: [
        'The right grid size “may change when the layout changes, when the user zooms the page, or when the user moves the window to a different display”. So never hard-code it.',
      ],
      source: 'Chrome docs, concepts.md, Size the canvas grid with a resize observer',
    },
  },
  {
    speaker: 'caret',
    text: 'So let the browser tell you. A ResizeObserver on the `device-pixel-content-box` reports the exact device pixels, every time they change.',
    concept: {
      id: 'dpcb-observer',
      title: '`device-pixel-content-box`',
      kind: 'method',
      what: 'A ResizeObserver box that reports the canvas’ content box in device pixels, as `entry.devicePixelContentBoxSize`. Copy it into the grid.',
      body: [
        'Fall back to `Math.round(contentRect × devicePixelRatio)` where the box is not supported. The README’s basic example skips that guard.',
        'Assigning `canvas.width` resets the bitmap (standard canvas behaviour), so draw again after a resize. The README’s worker example calls `requestPaint()` right after resizing.',
      ],
      code: "const observer = new ResizeObserver(([entry]) => {\n  const dpc = entry.devicePixelContentBoxSize;\n  canvas.width = dpc ? dpc[0].inlineSize : Math.round(entry.contentRect.width * devicePixelRatio);\n  canvas.height = dpc ? dpc[0].blockSize : Math.round(entry.contentRect.height * devicePixelRatio);\n});\nconst supportsDevicePixelContentBox =\n  typeof ResizeObserverEntry !== 'undefined' &&\n  'devicePixelContentBoxSize' in ResizeObserverEntry.prototype;\nobserver.observe(canvas, supportsDevicePixelContentBox ? { box: 'device-pixel-content-box' } : {});",
      source: 'Chrome docs, concepts.md, Size the canvas grid with a resize observer; README.md, Basic Example',
    },
  },
  {
    speaker: 'caret',
    text: 'Once the grid is right, watch your units. Some numbers are canvas grid px, some are CSS px, and one call can mix both.',
    concept: {
      id: 'units-table',
      title: 'The units table',
      kind: 'rule',
      what: 'Canvas sizes, 2D drawing parameters and the default size are canvas grid px; source rects, element geometry and DOM measurements are CSS px; `devicePixelContentBoxSize` is device px.',
      figure: unitsTableFigure,
      body: [
        'Grid px: `canvas.width`, `dx dy dwidth dheight`, `translate()`, `getElementImageDefaultSize()`.',
        'CSS px: `sx sy swidth sheight` (2D and WebGL), WebGPU `sourceX/Y/Width/Height`, `canvasTransform`, `canvasClip`, `getElementTransform()`, `offsetWidth`, pointer coordinates, `contentBoxSize`.',
        'Texture px: `width`/`height` of `texElementSubImage2D`, `size` of `drawElementImageToTexture`. By default the element’s grid size, rounded up.',
      ],
      source: 'Chrome docs, concepts.md, Convert CSS pixels to canvas grid coordinates',
    },
  },
  {
    speaker: 'caret',
    text: 'To move between them, divide the grid by the CSS size. Multiply CSS measurements by that before you draw.',
    concept: {
      id: 'scale-factors',
      title: '`scaleX` and `scaleY`',
      kind: 'rule',
      what: 'Canvas grid px per CSS px: `canvas.width / cssContentWidth` and `canvas.height / cssContentHeight`. Multiply CSS values by them to get grid values.',
      body: [
        'The demos multiply by `devicePixelRatio` instead. That only agrees when the grid is exactly the device pixels.',
      ],
      code: "canvas.onpaint = () => {\n  ctx.reset();\n  const width = card.offsetWidth * scaleX;\n  const height = card.offsetHeight * scaleY;\n  const x = (canvas.width - width) / 2;\n  const y = (canvas.height - height) / 2;\n  ctx.drawElementImage(card, x, y);\n};",
      source: 'Chrome docs, concepts.md, Convert CSS pixels to canvas grid coordinates',
    },
  },
  {
    speaker: 'caret',
    text: 'Or ask the canvas directly how big an element will be drawn, already in grid px.',
    concept: {
      id: 'default-size',
      title: '`canvas.getElementImageDefaultSize()`',
      kind: 'method',
      what: 'Returns `{ width, height }`: the default size of an element (or `ElementImage`) in canvas grid coordinates, the size the 3-argument `drawElementImage` uses.',
      body: [
        'It exists on `HTMLCanvasElement` and `OffscreenCanvas`. The WebGL and WebGPU guides round it up with `Math.ceil` to size textures.',
        'The proposal leaves the exact CSS-to-grid conversion open. The docs centre with `offsetWidth × scaleX`, and the lab lets you compare the two.',
      ],
      code: 'const size = canvas.getElementImageDefaultSize(card);\nconst x = (canvas.width - size.width) / 2;',
      source: 'README.md, IDL changes; Chrome docs, 2d.md, webgl.md',
    },
  },
  {
    speaker: 'caret',
    text: 'Last trap. `drawElementImage` draws the border box, padding and border included. Set `box-sizing: border-box` so `width` means what you drew.',
    concept: {
      id: 'border-box',
      title: '`box-sizing: border-box`',
      kind: 'rule',
      what: 'Because `drawElementImage` draws the element’s border box, `box-sizing: border-box` makes the drawn size equal the `width` and `height` you set.',
      code: '#card {\n  box-sizing: border-box;\n  width: 200px;\n  padding: 16px;\n}',
      source: 'Chrome docs, concepts.md, Convert CSS pixels to canvas grid coordinates',
    },
  },
  {
    speaker: 'foe',
    text: 'Zoom the page, move the window, and I seep back in.',
  },
  {
    speaker: 'caret',
    text: 'Not while the observer is watching. To the grinding wheel.',
  },
];
