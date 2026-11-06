/**
 * The print shader: fiber paper that "develops" an HTML snapshot.
 *
 * Darker tones appear first, like silver halide in developer. Grain fades as
 * the print develops. Output is written as-is (sRGB), matching how the HTML
 * looked in the DOM; no lighting model touches the text.
 *
 * Important: this shader only changes colour, never vertex positions. If it
 * bent the paper, the DOM geometry we send to updateElementGeometry would no
 * longer match what's drawn and clicks would miss.
 */
import { Color, ShaderMaterial, type Texture } from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uDevelop;
  uniform float uTime;
  uniform float uHover;
  uniform vec3 uPaper;
  uniform vec3 uLight;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 paper = uPaper;
    vec4 snap = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(paper, 1.0);
    vec3 image = mix(paper, snap.rgb, snap.a);

    float lum = dot(image, vec3(0.299, 0.587, 0.114));
    float develop = clamp(uDevelop * 1.5 - lum * 0.5, 0.0, 1.0);
    vec3 color = mix(paper, image, develop);

    // Grain: strong on wet, undeveloped paper; nearly gone when fixed.
    float grain = hash(floor(vUv * vec2(520.0, 700.0)) + floor(uTime * 10.0)) - 0.5;
    color += grain * mix(0.07, 0.012, uDevelop);

    // Paper edge falloff and a whisper of safelight.
    vec2 edge = smoothstep(vec2(0.0), vec2(0.035), vUv) * smoothstep(vec2(0.0), vec2(0.035), 1.0 - vUv);
    color *= mix(0.86, 1.0, edge.x * edge.y);
    color *= mix(vec3(1.0), uLight, 0.05);
    color += uHover * 0.035;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface PrintMaterialOptions {
  paper: string;
  light: string;
}

export function createPrintMaterial({ paper, light }: PrintMaterialOptions): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uDevelop: { value: 0 },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uPaper: { value: new Color(paper) },
      uLight: { value: new Color(light) },
    },
  });
}

export function setPrintTexture(material: ShaderMaterial, texture: Texture | null, ready: boolean): void {
  material.uniforms.uMap!.value = texture;
  material.uniforms.uHasMap!.value = texture && ready ? 1 : 0;
}
