/**
 * The crucible shader: a live HTML card through four effects.
 *
 *  heat, grain  — colour only. Every pixel stays where it was.
 *  ripple       — offsets the texture lookup: pixels move (fragment stage).
 *  melt         — drops vertices per column: pixels move (vertex stage).
 *
 * The maths mirrors `meltShape` / `rippleOffset` in rules.ts exactly, so the
 * lab can say which control you *saw* under a click, and compare it with the
 * one the browser *hit* through the unmelted geometry.
 */
import { Color, DoubleSide, LinearSRGBColorSpace, ShaderMaterial, Vector2, type Texture } from 'three';

const vertexShader = /* glsl */ `
  uniform vec2 uSize;   // element CSS px
  uniform vec2 uPlane;  // plane world units
  uniform float uMelt;  // element CSS px
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float u = uv.x * uSize.x;
    float drop = uMelt * (0.55 + 0.45 * sin(u * 0.045 + uTime * 0.6));
    vec3 p = position;
    p.y -= drop * uPlane.y / uSize.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec2 uSize;
  uniform float uRipple;
  uniform float uHeat;
  uniform float uGrain;
  uniform float uTime;
  uniform vec3 uHeatColor;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 e = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);       // element px, y down
    vec2 off = vec2(uRipple * sin(e.y * 0.09 + uTime * 2.0), uRipple * 0.5 * cos(e.x * 0.07 + uTime * 1.7));
    vec2 s = e + off;
    vec2 suv = vec2(s.x / uSize.x, 1.0 - s.y / uSize.y);
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) discard;
    vec4 c = uHasMap > 0.5 ? texture2D(uMap, suv) : vec4(0.97, 0.86, 0.73, 1.0);

    // Lith print: shadows sink to red-black, highlights burn toward the heat colour.
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 lith = mix(vec3(0.07, 0.015, 0.0), mix(uHeatColor, vec3(1.0, 0.96, 0.88), smoothstep(0.75, 1.0, lum)), smoothstep(0.04, 0.85, lum));
    vec3 col = mix(c.rgb, lith, uHeat);
    col += uHeat * 0.18 * uHeatColor * smoothstep(0.7, 1.0, lum) * (0.6 + 0.4 * sin(uTime * 3.0 + e.x * 0.05));
    col += (hash(floor(e * 1.5) + floor(uTime * 12.0)) - 0.5) * uGrain * 0.35;
    gl_FragColor = vec4(col, c.a);
  }
`;

export interface MeltUniforms {
  heat: number;
  grain: number;
  ripple: number;
  melt: number;
  time: number;
}

export function createMeltMaterial(element: { width: number; height: number }, plane: { width: number; height: number }) {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: DoubleSide,
    uniforms: {
      uMap: { value: null as Texture | null },
      uHasMap: { value: 0 },
      uSize: { value: new Vector2(element.width, element.height) },
      uPlane: { value: new Vector2(plane.width, plane.height) },
      uMelt: { value: 0 },
      uRipple: { value: 0 },
      uHeat: { value: 0 },
      uGrain: { value: 0 },
      uTime: { value: 0 },
      uHeatColor: { value: new Color().setStyle('#ff5a1f', LinearSRGBColorSpace) },
    },
  });
  return {
    material,
    setMap(texture: Texture | null) {
      material.uniforms.uMap!.value = texture;
      material.uniforms.uHasMap!.value = texture ? 1 : 0;
    },
    setSize(width: number, height: number) {
      (material.uniforms.uSize!.value as Vector2).set(width, height);
    },
    setHeatColor(css: string) {
      // The shader writes raw sRGB (like the snapshot it samples), so keep the
      // CSS colour's numbers unconverted.
      (material.uniforms.uHeatColor!.value as Color).setStyle(css.trim() || '#ff5a1f', LinearSRGBColorSpace);
    },
    set(u: MeltUniforms) {
      material.uniforms.uHeat!.value = u.heat;
      material.uniforms.uGrain!.value = u.grain;
      material.uniforms.uRipple!.value = u.ripple;
      material.uniforms.uMelt!.value = u.melt;
      material.uniforms.uTime!.value = u.time;
    },
  };
}
