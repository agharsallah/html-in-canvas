/**
 * Trial phase 2: fill the WebGPU orders. Pick usage flags, format, size,
 * source rectangle, call and timing; the code updates live; "Fire" checks
 * it with `checkGpuConfig` in rules.ts. Two orders in a row.
 */
import { button } from '../../ui/components/button';
import { callout } from '../../ui/components/callout';
import { createSegmented } from '../../ui/components/segmented';
import { createToggle } from '../../ui/components/toggle';
import { h, rich } from '../../ui/dom';
import { checkGpuConfig, ORDERS, USAGE_FLAGS, type GpuConfig } from './rules';

export interface ConfigPhase {
  onPass(mistakes: number): void;
  say(text: string, foe?: boolean): void;
}

export function renderGpuCode(c: GpuConfig): string {
  const size = c.size === 'offset-css' ? 'card.offsetWidth, card.offsetHeight' : c.size === 'default-raw' ? 'size.width, size.height' : 'Math.ceil(size.width), Math.ceil(size.height)';
  const [w, hgt] = size.split(', ');
  const usage = c.usage.length ? c.usage.map((f) => `GPUTextureUsage.${f}`).join(' |\n         ') : '0';
  const source = c.crop === 'none' ? '{ source: card }'
    : c.crop === 'header-four' ? '{ source: card, sourceX: 0, sourceY: 0,\n    sourceWidth: card.offsetWidth, sourceHeight: 48 }'
      : '{ source: card, sourceWidth: card.offsetWidth, sourceHeight: 48 }';
  const call = c.call === 'texElementSubImage2D'
    ? 'gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, card);'
    : `device.queue.${c.call}(\n    ${source},\n    { texture, size: { width: ${w}, height: ${hgt} } });`;
  const upload = c.when === 'paint' ? `canvas.addEventListener('paint', () => {\n  ${call}\n});` : `// once, at load\n${call.replace(/\n {2}/g, '\n')}`;
  return `const size = canvas.getElementImageDefaultSize(card);\nconst texture = device.createTexture({\n  size: { width: ${w}, height: ${hgt} },\n  format: '${c.format}',\n  usage: ${usage},\n});\n\n${upload}`;
}

export function mountConfig(host: HTMLElement, phase: ConfigPhase): () => void {
  let mistakes = 0;
  let index = 0;
  const config: GpuConfig = { usage: [], format: 'r8unorm', size: 'offset-css', crop: 'header-two', call: 'copyElementImageToTexture', when: 'load' };
  const title = h('h4', { class: 'fdy-order-title' });
  const brief = h('p', { class: 'panel-help' });
  const code = h('code');
  const verdict = h('div', { class: 'fdy-verdict', 'aria-live': 'polite' });
  const refresh = () => (code.textContent = renderGpuCode(config));

  const flags = USAGE_FLAGS.map((flag) => createToggle({ kind: 'chip', label: flag, onChange: (on) => {
    config.usage = on ? [...config.usage, flag] : config.usage.filter((f) => f !== flag);
    refresh();
  } }));
  const seg = <K extends keyof GpuConfig>(label: string, key: K, options: Array<{ value: GpuConfig[K] & string; label: string }>) =>
    createSegmented<GpuConfig[K] & string>({ label, value: config[key] as GpuConfig[K] & string, options, onChange: (v) => {
      config[key] = v;
      refresh();
    } }).el;
  const field = (label: string, control: HTMLElement) => h('div', { class: 'fdy-field' }, h('p', { class: 'fdy-field-label' }, label), control);

  const showOrder = () => {
    const order = ORDERS[index]!;
    title.textContent = order.title;
    brief.textContent = order.brief;
    verdict.replaceChildren();
  };

  const fire = button({ label: 'Fire the furnace', variant: 'primary', onClick: () => {
    const order = ORDERS[index]!;
    const problems = checkGpuConfig(order, config);
    if (problems.length) {
      mistakes += 1;
      verdict.replaceChildren(callout({ kind: 'error', title: 'The cast cracked', body: h('ul', {}, ...problems.slice(0, 4).map((p) => h('li', {}, rich(p)))) }));
      phase.say('Cracked! Pour it again, apprentice.', true);
      return;
    }
    index += 1;
    if (index < ORDERS.length) {
      showOrder();
      verdict.replaceChildren(callout({ kind: 'success', title: 'A clean cast.', body: 'Next order on the board.' }));
      phase.say('Clean cast. The next order is a crop.');
      return;
    }
    fire.disabled = true;
    verdict.replaceChildren(callout({ kind: 'success', title: 'Both orders cast.', body: 'The guide’s recipe, end to end.' }));
    phase.onPass(mistakes);
  } });

  host.append(h('div', { class: 'fdy-config' },
    h('div', { class: 'panel fdy-config-form' },
      title, brief,
      field('Usage flags', h('div', { class: 'code-tree fdy-chips', role: 'group', 'aria-label': 'Usage flags' }, ...flags.map((f) => f.el))),
      field('Format', seg('Texture format', 'format', [{ value: 'rgba8unorm', label: 'rgba8unorm' }, { value: 'r8unorm', label: 'r8unorm' }, { value: 'depth24plus', label: 'depth24plus' }])),
      field('Size', seg('Texture size', 'size', [{ value: 'default-ceil', label: 'ceil(default)' }, { value: 'default-raw', label: 'default' }, { value: 'offset-css', label: 'offsetWidth' }])),
      field('Source rectangle', seg('Source rectangle', 'crop', [{ value: 'none', label: 'none' }, { value: 'header-four', label: 'header, 4 fields' }, { value: 'header-two', label: 'header, 2 fields' }])),
      field('Call', seg('Upload call', 'call', [{ value: 'drawElementImageToTexture', label: 'drawElementImageToTexture' }, { value: 'copyElementImageToTexture', label: 'copyElementImageToTexture' }, { value: 'texElementSubImage2D', label: 'texElementSubImage2D' }])),
      field('When', seg('When to upload', 'when', [{ value: 'paint', label: 'in paint' }, { value: 'load', label: 'once at load' }])),
      h('div', { class: 'panel-actions' }, fire)),
    h('div', { class: 'fdy-config-out' }, h('pre', { class: 'code fdy-code' }, code), verdict)));
  showOrder();
  refresh();
  return () => {};
}
