// Loads and caches GLB models (meshopt), textures and HDRIs listed in the generated manifest.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MODELS, HDRIS, type ModelId, type HdriId } from './manifest';

const BASE = (import.meta as any).env?.BASE_URL ?? './';
export const assetUrl = (path: string) => `${BASE}${path}`;

export class AssetLoader {
  readonly manager = new THREE.LoadingManager();
  private gltf = new GLTFLoader(this.manager).setMeshoptDecoder(MeshoptDecoder);
  private texLoader = new THREE.TextureLoader(this.manager);
  private models = new Map<string, Promise<THREE.Group>>();
  private textures = new Map<string, THREE.Texture>();
  anisotropy = 8;
  /** 0..1 load progress of everything requested so far. */
  progress = 1;

  constructor() {
    this.manager.onProgress = (_url, loaded, total) => { this.progress = total ? loaded / total : 1; };
  }

  /** Raw cached GLTF scene (do not mutate; use model() for instances). */
  private source(id: ModelId | string, url?: string): Promise<THREE.Group> {
    let p = this.models.get(id);
    if (!p) {
      const path = url ?? (MODELS as Record<string, string>)[id];
      if (!path) return Promise.reject(new Error(`Unknown model ${id}`));
      p = this.gltf.loadAsync(assetUrl(path)).then((g) => {
        g.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
        });
        g.scene.userData.animations = g.animations;
        return g.scene;
      });
      this.models.set(id, p);
    }
    return p;
  }

  /** A fresh instance of a model (skinned meshes are cloned correctly). */
  async model(id: ModelId | string, url?: string): Promise<THREE.Object3D> {
    const src = await this.source(id, url);
    const inst = cloneSkinned(src);
    inst.userData.animations = src.userData.animations;
    return inst;
  }

  /** A model scaled so its largest horizontal extent (or height) matches `size` meters, base at y=0. */
  async fitted(id: ModelId, size: number, axis: 'width' | 'height' = 'width'): Promise<THREE.Object3D> {
    const obj = await this.model(id);
    const box = new THREE.Box3().setFromObject(obj);
    const dim = box.getSize(new THREE.Vector3());
    const s = size / (axis === 'height' ? dim.y : Math.max(dim.x, dim.z) || 1);
    obj.scale.setScalar(s);
    const wrap = new THREE.Group();
    obj.position.y = -box.min.y * s;
    wrap.add(obj);
    return wrap;
  }

  /** Cached texture by URL path; color textures are sRGB. Returns immediately (loads async). */
  texture(path: string, color: boolean): THREE.Texture {
    const key = path + (color ? '#c' : '#l');
    let t = this.textures.get(key);
    if (!t) {
      t = this.texLoader.load(assetUrl(path));
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.anisotropy;
      this.textures.set(key, t);
    }
    return t;
  }

  hdri(id: HdriId): Promise<THREE.DataTexture> {
    return new HDRLoader(this.manager).loadAsync(assetUrl(HDRIS[id]));
  }
}

export const assets = new AssetLoader();
