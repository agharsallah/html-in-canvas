import { inOrder, type Exercise } from '../shared/exercise';

const DRAW_CALL = /device\.queue\.drawElementImageToTexture\(\s*(\{[^{}]*\})\s*,\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\})\s*,?\s*\)/;

export const exercises: Exercise[] = [
  {
    id: 'foundry-texture',
    title: 'Cast the mould',
    task: 'Create the GPU texture the readout will be drawn into: its default size rounded up to whole texels, in the guide’s colour format, with the three usage flags the guide uses.',
    language: 'js',
    starter: `const context = canvas.getContext('webgpu');
const size = canvas.getElementImageDefaultSize(readout);

// reserve a texture for the readout
`,
    solution: `const context = canvas.getContext('webgpu');
const size = canvas.getElementImageDefaultSize(readout);

const texture = device.createTexture({
  size: { width: Math.ceil(size.width), height: Math.ceil(size.height) },
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING |
         GPUTextureUsage.COPY_DST |
         GPUTextureUsage.RENDER_ATTACHMENT,
});`,
    checks: [
      { label: 'Creates a texture on the device', test: /device\.createTexture\(\s*\{/ },
      { label: 'Sizes it from the default size, rounded up', test: (code) => /width\s*:\s*Math\.ceil\(\s*size\.width\s*\)/.test(code) && /height\s*:\s*Math\.ceil\(\s*size\.height\s*\)/.test(code) },
      { label: 'Uses the rgba8unorm format', test: /format\s*:\s*"rgba8unorm"/ },
      { label: 'Can be sampled, copied into, and rendered into', test: (code) => ['TEXTURE_BINDING', 'COPY_DST', 'RENDER_ATTACHMENT'].every((f) => new RegExp(`usage\\s*:[^}]*GPUTextureUsage\\.${f}`).test(code)) },
    ],
    hints: [
      'WebGPU textures are made with `device.createTexture({ size, format, usage })`.',
      'Usage is a bitwise OR: `GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT`, and the format is `"rgba8unorm"`.',
    ],
    seenIn: 'gpu-texture-create',
  },
  {
    id: 'foundry-draw',
    title: 'Pour on paint',
    task: 'Every paint, copy the `readout` element into `texture` at `width` by `height` texture pixels using the WebGPU queue, then render.',
    language: 'js',
    starter: `const width = Math.ceil(size.width);
const height = Math.ceil(size.height);

canvas.addEventListener('paint', () => {
  // copy the readout into the texture

  render();
});`,
    solution: `const width = Math.ceil(size.width);
const height = Math.ceil(size.height);

canvas.addEventListener('paint', () => {
  device.queue.drawElementImageToTexture(
    { source: readout },
    { texture: texture, size: { width, height } },
  );
  render();
});`,
    checks: [
      { label: 'Calls drawElementImageToTexture on the device queue', test: /device\.queue\.drawElementImageToTexture\(/ },
      { label: 'The source dictionary names the readout', test: (code) => /source\s*:\s*readout/.test(DRAW_CALL.exec(code)?.[1] ?? '') },
      { label: 'The destination names the texture and its size', test: (code) => {
        const dest = DRAW_CALL.exec(code)?.[2] ?? '';
        return /texture\s*(:\s*texture)?\s*[,}]/.test(dest) && /size\s*:\s*\{\s*width(\s*:\s*width)?\s*,\s*height(\s*:\s*height)?\s*\}/.test(dest);
      } },
      { label: 'Copies inside the paint listener, before rendering', test: (code) => inOrder(code, /addEventListener\(\s*"paint"/, /drawElementImageToTexture\(/) && inOrder(code, /drawElementImageToTexture\(/, /render\(\s*\)/) },
    ],
    hints: [
      'The method takes two dictionaries: what to draw (`source`) and where (`texture`, `size`).',
      '`device.queue.drawElementImageToTexture({ source: readout }, { texture, size: { width, height } })`.',
    ],
    seenIn: 'draw-to-texture',
  },
  {
    id: 'foundry-theme',
    title: 'Colour from CSS',
    task: 'Like the jelly slider: read the slider’s computed text colour, write it to `heatUniform` through `parseColor`, and ask for a paint. Run that whenever the slider gains or loses focus.',
    language: 'js',
    starter: `const updateColors = () => {
  // CSS colour -> shader uniform

};
// keep it fresh
`,
    solution: `const updateColors = () => {
  const style = getComputedStyle(slider);
  heatUniform.write(parseColor(style.color));
  canvas.requestPaint();
};
slider.addEventListener('focus', updateColors);
slider.addEventListener('blur', updateColors);`,
    checks: [
      { label: 'Reads the slider’s computed style', test: /getComputedStyle\(\s*slider\s*\)/ },
      { label: 'Writes the parsed colour to the uniform', test: /heatUniform\.write\(\s*parseColor\(\s*(\w+|getComputedStyle\(\s*slider\s*\))\.color\s*\)\s*\)/ },
      { label: 'Asks for a paint', test: /canvas\.requestPaint\(\s*\)/ },
      { label: 'Refreshes on focus and on blur', test: (code) => /slider\.addEventListener\(\s*"focus"\s*,\s*updateColors\s*\)/.test(code) && /slider\.addEventListener\(\s*"blur"\s*,\s*updateColors\s*\)/.test(code) },
    ],
    hints: [
      '`getComputedStyle(slider).color` gives you the colour CSS settled on, focus styles included.',
      'Inside: `heatUniform.write(parseColor(style.color)); canvas.requestPaint();`. Outside: two `addEventListener` calls.',
    ],
    seenIn: 'theme-js',
  },
];
