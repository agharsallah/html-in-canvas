/** Minimal WebGL2 plumbing for the hero scene: two programs and one quad. */

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;            // unit quad, 0..1, y down
uniform mat4 u_mvp;
uniform vec2 u_size;      // plane size in world units (CSS px)
out vec2 v_uv;
void main() {
  v_uv = a_pos;
  vec2 local = vec2((a_pos.x - 0.5) * u_size.x, (0.5 - a_pos.y) * u_size.y);
  gl_Position = u_mvp * vec4(local, 0.0, 1.0);
}`;

/** The poster shader: colour only (never moves vertices, so geometry stays exact). */
const TEX_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_tex;
uniform float u_fx;        // 1 = poster effects, 0 = plain
uniform float u_intro;     // 0..1 halftone reveal
uniform vec2 u_shift;      // misregistration offset (uv), from tilt velocity
uniform vec2 u_light;      // pointer, in uv
uniform vec2 u_px;         // texture size in px
uniform vec3 u_paper;
uniform vec3 u_plate;      // the second ink, printed slightly off
void main() {
  vec4 base = texture(u_tex, v_uv);
  vec3 col = base.rgb;
  if (u_fx > 0.5) {
    vec4 shifted = texture(u_tex, v_uv + u_shift);
    float inkShift = distance(shifted.rgb, u_paper);
    float inkBase = distance(base.rgb, u_paper);
    float strength = clamp(length(u_shift) * 900.0, 0.0, 1.0);
    float ghost = clamp(inkShift - inkBase, 0.0, 1.0) * strength;
    col = mix(col, u_plate, ghost * 0.75);
    float d = distance(v_uv * vec2(1.0, u_px.y / u_px.x), u_light * vec2(1.0, u_px.y / u_px.x));
    col += (1.0 - smoothstep(0.0, 0.7, d)) * 0.045;
    if (u_intro < 1.0) {
      vec2 cell = fract(v_uv * u_px / 10.0) - 0.5;
      float sweep = clamp(u_intro * 2.2 - (v_uv.x * 0.6 + v_uv.y * 0.6), 0.0, 1.0);
      float dotMask = 1.0 - smoothstep(sweep * 0.74 - 0.04, sweep * 0.74, length(cell));
      col = mix(u_paper, col, max(dotMask, smoothstep(0.92, 1.0, u_intro)));
    }
  }
  o = vec4(col * base.a, base.a);
}`;

/** Flat Bauhaus shapes, antialiased with SDFs. */
const SHAPE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform int u_kind;        // 0 disc, 1 half disc, 2 rectangle
uniform vec2 u_size;
uniform vec3 u_color;
uniform float u_alpha;
void main() {
  vec2 p = (v_uv - 0.5) * u_size;
  float d;
  if (u_kind == 0) d = length(p) - u_size.x * 0.5;
  else if (u_kind == 1) d = max(length(p - vec2(0.0, u_size.y * 0.5)) - u_size.x * 0.5, p.y - u_size.y * 0.5);
  else d = max(abs(p.x) - u_size.x * 0.5, abs(p.y) - u_size.y * 0.5);
  float aa = fwidth(d);
  float a = (1.0 - smoothstep(-aa, aa, d)) * u_alpha;
  o = vec4(u_color * a, a);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
    gl.attachShader(prog, sh);
  }
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  return prog;
}

export interface Programs {
  tex: WebGLProgram;
  shape: WebGLProgram;
  u: (prog: WebGLProgram, name: string) => WebGLUniformLocation | null;
  drawQuad: () => void;
}

export function setup(gl: WebGL2RenderingContext): Programs {
  const tex = compile(gl, VERT, TEX_FRAG);
  const shape = compile(gl, VERT, SHAPE_FRAG);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const cache = new Map<string, WebGLUniformLocation | null>();
  const progId = new Map<WebGLProgram, string>([[tex, 't'], [shape, 's']]);
  return {
    tex,
    shape,
    u(prog, name) {
      const key = progId.get(prog) + name;
      if (!cache.has(key)) cache.set(key, gl.getUniformLocation(prog, name));
      return cache.get(key) ?? null;
    },
    drawQuad() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
