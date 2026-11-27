// WebGL renderer + post chain: MSAA HDR target -> bloom -> single output pass (ACES + sRGB + grade).
// Includes dynamic resolution: steps pixel ratio / bloom / shadows to hold the target frame rate.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export type Quality = 'high' | 'low';

const MAX_PIXEL_RATIO = 1.5;
const MIN_PIXEL_RATIO = 0.6;

/** Tone mapping, sRGB conversion, saturation and vignette in one full-screen pass. */
const OutputGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    toneMappingExposure: { value: 0.62 },
    uVignette: { value: 0.32 },
    uSaturation: { value: 1.12 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVignette; uniform float uSaturation; varying vec2 vUv;
    #include <common>
    #include <tonemapping_pars_fragment>
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = ACESFilmicToneMapping(c.rgb);
      c = sRGBTransferOETF(c);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, uSaturation) * vec3(1.02, 1.0, 0.97);
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = c;
    }`,
};

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  quality: Quality = 'high';
  /** Dynamic resolution state. */
  autoScale = true;
  private pixelRatio: number;
  private maxRatio: number;
  private acc = 0;
  private frames = 0;
  private cooldown = 2.5;
  private shadowsAllowed = true;
  private bloomAllowed = true;

  constructor(container: HTMLElement, private scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.maxRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    this.pixelRatio = this.maxRatio;
    r.setPixelRatio(this.pixelRatio);
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping; // done in the output pass
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(r.domElement);
    this.renderer = r;

    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 2 });
    this.composer = new EffectComposer(r, target);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.45, 0.3, 8.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new ShaderPass(OutputGradeShader));
    this.composer.setSize(window.innerWidth, window.innerHeight);

    window.addEventListener('resize', () => this.resize());
  }

  get canvas() { return this.renderer.domElement; }
  get currentPixelRatio() { return this.pixelRatio; }
  get bloomOn() { return this.bloom.enabled; }
  get shadowsOn() { return this.renderer.shadowMap.enabled; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
  }

  private setPixelRatio(pr: number) {
    this.pixelRatio = Math.round(pr * 100) / 100;
    this.resize();
  }

  private setShadows(on: boolean) {
    if (this.renderer.shadowMap.enabled === on) return;
    this.renderer.shadowMap.enabled = on;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true)); else if (m) m.needsUpdate = true;
    });
  }

  /** Manual quality toggle (Q). Low = 1x resolution, no bloom, no shadows. */
  setQuality(q: Quality) {
    this.quality = q;
    const high = q === 'high';
    this.shadowsAllowed = high;
    this.bloomAllowed = high;
    this.bloom.enabled = high;
    this.setShadows(high);
    this.setPixelRatio(high ? this.maxRatio : Math.min(1, this.maxRatio));
    this.cooldown = 2;
  }

  /** Graphics mode from settings: auto = dynamic resolution, high/low = fixed. */
  setMode(mode: 'auto' | 'high' | 'low') {
    this.autoScale = mode === 'auto';
    this.setQuality(mode === 'low' ? 'low' : 'high');
  }

  /** Dynamic resolution: call every frame with the real (unclamped) frame time in seconds. */
  adapt(dt: number) {
    if (!this.autoScale || dt <= 0 || dt > 0.5) return;
    this.acc += dt;
    this.frames++;
    this.cooldown -= dt;
    if (this.acc < 1) return;
    const avgMs = (this.acc / this.frames) * 1000;
    this.acc = 0;
    this.frames = 0;
    if (this.cooldown > 0) return;
    if (avgMs > 19) {
      // Too slow: shed resolution first, then bloom, then shadows.
      if (this.pixelRatio > MIN_PIXEL_RATIO + 0.01) this.setPixelRatio(Math.max(MIN_PIXEL_RATIO, this.pixelRatio - 0.2));
      else if (this.bloom.enabled) this.bloom.enabled = false;
      else if (this.renderer.shadowMap.enabled) this.setShadows(false);
      this.cooldown = 1.2;
    } else if (avgMs < 12.5) {
      // Plenty of headroom (high refresh displays): restore in reverse order.
      if (!this.renderer.shadowMap.enabled && this.shadowsAllowed) this.setShadows(true);
      else if (!this.bloom.enabled && this.bloomAllowed) this.bloom.enabled = true;
      else if (this.pixelRatio < (this.quality === 'high' ? this.maxRatio : 1) - 0.01) this.setPixelRatio(Math.min(this.maxRatio, this.pixelRatio + 0.1));
      this.cooldown = 3;
    }
  }

  render() {
    this.composer.render();
  }
}
