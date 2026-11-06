/**
 * Developer liquid: a horizontal sheet of chemistry with a live HTML print
 * lying under it.
 *
 * The fragment shader sums up to 8 expanding ripple rings plus a slow
 * ambient swell, derives a surface normal from three height samples, and
 * uses it to refract the lookup into the HTML snapshot, so the words bend
 * as the liquid moves. The print develops darks first, like silver halide.
 * On top: a teal chemistry tint, caustic shimmer and a safelight glint.
 *
 * Only colour changes here, never vertex positions, so the DOM geometry we
 * send for hit testing stays exactly where the paper lies.
 */
import { Color, ShaderMaterial, Vector4, type Texture } from 'three';

export const MAX_RIPPLES = 8;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define MAX_RIPPLES ${MAX_RIPPLES}
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uDevelop;
  uniform float uTime;
  uniform vec4 uRipples[MAX_RIPPLES]; // xy: centre (liquid uv), z: start time, w: strength
  uniform vec4 uPaperRect;            // xy: min uv, zw: size, of the paper in liquid uv
  uniform vec2 uAspect;               // liquid width/height, to keep rings round
  uniform vec3 uPaper;
  uniform vec3 uTint;
  uniform vec3 uGlint;
  uniform vec3 uFloor;
  varying vec2 vUv;

  float height(vec2 uv) {
    vec2 p = uv * uAspect;
    float h = 0.0006 * sin(p.x * 9.0 + uTime * 0.9) + 0.0005 * sin(p.y * 11.0 - uTime * 0.7);
    for (int i = 0; i < MAX_RIPPLES; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 5.0) continue;
      float d = distance(p, r.xy * uAspect);
      float front = age * 0.32;
      float ring = exp(-pow((d - front) * 9.0, 2.0));
      h += sin((d - front) * 55.0) * ring * exp(-age * 0.9) * r.w * 0.0035;
    }
    return h;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    float e = 0.0025;
    float h0 = height(vUv);
    vec2 normal = vec2(height(vUv + vec2(e, 0.0)) - h0, height(vUv + vec2(0.0, e)) - h0) / e;

    // Refraction: look into the tray through the bent surface. Clamp the
    // slope so even many overlapping ripples bend words, never shred them.
    float slopeLen = length(normal);
    normal *= min(1.0, 0.55 / max(slopeLen, 1e-4));
    vec2 ruv = vUv + normal * 0.03;
    vec2 puv = (ruv - uPaperRect.xy) / uPaperRect.zw;
    bool onPaper = all(greaterThanEqual(puv, vec2(0.0))) && all(lessThanEqual(puv, vec2(1.0)));

    vec3 color = uFloor;
    if (onPaper) {
      vec4 snap = uHasMap > 0.5 ? texture2D(uMap, puv) : vec4(uPaper, 1.0);
      vec3 image = mix(uPaper, snap.rgb, snap.a);
      float lum = dot(image, vec3(0.299, 0.587, 0.114));
      float develop = clamp(uDevelop * 1.6 - lum * 0.6, 0.0, 1.0);
      color = mix(uPaper, image, develop);
      float grain = hash(floor(puv * vec2(640.0, 440.0)) + floor(uTime * 12.0)) - 0.5;
      color += grain * mix(0.08, 0.01, uDevelop);
      // Soft paper edge in the liquid.
      vec2 edge = smoothstep(vec2(0.0), vec2(0.02), puv) * smoothstep(vec2(0.0), vec2(0.02), 1.0 - puv);
      color = mix(uFloor, color, edge.x * edge.y);
    }

    // Chemistry: a teal tint that deepens toward the tray walls.
    vec2 c = vUv - 0.5;
    float wall = smoothstep(0.32, 0.5, max(abs(c.x), abs(c.y)));
    color = mix(color, color * mix(vec3(1.0), uTint, 0.55), 0.10 + wall * 0.5);

    // Caustics and the safelight glint riding on the ripples.
    float slope = length(normal);
    color += uTint * slope * 0.09;
    vec2 g = (vUv - vec2(0.68, 0.72)) * vec2(1.0, 1.6) + normal * 0.9;
    color += uGlint * exp(-dot(g, g) * 90.0) * 0.35;
    color += uGlint * smoothstep(0.05, 0.12, slope) * 0.05;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface LiquidOptions {
  paper: string;
  tint: string;
  glint: string;
  floor: string;
  /** Liquid surface width / height. */
  aspect: number;
  /** Paper rectangle inside the liquid, in liquid uv. */
  paperRect: [number, number, number, number];
}

export function createLiquidMaterial(o: LiquidOptions): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uDevelop: { value: 0 },
      uTime: { value: 0 },
      uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new Vector4(0, 0, -100, 0)) },
      uPaperRect: { value: new Vector4(...o.paperRect) },
      uAspect: { value: [o.aspect, 1] },
      uPaper: { value: new Color(o.paper) },
      uTint: { value: new Color(o.tint) },
      uGlint: { value: new Color(o.glint) },
      uFloor: { value: new Color(o.floor) },
    },
  });
}

export function setLiquidTexture(material: ShaderMaterial, texture: Texture | null, ready: boolean): void {
  material.uniforms.uMap!.value = texture;
  material.uniforms.uHasMap!.value = texture && ready ? 1 : 0;
}
