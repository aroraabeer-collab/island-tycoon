// Asset pipeline: downloads CC0 assets listed in scripts/assets.config.json, optimizes them for the
// web and writes public/assets/**, src/assets/manifest.ts and CREDITS.md.
//
//   node scripts/fetch-assets.mjs            (skips files that already exist)
//   node scripts/fetch-assets.mjs --force    (re-download everything)
//
// Sources: Poly Haven (all assets CC0). Textures -> WebP (diff/nor_gl/arm), models -> GLB with
// simplified meshes, WebP textures and meshopt compression. HDRIs are kept as .hdr.
import { mkdirSync, existsSync, writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'public/assets');
const FORCE = process.argv.includes('--force');
const UA = 'island-tycoon-asset-fetch/1.0';
const API = 'https://api.polyhaven.com';
const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/assets.config.json'), 'utf8'));

const credits = [];
const manifest = { textures: {}, models: {}, hdris: {} };

async function get(url, as = 'json') {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return as === 'json' ? await r.json() : Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (attempt === 3) throw new Error(`${url}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 800 * attempt));
    }
  }
}

const ensureDir = (p) => mkdirSync(dirname(p), { recursive: true });
const log = (...a) => console.log(...a);

async function fetchHdri({ id, res = '2k' }) {
  const out = join(OUT, 'hdri', `${id}.hdr`);
  manifest.hdris[id] = `assets/hdri/${id}.hdr`;
  credits.push({ id, kind: 'HDRI', url: `https://polyhaven.com/a/${id}` });
  if (existsSync(out) && !FORCE) return log('  cached', id);
  const files = await get(`${API}/files/${id}`);
  ensureDir(out);
  writeFileSync(out, await get(files.hdri[res].hdr.url, 'buf'));
  log('  hdri', id);
}

const TEX_MAPS = { diff: 'Diffuse', nor: 'nor_gl', arm: 'arm' };

async function fetchTexture({ id, size = 1024 }) {
  manifest.textures[id] = {};
  credits.push({ id, kind: 'Texture', url: `https://polyhaven.com/a/${id}` });
  let files = null;
  for (const [short, key] of Object.entries(TEX_MAPS)) {
    const out = join(OUT, 'tex', `${id}_${short}.webp`);
    manifest.textures[id][short] = `assets/tex/${id}_${short}.webp`;
    if (existsSync(out) && !FORCE) continue;
    files ??= await get(`${API}/files/${id}`);
    const src = files[key]?.['1k']?.jpg?.url ?? files[key]?.['2k']?.jpg?.url;
    if (!src) { log(`  ! ${id} has no ${key}`); delete manifest.textures[id][short]; continue; }
    const jpg = await get(src, 'buf');
    ensureDir(out);
    await sharp(jpg).resize(size, size).webp({ quality: short === 'nor' ? 90 : 82 }).toFile(out);
  }
  log('  texture', id);
}

async function fetchModel(io, { id, simplify: ratio, texSize = 512 }) {
  const out = join(OUT, 'models', `${id}.glb`);
  manifest.models[id] = `assets/models/${id}.glb`;
  credits.push({ id, kind: 'Model', url: `https://polyhaven.com/a/${id}` });
  if (existsSync(out) && !FORCE) return log('  cached', id);
  const files = await get(`${API}/files/${id}`);
  const g = files.gltf['1k'].gltf;
  const dir = mkdtempSync(join(tmpdir(), `ph-${id}-`));
  writeFileSync(join(dir, 'model.gltf'), await get(g.url, 'buf'));
  for (const [rel, f] of Object.entries(g.include ?? {})) {
    const p = join(dir, rel);
    ensureDir(p);
    writeFileSync(p, await get(f.url, 'buf'));
  }
  const doc = await io.read(join(dir, 'model.gltf'));
  const steps = [dedup(), weld()];
  if (ratio) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }));
  steps.push(
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [texSize, texSize], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await doc.transform(...steps);
  ensureDir(out);
  await io.write(out, doc);
  log('  model', id, ratio ? `(simplified to ${ratio})` : '');
}

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  void EXTMeshoptCompression;
  log('HDRIs'); for (const h of cfg.hdris) await fetchHdri(h);
  log('Textures'); for (const t of cfg.textures) await fetchTexture(t);
  log('Models'); for (const m of cfg.models) await fetchModel(io, m);

  const ts = `// GENERATED by scripts/fetch-assets.mjs — do not edit by hand.
export const HDRIS = ${JSON.stringify(manifest.hdris, null, 2)} as const;
export const TEXTURES = ${JSON.stringify(manifest.textures, null, 2)} as const;
export const MODELS = ${JSON.stringify(manifest.models, null, 2)} as const;
export type TextureId = keyof typeof TEXTURES;
export type ModelId = keyof typeof MODELS;
export type HdriId = keyof typeof HDRIS;
`;
  mkdirSync(join(ROOT, 'src/assets'), { recursive: true });
  writeFileSync(join(ROOT, 'src/assets/manifest.ts'), ts);
  const md = ['# Credits', '', 'All third-party assets below are licensed **CC0 1.0** (public domain) by Poly Haven (https://polyhaven.com).', '',
    '| Asset | Type | Source |', '|---|---|---|', ...credits.map((c) => `| ${c.id} | ${c.kind} | ${c.url} |`), ''].join('\n');
  writeFileSync(join(ROOT, 'CREDITS.md'), md);
  log(`Done: ${Object.keys(manifest.textures).length} textures, ${Object.keys(manifest.models).length} models, ${Object.keys(manifest.hdris).length} HDRIs`);
}

main().catch((e) => { console.error(e); process.exit(1); });
