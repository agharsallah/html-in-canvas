/**
 * Drawing for the WebGPU crucible: the WGSL shader (native) and the 2D
 * stand-in (simulated). Both draw the same picture: the readout snapshot in
 * the top band, lith-toned toward the heat colour, and a molten bar whose
 * fill follows the invisible slider.
 */
import { createStandIn, type StandIn } from '../../scenes/element-standin';

/** Bar rectangle in canvas uv (0..1), from GPU_CSS (320 x 140 CSS px). */
const BAR = { x0: 16 / 320, x1: 304 / 320, y0: 104 / 140, y1: 126 / 140 };

export const GPU_SHADER = /* wgsl */ `
struct U { heat: vec4f, misc: vec4f }; // misc: value, focused, readout fraction, unused
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: U;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var p = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));
  var o: VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}

@fragment fn fs(v: VO) -> @location(0) vec4f {
  var col = vec3f(0.06, 0.02, 0.01);
  let rf = u.misc.z;
  let s = textureSample(tex, samp, vec2f(v.uv.x, v.uv.y / rf));
  if (v.uv.y < rf) {
    let lum = dot(s.rgb, vec3f(0.299, 0.587, 0.114));
    let lith = mix(vec3f(0.07, 0.015, 0.0), u.heat.rgb, smoothstep(0.04, 0.85, lum));
    col = mix(col, lith, s.a);
  }
  let bar = vec4f(${BAR.x0}, ${BAR.x1}, ${BAR.y0}, ${BAR.y1});
  let inBar = v.uv.x > bar.x && v.uv.x < bar.y && v.uv.y > bar.z && v.uv.y < bar.w;
  let t = (v.uv.x - bar.x) / (bar.y - bar.x);
  if (inBar) {
    col = select(vec3f(0.2, 0.08, 0.03), u.heat.rgb * (0.8 + 0.2 * sin(t * 40.0)), t <= u.misc.x);
  }
  let ring = v.uv.x > bar.x - 0.012 && v.uv.x < bar.y + 0.012 && v.uv.y > bar.z - 0.03 && v.uv.y < bar.w + 0.03;
  if (ring && !inBar && u.misc.y > 0.5) {
    col = u.heat.rgb;
  }
  return vec4f(col, 1.0);
}
`;

/** "rgb(255, 90, 31)" -> [1, 0.35, 0.12] (computed colours are always rgb/rgba). */
export function readColour(css: string): [number, number, number] {
  const m = css.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
  return m ? [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255] : [1, 0.35, 0.12];
}

const standIns = new WeakMap<HTMLElement, StandIn>();

export function drawSim(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, readout: HTMLElement,
  state: { value: number; focused: boolean; colour: string }): void {
  const { width: W, height: H } = canvas;
  let standIn = standIns.get(readout);
  if (!standIn) {
    standIn = createStandIn(readout);
    standIns.set(readout, standIn);
  }
  standIn.paint();
  ctx.fillStyle = '#100503';
  ctx.fillRect(0, 0, W, H);
  // Lith tone: the readout snapshot, then the heat colour multiplied in.
  const rh = (96 / 140) * H;
  ctx.drawImage(standIn.canvas, 0, 0, W, rh);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = state.colour;
  ctx.fillRect(0, 0, W, rh);
  ctx.globalCompositeOperation = 'source-over';
  const x0 = BAR.x0 * W, x1 = BAR.x1 * W, y0 = BAR.y0 * H, y1 = BAR.y1 * H;
  if (state.focused) {
    ctx.fillStyle = state.colour;
    ctx.fillRect(x0 - 0.012 * W, y0 - 0.03 * H, x1 - x0 + 0.024 * W, y1 - y0 + 0.06 * H);
  }
  ctx.fillStyle = '#331408';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = state.colour;
  ctx.fillRect(x0, y0, (x1 - x0) * state.value, y1 - y0);
}
