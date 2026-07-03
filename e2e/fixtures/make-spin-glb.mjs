// Generates e2e/fixtures/spin.glb — a minimal valid ANIMATED GLB (binary glTF)
// used by the GLB asset-viewer e2e + the umbrella harness journey. One triangle
// node with TWO animation clips ("CharacterArmature|Spin": Y rotation;
// "CharacterArmature|Bob": vertical translation) — rig-namespaced like real
// exporter output, so tests can assert the kid-facing SHORT labels ("Spin"/"Bob"),
// switching between clips, AND that copy-name yields the FULL name. Deterministic:
// re-running produces byte-identical output. Run from airbotix-app/:
//   node e2e/fixtures/make-spin-glb.mjs
// ⚠️ The umbrella harness keeps a byte-copy at harness/fixtures/spin.glb — after
// regenerating, copy the new bytes there too.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const f32 = (values) => {
  const buf = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => buf.writeFloatLE(v, i * 4));
  return buf;
};

// Geometry: one upright triangle. Animation inputs: 3 keyframes over 1 s.
const positions = f32([-0.5, 0, 0, 0.5, 0, 0, 0, 0.8, 0]);
const times = f32([0, 0.5, 1]);
// "Spin": quaternions for a full Y-axis turn (0 → π → 2π).
const rotations = f32([0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, -1]);
// "Bob": rise and settle back.
const translations = f32([0, 0, 0, 0, 0.3, 0, 0, 0, 0]);

const bin = Buffer.concat([positions, times, rotations, translations]);
const view = (byteOffset, byteLength) => ({ buffer: 0, byteOffset, byteLength });

const gltf = {
  asset: { version: '2.0', generator: 'airbotix spin.glb fixture' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Spinner' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  animations: [
    {
      name: 'CharacterArmature|Spin',
      channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }],
      samplers: [{ input: 1, output: 2, interpolation: 'LINEAR' }],
    },
    {
      name: 'CharacterArmature|Bob',
      channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
      samplers: [{ input: 1, output: 3, interpolation: 'LINEAR' }],
    },
  ],
  buffers: [{ byteLength: bin.length }],
  bufferViews: [
    view(0, positions.length),
    view(positions.length, times.length),
    view(positions.length + times.length, rotations.length),
    view(positions.length + times.length + rotations.length, translations.length),
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      min: [-0.5, 0, 0],
      max: [0.5, 0.8, 0],
    },
    { bufferView: 1, componentType: 5126, count: 3, type: 'SCALAR', min: [0], max: [1] },
    { bufferView: 2, componentType: 5126, count: 3, type: 'VEC4' },
    { bufferView: 3, componentType: 5126, count: 3, type: 'VEC3' },
  ],
};

// GLB container: 12-byte header + JSON chunk (space-padded to 4) + BIN chunk
// (zero-padded to 4).
const pad4 = (n) => (4 - (n % 4)) % 4;
const jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length), 0x20)]);
const binChunk = Buffer.concat([bin, Buffer.alloc(pad4(bin.length), 0x00)]);
const chunkHeader = (length, type) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(length, 0);
  h.writeUInt32LE(type, 4);
  return h;
};
const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // 'glTF'
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);

const glb = Buffer.concat([
  header,
  chunkHeader(jsonChunk.length, 0x4e4f534a), // 'JSON'
  jsonChunk,
  chunkHeader(binChunk.length, 0x004e4942), // 'BIN\0'
  binChunk,
]);

const out = join(dirname(fileURLToPath(import.meta.url)), 'spin.glb');
writeFileSync(out, glb);
console.log(`wrote ${out} (${glb.length} bytes)`);
