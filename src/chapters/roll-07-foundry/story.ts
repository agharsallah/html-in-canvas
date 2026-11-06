import { createGpuPipelineChart } from '../../ui/charts/gpu-pipeline';
import type { StoryLine } from '../shared/chapter';

/** The Melt at work: the picture moved 40 px, the hit region did not. */
function meltFigure(): HTMLElement {
  const chart = createGpuPipelineChart();
  chart.update({
    uploads: 1, api: 'drawElementImageToTexture', texture: 'rgba8unorm',
    vertex: { state: 'moves', note: 'sag 40 px' }, fragment: { state: 'colour', note: 'heat tint' },
    drift: 40, tolerance: 2,
  });
  chart.el.classList.add('figure');
  return chart.el;
}

export const story: StoryLine[] = [
  {
    speaker: 'narrator',
    text: 'Below the observatory roars the GPU foundry: crucibles of molten orange, and moulds where HTML is cast into GPU textures.',
  },
  {
    speaker: 'foe',
    text: 'I am the Melt. Pour your words into my fire and I will bend every letter until no click can find them.',
  },
  {
    speaker: 'caret',
    text: 'In WebGPU, the queue does the pouring.',
    concept: {
      id: 'draw-to-texture',
      title: '`drawElementImageToTexture()`',
      kind: 'method',
      what: 'Draws a drawable element’s latest snapshot into a GPUTexture. It takes two dictionaries: what to draw, and where to put it.',
      body: ['Call it inside the `paint` event, like every other upload.'],
      code: "canvas.addEventListener('paint', () => {\n  device.queue.drawElementImageToTexture(\n    { source: myElement },\n    { texture: myTexture, size: { width: myElementWidth, height: myElementHeight } },\n  );\n});",
      source: 'README.md, IDL changes; Chrome docs, webgpu.md',
    },
  },
  {
    speaker: 'caret',
    text: 'First the mould. WebGPU wants the memory reserved up front, with the right usage flags.',
    concept: {
      id: 'gpu-texture-create',
      title: 'Pre-allocate the GPUTexture',
      kind: 'rule',
      what: 'Create the texture once: size from `getElementImageDefaultSize()` rounded up, format `rgba8unorm`, usage `TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT`.',
      body: ['`depthOrArrayLayers` is optional and defaults to 1.'],
      code: "const size = canvas.getElementImageDefaultSize(myElement);\nconst myTexture = device.createTexture({\n  size: { width: Math.ceil(size.width), height: Math.ceil(size.height) },\n  format: 'rgba8unorm',\n  usage: GPUTextureUsage.TEXTURE_BINDING |\n         GPUTextureUsage.COPY_DST |\n         GPUTextureUsage.RENDER_ATTACHMENT,\n});",
      source: 'Chrome docs, webgpu.md (Pre-allocate texture storage)',
    },
  },
  {
    speaker: 'caret',
    text: 'The source says what to pour.',
    concept: {
      id: 'gpu-source',
      title: '`GPUDrawElementImageSource`',
      kind: 'property',
      what: '`source` (required) is the Element or an `ElementImage`. `sourceX`, `sourceY`, `sourceWidth`, `sourceHeight` crop a sub-rectangle in CSS px: all four or none.',
      code: '{ source: card, sourceX: 0, sourceY: 0,\n  sourceWidth: card.offsetWidth, sourceHeight: 48 }',
      source: 'README.md, IDL changes; Chrome docs, webgpu.md (Draw HTML element image)',
    },
  },
  {
    speaker: 'caret',
    text: 'The destination says where it lands, and how big.',
    concept: {
      id: 'gpu-destination',
      title: '`GPUDrawElementImageDestination`',
      kind: 'property',
      what: '`texture` (required), plus an optional `size` in physical texture px that scales and rasterises the element inside the texture.',
      body: [
        'The rest have defaults: `origin` [0, 0, 0], `mipLevel` 0, `aspect` "all", `colorSpace` "srgb", `premultipliedAlpha` false.',
        'Leave `size` out and you get the element’s size in grid px, rounded up. The README says the dictionary extends `GPUImageCopyTextureTagged`.',
      ],
      source: 'README.md, IDL changes; Chrome docs, webgpu.md; Chrome docs, concepts.md (units)',
    },
  },
  {
    speaker: 'caret',
    text: 'As in WebGL, the browser cannot know where your texture landed. Tell it.',
    concept: {
      id: 'gpu-geometry',
      title: 'Geometry in WebGPU',
      kind: 'rule',
      what: 'Build a CSS-px `DOMMatrix` for where the element was drawn and pass it to `updateElementGeometry()`.',
      body: ['Positions measured in canvas grid px become CSS px when you divide by the grid-per-CSS-px scale from your ResizeObserver.'],
      code: 'const x = (canvas.width / scaleX) / 8;\nconst y = (canvas.height / scaleY - elementCssHeight) / 2;\ncanvas.updateElementGeometry(myElement, {\n  canvasTransform: new DOMMatrix().translate(x, y),\n});',
      source: 'Chrome docs, webgpu.md (Synchronize geometry)',
    },
  },
  {
    speaker: 'foe',
    text: 'Geometry, geometry. My fire does not care. I will sag your buttons forty pixels and watch the clicks fall through.',
  },
  {
    speaker: 'caret',
    text: 'That is the foundry’s one rule. Shaders may change colour freely. They must not move what you hit-test.',
    concept: {
      id: 'colour-only',
      title: 'Shaders over HTML: colour, not position',
      kind: 'rule',
      what: 'The browser hit-tests through the `canvasTransform` you sent, not through your shader. Effects that move pixels make clicks miss; colour changes never do.',
      body: [
        'Shaders over HTML are a headline use case: CSS only offers a limited set of effects (filters, backdrop-filter, mix-blend-mode).',
        'Vertex displacement and warped texture lookups both move pixels. If an effect must move content, send the same movement in `canvasTransform`.',
        'This site’s own print shader only changes colour, for exactly this reason.',
      ],
      figure: meltFigure,
      source: 'README.md, Use cases; README.md, 5. Synchronizing the DOM and drawing; this project, src/world/print-material.ts',
    },
  },
  {
    speaker: 'caret',
    text: 'The official jelly slider shows the craft: the real control stays real, the shader only paints.',
    concept: {
      id: 'jelly-pattern',
      title: 'The jelly slider pattern',
      kind: 'idea',
      what: 'The real `<input type=range>` is invisible and never drawn; it only gets geometry. A separate `inert` readout div is drawn into a texture, and the input event calls `requestPaint()`.',
      body: [
        'Pointer, keyboard and accessibility come from the real input. The look comes from the shader.',
        'Its hit rectangle is still a hand-tuned translate, with a TODO in the source.',
      ],
      code: '<canvas content="drawable" layoutsubtree>\n  <input drawable id="slider" type="range"> <!-- opacity: 0 -->\n  <div drawable id="value" inert></div>\n</canvas>',
      source: 'Examples/webgpu-jelly-slider (index.html, src/index.ts)',
    },
  },
  {
    speaker: 'caret',
    text: 'Its colours come from CSS, through JavaScript.',
    concept: {
      id: 'theme-js',
      title: 'Theme through JS',
      kind: 'idea',
      what: 'The jelly reads `getComputedStyle(slider)` (color, background-color, caret-color) into shader uniforms, and refreshes on focus, blur and colour-scheme, contrast and forced-colors changes.',
      body: ['`prefers-reduced-motion` and `prefers-reduced-transparency` switch its wobble and light scattering off.'],
      code: "const updateColors = () => {\n  const style = getComputedStyle(sliderElement);\n  jellyColorUniform.write(parseColor4(style.color));\n  canvas.requestPaint();\n};\nsliderElement.addEventListener('focus', updateColors);\nsliderElement.addEventListener('blur', updateColors);",
      source: 'Examples/webgpu-jelly-slider/src/index.ts',
    },
  },
  {
    speaker: 'foe',
    text: 'Clever. But your old pouring spout is still lying in the slag.',
  },
  {
    speaker: 'caret',
    text: 'It is, and the jelly slider still falls back to it.',
    concept: {
      id: 'legacy-copy',
      title: 'Legacy `copyElementImageToTexture()`',
      kind: 'method',
      what: 'The earlier WebGPU name. The jelly slider tries `drawElementImageToTexture` first and falls back to the old call, whose arguments were recently changed.',
      code: "try {\n  queue.drawElementImageToTexture(sourceDict, destDict);\n} catch (e) {\n  queue.copyElementImageToTexture(sourceDict,\n    { destination: { texture }, width, height });\n}",
      source: 'Examples/webgpu-jelly-slider/src/index.ts (comment links to README, IDL changes)',
    },
  },
  {
    speaker: 'caret',
    text: 'Detect the API where you call it: on the queue, and on the canvas.',
    concept: {
      id: 'gpu-detect',
      title: 'Detect on the queue',
      kind: 'idea',
      what: 'Check `"drawElementImageToTexture" in GPUQueue.prototype` before the WebGPU path, and `canvas.updateElementGeometry` before relying on it.',
      body: ['Without `updateElementGeometry`, the jelly slider falls back to positioning both elements with `style.transform`.'],
      source: 'Examples/webgpu-jelly-slider/src/index.ts; this project, src/core/capabilities.ts',
    },
  },
  {
    speaker: 'narrator',
    text: 'The crucible cools. The letters glow every colour of the fire, and every one of them is exactly where its click expects it.',
  },
];
