/**
 * Volumetric light shafts: an open cone of additive light under each lamp,
 * brightest at the bulb and fading to nothing at the floor, softened at its
 * silhouette so it reads as lit dust in the air rather than a solid cone.
 * A few draw calls of cheap maths; no post-processing pass.
 */
import { AdditiveBlending, Color, ConeGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from 'three';

const vertexShader = /* glsl */ `
  varying float vHeight;
  varying float vRim;
  varying vec3 vWorld;
  void main() {
    vHeight = uv.y; // 1 at the apex, 0 at the base
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec3 n = normalize(mat3(modelMatrix) * normal);
    vec3 toCamera = normalize(cameraPosition - world.xyz);
    vRim = abs(dot(n, toCamera));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying float vHeight;
  varying float vRim;
  varying vec3 vWorld;
  void main() {
    float fall = pow(vHeight, 2.2);
    float rim = smoothstep(0.0, 0.65, vRim);
    float motes = 0.85 + 0.15 * sin(vWorld.y * 7.0 + uTime * 0.6) * sin(vWorld.x * 5.0 - uTime * 0.4);
    gl_FragColor = vec4(uColor * fall * rim * motes * uIntensity, 1.0);
  }
`;

export class LightShafts {
  readonly root = new Group();
  private readonly material: ShaderMaterial;

  constructor(xs: number[], color: string, apexY: number, z: number) {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uColor: { value: new Color(color) }, uIntensity: { value: 0.085 }, uTime: { value: 0 } },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const height = 6.2;
    const geometry = new ConeGeometry(2.4, height, 40, 1, true);
    for (const x of xs) {
      const cone = new Mesh(geometry, this.material);
      cone.position.set(x, apexY - height / 2, z);
      this.root.add(cone);
    }
  }

  update(time: number): void {
    this.material.uniforms.uTime!.value = time;
  }
}
