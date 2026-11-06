/**
 * Holographic foil: a colour-only shader for cards in the exhibition.
 *
 * The vertex shader is a plain projection. Only colour changes: bending the
 * card in a vertex shader would move pixels away from where the element's
 * geometry says they are (see docs/CONCEPTS.md, "Shaders never move
 * vertices"). Iridescence comes from the viewing angle, the uv diagonal and
 * time, and is weighted by the texel's lightness so dark text stays legible.
 *
 * Colours are handled in display space: textures are uploaded raw (no colour
 * space conversion) and the output is written as-is.
 */
import { Color, LinearSRGBColorSpace, ShaderMaterial, type Texture } from 'three';

/** Keep hex values as written: this shader works in display space. */
const raw = (hex: string) => new Color().setStyle(hex, LinearSRGBColorSpace);

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float hasMap;
  uniform float foil;
  uniform float time;
  uniform float dim;
  uniform vec3 tintA;
  uniform vec3 tintB;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  vec3 spectrum(float h) {
    return 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));
  }

  void main() {
    vec4 base = hasMap > 0.5 ? texture2D(map, vUv) : vec4(tintA, 1.0);
    float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
    float band = vUv.x * 1.2 + vUv.y * 0.8 + (1.0 - facing) * 2.2 + time * 0.06;
    vec3 irid = mix(spectrum(band), mix(tintA, tintB, 0.5 + 0.5 * sin(band * 6.28318)), 0.4);
    float glint = smoothstep(0.94, 1.0, sin(band * 14.0)) * 0.35;
    float light = dot(base.rgb, vec3(0.299, 0.587, 0.114));
    vec3 foiled = base.rgb * (0.82 + 0.34 * irid) + irid * glint;
    vec3 colour = mix(base.rgb, foiled, foil * (0.2 + 0.6 * light));
    gl_FragColor = vec4(colour * dim, base.a);
  }
`;

export interface FoilMaterial extends ShaderMaterial {
  uniforms: {
    map: { value: Texture | null };
    hasMap: { value: number };
    foil: { value: number };
    time: { value: number };
    dim: { value: number };
    tintA: { value: Color };
    tintB: { value: Color };
  };
}

export function createFoilMaterial(tintA: string, tintB: string): FoilMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    uniforms: {
      map: { value: null },
      hasMap: { value: 0 },
      foil: { value: 1 },
      time: { value: 0 },
      dim: { value: 1 },
      tintA: { value: raw(tintA) },
      tintB: { value: raw(tintB) },
    },
  }) as FoilMaterial;
}

export function setFoilMap(material: FoilMaterial, texture: Texture | null): void {
  material.uniforms.map.value = texture;
  material.uniforms.hasMap.value = texture ? 1 : 0;
}
