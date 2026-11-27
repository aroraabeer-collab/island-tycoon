// Sky dome, sun + shadows that follow the player, sky-derived PBR environment, and fog.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/** Sky dome with a brightness gain so the HDR sky doesn't flood the bloom pass. */
function makeSky(gain: number): Sky {
  const sky = new Sky();
  const m = sky.material;
  m.uniforms.uSkyGain = { value: gain };
  m.fragmentShader = 'uniform float uSkyGain;\n' + m.fragmentShader.replace(
    'gl_FragColor = vec4( texColor, 1.0 );',
    'gl_FragColor = vec4( texColor * uSkyGain, 1.0 );',
  );
  return sky;
}

export const SKY_GAIN = 0.42;

export class Environment {
  readonly sun: THREE.DirectionalLight;
  readonly sunDir = new THREE.Vector3();
  private shadowSize = 80;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    const sky = makeSky(SKY_GAIN);
    sky.scale.setScalar(1000);
    const u = sky.material.uniforms;
    u.turbidity.value = 3.5;
    u.rayleigh.value = 1.4;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.85;
    u.cloudCoverage.value = 0.45;
    u.cloudDensity.value = 0.5;
    u.cloudScale.value = 0.00025;

    // Late-afternoon tropical sun.
    const elevation = THREE.MathUtils.degToRad(38);
    const azimuth = THREE.MathUtils.degToRad(215);
    this.sunDir.setFromSphericalCoords(1, Math.PI / 2 - elevation, azimuth);
    u.sunPosition.value.copy(this.sunDir);

    // Environment map from the sky itself (no sun disc to avoid hot spots).
    const pmrem = new THREE.PMREMGenerator(renderer);
    u.showSunDisc.value = 0;
    const envScene = new THREE.Scene();
    const envSky = makeSky(SKY_GAIN);
    envSky.scale.setScalar(1000);
    envSky.material.uniforms = THREE.UniformsUtils.clone(u);
    envScene.add(envSky);
    scene.environment = pmrem.fromScene(envScene as any, 0.02).texture;
    scene.environmentIntensity = 1.0;
    u.showSunDisc.value = 1;
    pmrem.dispose();

    // Bake the sky (with sun disc + clouds) into a cubemap once: the cloud shader is far too
    // expensive to run per pixel every frame, and the clouds barely move anyway.
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    const cubeRT = new THREE.WebGLCubeRenderTarget(1024, { type: THREE.HalfFloatType, generateMipmaps: false });
    const cubeCam = new THREE.CubeCamera(1, 5000, cubeRT);
    cubeCam.update(renderer, skyScene);
    scene.background = cubeRT.texture;
    sky.geometry.dispose();
    sky.material.dispose();

    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const cam = sun.shadow.camera;
    cam.left = -this.shadowSize; cam.right = this.shadowSize;
    cam.top = this.shadowSize; cam.bottom = -this.shadowSize;
    cam.near = 1; cam.far = 500;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    this.sun = sun;

    scene.add(new THREE.HemisphereLight(0xbfe6ff, 0xe8d3a0, 0.55));
    scene.fog = new THREE.FogExp2(0xbcdcec, 0.0018);
  }

  /** Keep the shadow frustum centered on the player, snapped to texels to avoid shimmer. */
  update(focus: THREE.Vector3) {
    const texel = (this.shadowSize * 2) / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / texel) * texel;
    const fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.position.set(fx, focus.y, fz).addScaledVector(this.sunDir, 200);
  }
}
