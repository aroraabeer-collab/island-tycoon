// Stylized tropical water: PBR standard material (env reflections, fog, sun specular) patched with
// Gerstner displacement, depth-based turquoise->deep blue tint, shoreline foam and ripple normals.
import * as THREE from 'three';
import { wavesGLSL } from './waves';
import { baseHeight } from '../world/heights';
import { globalUniforms } from '../world/models/kit';

const DEPTH_MIN = -460;
const DEPTH_SIZE = 920;
const DEPTH_RES = 512;
const DEPTH_MAX = 12;

/** Polar grid: dense near the island, coarse towards the horizon. */
function polarGrid(): THREE.BufferGeometry {
  const radii: number[] = [0];
  let r = 0;
  while (r < 480) { r += r < 220 ? 2.0 : 2.8; radii.push(r); }
  while (r < 6000) { r *= 1.12; radii.push(r); }
  const segs = 280;
  const pos: number[] = [];
  const idx: number[] = [];
  pos.push(0, 0, 0);
  for (let i = 1; i < radii.length; i++) {
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * radii[i], 0, Math.sin(a) * radii[i]);
    }
  }
  for (let s = 0; s < segs; s++) idx.push(0, 1 + ((s + 1) % segs), 1 + s);
  for (let i = 1; i < radii.length - 1; i++) {
    const a0 = 1 + (i - 1) * segs, a1 = 1 + i * segs;
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      idx.push(a0 + s, a0 + s1, a1 + s, a0 + s1, a1 + s1, a1 + s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6000);
  return g;
}

/** Bake water depth (0 = shore/land .. 1 = DEPTH_MAX meters) into a texture for the shader. */
function depthTexture(): THREE.DataTexture {
  const data = new Uint8Array(DEPTH_RES * DEPTH_RES);
  for (let j = 0; j < DEPTH_RES; j++) for (let i = 0; i < DEPTH_RES; i++) {
    const x = DEPTH_MIN + ((i + 0.5) / DEPTH_RES) * DEPTH_SIZE;
    const z = DEPTH_MIN + ((j + 0.5) / DEPTH_RES) * DEPTH_SIZE;
    const d = Math.max(0, Math.min(1, -baseHeight(x, z) / DEPTH_MAX));
    data[j * DEPTH_RES + i] = Math.round(d * 255);
  }
  const tex = new THREE.DataTexture(data, DEPTH_RES, DEPTH_RES, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class Water {
  readonly mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.12, metalness: 0.0, transparent: true, envMapIntensity: 0.8,
    });
    const uniforms = {
      uTime: globalUniforms.uTime,
      uDepthTex: { value: depthTexture() },
      uDepthMin: { value: DEPTH_MIN },
      uDepthSize: { value: DEPTH_SIZE },
      uShallow: { value: new THREE.Color(0x3ee6d2) },
      uMid: { value: new THREE.Color(0x13a6c9) },
      uDeep: { value: new THREE.Color(0x0b4f8f) },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uDepthTex; uniform float uDepthMin; uniform float uDepthSize;
          varying vec3 vWPos; varying float vDepth;
          ${wavesGLSL()}`)
        .replace('#include <beginnormal_vertex>', `
          vec2 wuv = (position.xz - uDepthMin) / uDepthSize;
          float depthN = (wuv.x < 0.0 || wuv.y < 0.0 || wuv.x > 1.0 || wuv.y > 1.0) ? 1.0 : texture2D(uDepthTex, wuv).r;
          vDepth = depthN * ${12.0.toFixed(1)};
          float damp = clamp(vDepth / 4.0, 0.15, 1.0) * (1.0 - smoothstep(700.0, 1400.0, length(position.xz)));
          vec3 wNrm;
          vec3 wDisp = waveDisplace(position.xz, damp, wNrm);
          vec3 objectNormal = wNrm;`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = position + wDisp;
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uTime; uniform vec3 uShallow; uniform vec3 uMid; uniform vec3 uDeep;
          varying vec3 vWPos; varying float vDepth;
          float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
          float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float dpt = vDepth;
          vec3 wcol = mix(uShallow, uMid, smoothstep(0.3, 3.5, dpt));
          wcol = mix(wcol, uDeep, smoothstep(3.5, 11.0, dpt));
          float n = vnoise(vWPos.xz * 0.35 + vec2(uTime * 0.3, uTime * 0.2)) * 0.6 + vnoise(vWPos.xz * 1.1 - uTime * 0.4) * 0.4;
          float shoreBand = 1.0 - smoothstep(0.0, 1.1, dpt);
          float wavesFoam = smoothstep(0.55, 0.9, sin(dpt * 5.0 - uTime * 1.8) * 0.5 + 0.5) * (1.0 - smoothstep(0.4, 2.2, dpt));
          float foam = clamp(shoreBand * smoothstep(0.25, 0.65, n) + wavesFoam * smoothstep(0.35, 0.7, n), 0.0, 1.0);
          float crest = smoothstep(0.7, 1.0, vWPos.y) * smoothstep(0.45, 0.8, n) * 0.5 * (1.0 - smoothstep(40.0, 140.0, distance(cameraPosition, vWPos)));
          foam = max(foam, crest);
          diffuseColor.rgb = mix(wcol, vec3(1.0), foam);
          diffuseColor.a = mix(mix(0.42, 0.93, smoothstep(0.2, 6.0, dpt)), 1.0, foam);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          // Cheap analytic ripples (a few crossing sine waves) instead of value-noise derivatives.
          vec2 rp = vWPos.xz;
          float rippleFade = 1.0 - smoothstep(25.0, 160.0, distance(cameraPosition, vWPos));
          vec2 g1 = cos(dot(rp, vec2(0.83, 0.55)) * 1.7 + uTime * 1.9) * vec2(0.83, 0.55);
          vec2 g2 = cos(dot(rp, vec2(-0.42, 0.91)) * 2.3 + uTime * 2.4) * vec2(-0.42, 0.91);
          vec2 g3 = cos(dot(rp, vec2(0.97, -0.24)) * 3.9 - uTime * 2.9) * vec2(0.97, -0.24) * 0.5;
          vec2 rg = (g1 + g2 + g3) * 0.09 * rippleFade;
          vec3 ripple = vec3(rg.x, 0.0, rg.y);
          normal = normalize(normal + (viewMatrix * vec4(ripple, 0.0)).xyz);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.7, clamp(diffuseColor.a - 0.93, 0.0, 1.0) * 14.0);`);
    };
    this.mesh = new THREE.Mesh(polarGrid(), mat);
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }
}
