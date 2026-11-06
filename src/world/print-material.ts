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
import { Color, ShaderMaterial, Vector3, type Texture } from 'three';

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
  /** Safelight loupe: xy in uv, z strength (0 = off). */
  uniform vec3 uLoupe;
  uniform float uAspect;
  uniform float uDim;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 paper = uPaper;

    // The loupe: a disc under the pointer where the latent image develops,
    // seen through a slightly magnifying glass with a safelight rim.
    vec2 toLoupe = (vUv - uLoupe.xy) * vec2(uAspect, 1.0);
    float dist = length(toLoupe);
    float radius = 0.17 * uLoupe.z;
    float inside = 1.0 - smoothstep(radius - 0.012, radius, dist);
    float rim = smoothstep(radius - 0.02, radius - 0.004, dist) * inside;
    vec2 uv = mix(vUv, uLoupe.xy + (vUv - uLoupe.xy) * 0.86, inside);

    vec4 snap = uHasMap > 0.5 ? texture2D(uMap, uv) : vec4(paper, 1.0);
    vec3 image = mix(paper, snap.rgb, snap.a);

    float lum = dot(image, vec3(0.299, 0.587, 0.114));
    float developed = max(uDevelop, inside * 0.97);
    float develop = clamp(developed * 1.5 - lum * 0.5, 0.0, 1.0);
    vec3 color = mix(paper, image, develop);
    // Seen through red glass: the peek is tinted like the safelight.
    color = mix(color, color * vec3(1.0, 0.78, 0.72), inside * (1.0 - uDevelop));
    color = mix(color, uLight, rim * 0.85);

    // Grain: strong on wet, undeveloped paper; nearly gone when fixed.
    float grain = hash(floor(vUv * vec2(520.0, 700.0)) + floor(uTime * 10.0)) - 0.5;
    color += grain * mix(0.07, 0.012, developed);

    // Paper edge falloff and a whisper of safelight.
    vec2 edge = smoothstep(vec2(0.0), vec2(0.035), vUv) * smoothstep(vec2(0.0), vec2(0.035), 1.0 - vUv);
    color *= mix(0.86, 1.0, edge.x * edge.y);
    color *= mix(vec3(1.0), uLight, 0.05);
    color += uHover * 0.035;
    color *= 1.0 - uDim * 0.72;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface PrintMaterialOptions {
  paper: string;
  light: string;
  /** Plane width / height, so the loupe is round. */
  aspect: number;
}

export function createPrintMaterial({ paper, light, aspect }: PrintMaterialOptions): ShaderMaterial {
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
      uLoupe: { value: new Vector3(0.5, 0.5, 0) },
      uAspect: { value: aspect },
      uDim: { value: 0 },
    },
  });
}

export function setPrintTexture(material: ShaderMaterial, texture: Texture | null, ready: boolean): void {
  material.uniforms.uMap!.value = texture;
  material.uniforms.uHasMap!.value = texture && ready ? 1 : 0;
}
