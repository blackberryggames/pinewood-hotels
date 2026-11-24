// Night Desk — low poly characters, monsters, portraits
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FacePainter, hairTexture } from './face.js';

// ---------------------------------------------------------------- Blender models (game/models/*.glb)
export const TEMPLATES = {};
export async function loadModels(names = ['human_m', 'human_f', 'gaunt', 'crawler', 'weeper', 'hound', 'scare', 'rare_makima', 'human_f2']) {
  const loader = new GLTFLoader();
  await Promise.all(names.map(n => new Promise(res => loader.load(`models/${n}.glb`, g => { TEMPLATES[n] = g.scene; res(); }, undefined, e => { console.warn('model', n, e); res(); }))));
  return TEMPLATES;
}
const GLOW = { nd_glow: 0xffe8a0, nd_glowred: 0xff2a10 };
// clone a template, convert materials to the game's PSX lambert (keeping Blender vertex colours), map parts by name
export function instance(key, colors = {}) {
  const src = TEMPLATES[key]; if (!src) return null;
  const root = src.clone(true);
  const parts = {};
  root.traverse(o => {
    const nm = (o.name || '').replace(/^[a-z]+_/i, '').replace(/\d{3}(_\d+)?$/, '');   // ignore Blender .001 suffixes   // "gaunt_armL" -> "armL", "humanm_hair_short" -> "hair_short"
    if (o !== root && nm && !parts[nm]) parts[nm] = o;
    if (o.isMesh) {
      const m = o.material, name = m.name;
      const hasVC = !!o.geometry.attributes.color;
      o.userData.matName = name;
      const uniq = name === 'nd_iris' || name === 'nd_sclera';
      if (GLOW[name]) o.material = basic(GLOW[name]);
      else if (m.map) o.material = new THREE.MeshLambertMaterial({ map: m.map, color: 0xffffff });
      else o.material = mat(colors[name] ?? m.color.getHex(), { ...(hasVC ? { vertexColors: true } : {}), ...(uniq ? { unique: true, emissive: 0x000000 } : {}) });
      o.castShadow = true; o.receiveShadow = true;
    }
  });
  return { root, parts };
}


export const LAYER = { COMMON: 0, TRUE: 1, DISGUISE: 2, MAIN: 3 };
export const PSX = { snap: { value: new THREE.Vector2(240, 135) } };

export function patchPSX(m) { return m; }   // (PS1 vertex snapping + affine warping removed: textures no longer swim when you turn)

const matCache = new Map();
export function mat(color, opts = {}) {
  const { unique, ...rest } = opts;
  const key = color + '|' + Object.entries(rest).map(([k, v]) => k + ':' + (v && v.uuid ? v.uuid : v)).join(',');
  if (!unique && matCache.has(key)) return matCache.get(key);
  const m = patchPSX(new THREE.MeshLambertMaterial({ color, flatShading: false, ...rest }));
  if (!unique) matCache.set(key, m);
  return m;
}
export function basic(color, opts = {}) { return patchPSX(new THREE.MeshBasicMaterial({ color, ...opts })); }

function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  me.position.set(x, y, z); return me;
}
function cyl(rt, rb, h, seg, m, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  me.position.set(x, y, z); return me;
}

export function setLayer(obj, layer) { obj.traverse(o => o.layers.set(layer)); }
const hex = c => '#' + new THREE.Color(c).getHexString();

// ---------------------------------------------------------------- random params
export const SKINS = [0xf6dfcc, 0xf1d1b5, 0xe8c0a0, 0xe0ac86, 0xd29a6e, 0xc08458, 0xa86b45, 0x8d5a3a, 0x7b4a2d, 0x5a3520, 0x4a2a18, 0xe9c9a8];
export const HAIRS = [0x1b1410, 0x2a1a10, 0x3a2416, 0x5a3a22, 0x6b4423, 0xa0703a, 0xc89a5a, 0xd8b56a, 0xe8d8a8, 0x8a2e1a, 0x9a3a1a, 0x101010];
export const DYED = [0x2a4a8a, 0x8a2a5a, 0x3a7a5a, 0xc8c8d8, 0x6a2a8a];
export const SHIRTS = [0x6b2c2c, 0x2c4a6b, 0x3f5c3a, 0x7a6a3a, 0x4a3a5c, 0x8c8c8c, 0x222428, 0xa05a2a, 0x2e6b6b, 0x7a2e55, 0xc8c0a8];
export const PANTS = [0x22252b, 0x3a3a44, 0x2e3a52, 0x4a3b2a, 0x1a1a1a, 0x52524a];
export const EYES = [0x3a2616, 0x2a5c8a, 0x3f6b3a, 0x5a4a2a, 0x222222];

export function randomParams(gender, rnd = Math.random) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  const f = gender === 'f';
  const child = rnd() < 0.12;
  return {
    gender, child,
    skin: pick(SKINS),
    hairStyle: f ? pick(['long', 'long', 'long', 'pony', 'braid', 'pigtails', 'bun', 'bob', 'long', 'pony']) : pick(['short', 'short', 'buzz', 'curly', 'bald', 'slick', 'sidepart', 'mohawk', 'buzz', 'curly']),
    hairColor: rnd() < 0.06 ? pick(DYED) : pick(HAIRS),
    shirt: pick(SHIRTS), pants: pick(PANTS),
    skirt: f && !child && rnd() < 0.35,
    eye: pick(EYES),
    glasses: rnd() < 0.25,
    hat: rnd() < 0.24 ? pick(['beanie', 'cap', 'bucket']) : null,
    beard: !f && !child && rnd() < 0.3,
    height: child ? 0.78 : (f ? 0.94 : 1.0) + rnd() * 0.08,
    coat: rnd() < 0.25,
    outfit: f ? pick(['tee', 'hoodie', 'jacket', 'dress', 'suit', 'tank', 'sweater', 'tee']) : pick(['tee', 'suit', 'hoodie', 'jacket', 'sweater', 'tank', 'tee', 'suit']),
    legwear: f ? pick(['pants', 'pants', 'skirt', 'shorts', 'pants']) : pick(['pants', 'pants', 'pants', 'shorts']),
    pattern: pick(['solid', 'solid', 'solid', 'stripes', 'plaid', 'check']), denim: rnd() < 0.4,
    body2: f && rnd() < 0.5,
    shirt2: pick([0xe8e6e0, 0xd8dce4, 0xe8e0d0, 0xc8d0d8]),
    tie: pick([0x1e3048, 0x5a1a1a, 0x2a2a2a, 0x3a4a2a]),
    sleeves: rnd() < 0.5 ? 'short' : 'long',
    scarf: rnd() < 0.2, watch: rnd() < 0.35, earrings: f && rnd() < 0.45, necklace: f && rnd() < 0.3,
    headphones: rnd() < 0.12, backpack: rnd() < 0.15, sunglasses: rnd() < 0.08, earmuffs: rnd() < 0.08, facemask: false, vest: rnd() < 0.15, bag: rnd() < 0.18, chain: !f && rnd() < 0.15, apron: rnd() < 0.05, freckles: rnd() < 0.15, stubble: !f && rnd() < 0.5,
    makeup: f && rnd() < 0.4 ? pick(['120,80,140', '140,90,70', '60,80,120']) : null, lipColor: f ? pick([0xb0545a, 0xa04048, 0xc07070, 0x8a4a4a]) : null,
    browLift: (rnd() - 0.5) * 0.02, seed: rnd(),
    build: { w: 0.9 + rnd() * 0.24, d: 0.92 + rnd() * 0.2, legs: 0.95 + rnd() * 0.08, head: 0.94 + rnd() * 0.1 },
    hatColor: pick([0x2a3a5a, 0x5a1a1a, 0x2a2a2a, 0x3a4a2a, 0x8a6a2a]), scarfColor: pick([0x7a2a2a, 0x2a3a6a, 0xc8b89a, 0x3a5a3a, 0x5a4a6a]),
  };
}

// ---------------------------------------------------------------- fabric pattern textures (grayscale, tinted by the garment colour)
const FABRIC = {};
export function fabric(kind) {
  if (FABRIC[kind]) return FABRIC[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  if (kind === 'stripes') { g.fillStyle = 'rgba(0,0,0,0.38)'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 6); }
  else if (kind === 'plaid') { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 64; i += 21) { g.fillRect(i, 0, 8, 64); g.fillRect(0, i, 64, 8); } g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 10; i < 64; i += 21) { g.fillRect(i, 0, 2, 64); g.fillRect(0, i, 64, 2); } }
  else if (kind === 'check') { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) g.fillRect(x * 16, y * 16, 16, 16); }
  else if (kind === 'denim') { for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + Math.random() * 0.1})`; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 3); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (FABRIC[kind] = t);
}

// ---------------------------------------------------------------- skinning weights for the basemesh body + clothes
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rigGeometry(g, J) {
  if (g.userData.rigged) return;
  const pos = g.attributes.position, col = g.attributes.color, n = pos.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  // bones: 0 hips, 1 torso, 2 head, 3 armL, 4 armR, 5 legL, 6 legR
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const armMask = col && col.itemSize === 4 ? 1 - col.getW(i) : (Math.abs(x) > 0.183 && y < J.sY ? 1 : 0);
    const w = [0, 0, 0, 0, 0, 0, 0];
    let wa = armMask * (1 - 0.5 * ss(J.sY - 0.09, J.sY + 0.02, y));
    wa += (1 - armMask) * 0.5 * ss(J.sX - 0.08, J.sX - 0.01, Math.abs(x)) * ss(J.sY - 0.14, J.sY - 0.03, y) * (1 - ss(J.sY + 0.02, J.sY + 0.08, y));
    const wl = (1 - armMask) * ss(J.hip + 0.06, J.hip - 0.09, y);
    const wh = (1 - armMask) * ss(J.neck - 0.05, J.neck + 0.01, y);
    w[x >= 0 ? 3 : 4] = wa; w[x >= 0 ? 5 : 6] = wl * (1 - wa); w[2] = wh * (1 - wa);
    w[1] = Math.max(0, 1 - wa - w[5] - w[6] - w[2]);
    const idx = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => w[b] - w[a]).slice(0, 4);
    const tot = idx.reduce((s, k) => s + w[k], 0) || 1;
    idx.forEach((k, j) => { si[i * 4 + j] = k; sw[i * 4 + j] = w[k] / tot; });
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.userData.rigged = true;
}

// ---------------------------------------------------------------- human / disguised monster
export function buildCharacter(p, an = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skinM = mat(an.pale ? 0xa9b5b0 : p.skin);
  const shirtM = mat(p.shirt), pantsM = mat(p.pants), hairM = mat(p.hairColor);
  const shoeM = mat(0x18181a), darkM = mat(0x0a0606), lipM = mat(an.pale ? 0x4a3a40 : 0x7a3530);
  const parts = { blinkT: 1 + Math.random() * 3, blink: 0, twitchT: 2, twitch: 0, phase: Math.random() * 6, irises: [], eyeWhites: [] };

  const G = TEMPLATES['human_' + (p.gender === 'f' ? 'f' : 'm')];
  let torso, head, face;
  if (G) {
    const outfit = an.mannequin ? 'tee' : (p.coat ? 'coat' : (p.skirt && p.gender === 'f' ? 'dress' : (p.outfit || 'tee')));
    const SUITS = [0x22242a, 0x2e3440, 0x3a3a3a, 0x2a2018];
    const topCol = outfit === 'coat' ? (p.coatColor || 0x2a2a30) : outfit === 'suit' ? SUITS[(p.shirt >> 3) % SUITS.length] : p.shirt;
    const hairCol = p.hairStyle === 'buzz' ? new THREE.Color(p.hairColor).lerp(new THREE.Color(p.skin), 0.45).getHex() : p.hairColor;
    const skinCol = an.mannequin ? 0xd6c2a6 : an.pale ? 0xa9b5b0 : p.skin;
    const key = p.gender === 'f' ? (p.body2 && TEMPLATES.human_f2 ? 'human_f2' : 'human_f') : 'human_m';
    const inst = instance(key, {
      nd_skin: skinCol, nd_top: topCol, nd_top2: p.shirt2 || 0xe8e6e0, nd_tie: p.tie || 0x1e3048, nd_pants: p.pants, nd_shoe: 0x141416,
      nd_hair: hairCol, nd_brow: new THREE.Color(hairCol).multiplyScalar(0.7).getHex(), nd_iris: an.blackEyes ? 0x020202 : an.tinyPupils ? 0xd8d4cc : p.eye,
      nd_sclera: an.blackEyes ? 0x030303 : 0xe6e2da, nd_hat: p.hatColor || p.shirt, nd_scarf: p.scarfColor || 0x7a2a2a });
    const P = inst.parts;
    // ---- skeleton built from the joint markers exported with the basemesh
    const J = {}; for (const k of ['hips', 'legL', 'legR', 'armL', 'armR', 'head']) J[k] = P['j_' + k].position.clone();
    const bone = (pos, parent) => { const b = new THREE.Bone(); b.position.copy(pos); if (parent) parent.add(b); return b; };
    const hips = bone(J.hips);
    torso = bone(new THREE.Vector3(), hips);
    const legL = bone(J.legL.clone().sub(J.hips), hips), legR = bone(J.legR.clone().sub(J.hips), hips);
    const armL = bone(J.armL.clone().sub(J.hips), torso), armR = bone(J.armR.clone().sub(J.hips), torso);
    head = bone(J.head.clone().sub(J.hips), torso);

    body.add(hips); root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton([hips, torso, head, armL, armR, legL, legR]);
    parts.torso = torso; parts.legL = legL; parts.legR = legR; parts.armL = armL; parts.armR = armR; parts.head = head; parts.hips = hips;
    const RJ = { hip: J.hips.y, neck: J.head.y, sY: J.armL.y, sX: Math.abs(J.armL.x) };
    const skinned = [];
    for (const k in P) {
      if (!/^(skin_|cloth_)/.test(k)) continue;
      P[k].traverse(o => {
        if (!o.isMesh || o.isSkinnedMesh) return;
        const g = o.geometry; rigGeometry(g, RJ);
        const sm = new THREE.SkinnedMesh(g, o.material); sm.userData = { ...o.userData, part: k }; sm.frustumCulled = false; sm.castShadow = true; sm.receiveShadow = true;
        body.add(sm); sm.bind(skeleton); skinned.push(sm);
      });
    }
    parts.skinned = skinned;
    const rest = k => (P['j_' + k] && P['j_' + k].userData.restRot) || 0;
    const spread = p.body2 ? ((p.skirt || p.coat || p.outfit === 'dress' || p.legwear === 'skirt') ? 0.17 : 0.1) : 0;   // the second female's hands sat inside her hips / skirt
    parts.armRest = [-rest('armL') * 0.97 + spread, -rest('armR') * 0.97 - spread];
    armL.rotation.z = parts.armRest[0]; armR.rotation.z = parts.armRest[1];
    legL.rotation.z = -rest('legL') * 0.85; legR.rotation.z = -rest('legR') * 0.85;
    const bld = p.build || { w: 1, d: 1, legs: 1, head: 1 };
    torso.scale.set(bld.w, 1, bld.d); head.scale.setScalar(bld.head / Math.sqrt(bld.w));
    legL.scale.y = legR.scale.y = bld.legs; parts.bodyY0 = (bld.legs - 1) * J.hips.y; body.position.y = parts.bodyY0;
    // painted face + strand-textured hair
    let mouthPos = new THREE.Vector3(0, 0.07, 0.09);
    if (P.face && P.face.isMesh) {
      const fp = new FacePainter(p, an); P.face.material = fp.material; parts.facePainter = fp;
      const uv = P.face.geometry.attributes.uv, pos = P.face.geometry.attributes.position;
      if (uv) { let best = 1e9; for (let i = 0; i < uv.count; i++) { const d = (uv.getX(i) - 0.5) ** 2 + (uv.getY(i) - (1 - 0.27)) ** 2; /* glTF v is flipped */ if (d < best) { best = d; mouthPos.set(pos.getX(i), pos.getY(i), pos.getZ(i)).add(P.face.position); } } }
    }
    // snap glasses onto the painted eye line
    if (P.face && P.face.isMesh && P.acc_glasses && P.face.geometry.attributes.uv) {
      const uv = P.face.geometry.attributes.uv, pos = P.face.geometry.attributes.position;
      let best = 1e9, eyeY = null;
      for (let i = 0; i < uv.count; i++) { const d = (uv.getX(i) - 0.285) ** 2 + (uv.getY(i) - 0.45) ** 2; if (d < best) { best = d; eyeY = pos.getY(i) + P.face.position.y; } }
      inst.root.updateMatrixWorld(true);
      const gb = new THREE.Box3().setFromObject(P.acc_glasses), hw = P.head.getWorldPosition(new THREE.Vector3());
      if (eyeY !== null && isFinite(gb.min.y)) P.acc_glasses.position.y += eyeY - ((gb.min.y + gb.max.y) / 2 - hw.y);
    }
    const hairMat = mat(p.hairStyle === 'buzz' ? new THREE.Color(p.hairColor).lerp(new THREE.Color(p.skin), 0.4).getHex() : p.elder ? 0xb8b8b0 : p.hairColor, { map: hairTexture() });
    for (const k in P) if (k.startsWith('hair_')) P[k].traverse(o => { if (o.isMesh) o.material = hairMat; });
    // rigid pieces ride on the bones (their offsets are already relative to each joint)
    face = new THREE.Group(); head.add(face); parts.face = face;
    [...P.head.children].forEach(ch => face.add(ch));
    if (P.torso) [...P.torso.children].forEach(ch => torso.add(ch));
    if (P.armL) [...P.armL.children].forEach(ch => armL.add(ch));
    if (P.armR) [...P.armR.children].forEach(ch => armR.add(ch));
    const show = (k, v) => { const sm = skinned.filter(s => s.userData.part === k); sm.forEach(s => s.visible = v); if (P[k]) P[k].visible = v; };
    const legwear = outfit === 'dress' || outfit === 'coat' ? 'none' : (p.legwear || 'pants');
    const shortSl = (outfit === 'tee' || outfit === 'dress') && p.sleeves === 'short';
    const noSl = outfit === 'tank';
    for (const k of ['tee', 'suit', 'hoodie', 'jacket', 'coat', 'dress', 'tank', 'sweater']) { show('cloth_' + k, k === outfit); if (P['det_' + k]) P['det_' + k].visible = k === outfit; }
    show('cloth_sleeveLong', !shortSl && !noSl); show('cloth_sleeveShort', shortSl); show('cloth_shoes', true);
    show('cloth_vest', false);   // one top only: no vest layered over another shirt
    show('cloth_pants', legwear === 'pants' || outfit === 'coat'); show('cloth_shorts', legwear === 'shorts' || (legwear === 'skirt' && !P.det_skirt));
    if (P.det_skirt) P.det_skirt.visible = legwear === 'skirt';
    // body skin is split into regions (blender_humans4.py): hide whatever the outfit covers, so skin can't clip through cloth
    const pantsOn = legwear === 'pants' || outfit === 'coat', shortsOn = legwear === 'shorts' || (legwear === 'skirt' && !P.det_skirt);
    const longSl = !shortSl && !noSl;
    show('skin_torso', !['tee', 'suit', 'hoodie', 'jacket', 'coat', 'dress', 'sweater'].includes(outfit));
    show('skin_hips', !(pantsOn || shortsOn)); show('skin_legs', !pantsOn); show('skin_feet', false);
    show('skin_upperarm', noSl); show('skin_forearm', !longSl);
    // fabric patterns (stripes / plaid / checks) and denim
    const fabricTop = p.pattern && p.pattern !== 'solid' && !['suit', 'coat'].includes(outfit) ? mat(topCol, { map: fabric(p.pattern) }) : null;
    const denim = p.denim && legwear !== 'none' ? mat(p.denimColor || 0x3a4a6a, { map: fabric('denim') }) : null;
    body.traverse(o => { if (!o.isMesh) return; const mn = o.userData.matName;
      if (fabricTop && mn === 'nd_top' && o.isSkinnedMesh) o.material = fabricTop;
      if (denim && mn === 'nd_pants' && o.isSkinnedMesh) o.material = denim; });
    parts.skirt = outfit === 'coat' || outfit === 'dress' || legwear === 'skirt';
    [armL, armR].forEach(a => {
      const h = new THREE.Object3D(); h.position.set(0, -0.6, 0); a.add(h); a.userData.hand = h;
      if (an.longArms) a.scale.y = 1 + 0.6 * (an.k ?? 1);
      if (an.backElbows) a.rotation.y = Math.PI;
    });
    let style = p.hairStyle === 'spiky' ? 'mohawk' : p.hairStyle;
    if (p.hat && ['curly', 'mohawk', 'bun', 'pigtails'].includes(style)) style = p.gender === 'f' ? 'long' : (p.hat === 'beanie' ? 'bald' : 'short');   // girls keep long hair under hats   // no hair poking through hats
    for (const k in P) if (k.startsWith('hair_')) P[k].visible = k === 'hair_' + style;
    if (P.beard) P.beard.visible = !!p.beard && !an.mannequin;
    if (P.mustache) P.mustache.visible = !!p.beard && !an.mannequin;
    const longHair = ['long', 'bob', 'curly', 'pigtails'].includes(style);
    const acc = { acc_glasses: !!p.glasses && !an.mannequin, acc_cap: p.hat === 'cap', acc_beanie: p.hat === 'beanie', acc_scarf: false,
      acc_watch: !!p.watch && !(outfit !== 'tee' && outfit !== 'dress'), acc_earrings: !!p.earrings && !longHair, acc_necklace: !!p.necklace && (outfit === 'tee' || outfit === 'dress') && !p.scarf,
      acc_headphones: !!p.headphones && !p.hat && !['curly', 'mohawk', 'bun', 'pigtails'].includes(style), acc_backpack: !!p.backpack && outfit !== 'coat',
      acc_buckethat: p.hat === 'bucket', acc_earmuffs: !!p.earmuffs && !p.hat && !p.headphones && !longHair, acc_facemask: !!p.facemask && !an.mannequin && !an.wideMouth && !an.smile,
      acc_bag: !!p.bag && !p.backpack, acc_chain: !!p.chain && outfit !== 'coat' && outfit !== 'suit', acc_apron: !!p.apron && ['tee', 'sweater', 'tank'].includes(outfit) };
    if (acc.acc_bag && acc.acc_scarf) acc.acc_scarf = false;
    if (p.body2) { acc.acc_apron = false; acc.acc_chain = false; acc.acc_headphones = false; acc.acc_earmuffs = false; }   // not fitted to the second female body
    for (const k in acc) if (P[k]) P[k].visible = acc[k];
    if (P.acc_glasses) { P.acc_glasses.visible = !!(p.glasses || p.sunglasses) && !an.mannequin; P.acc_glasses.traverse(o => { if (o.isMesh && o.userData.matName === 'nd_lens') o.material = new THREE.MeshLambertMaterial({ color: p.sunglasses ? 0x101214 : 0x9ab0c0, transparent: true, opacity: p.sunglasses ? 0.9 : 0.22, depthWrite: false }); }); }
    if (p.hat === 'beanie') ['short', 'buzz', 'curly', 'bun'].forEach(k => P['hair_' + k] && (P['hair_' + k].visible = false));
    // hats sit over the hair, not inside it: grow them to fit bulkier styles (pivot is the neck, so they also rise a little)
    const hatFit = { bob: 1.13, long: 1.09, braid: 1.06, pony: 1.06, pigtails: 1.07, short: 1.05, slick: 1.04, sidepart: 1.06, curly: 1.12 }[style] || 1.02;
    ['acc_cap', 'acc_beanie', 'acc_buckethat'].forEach(k => P[k] && P[k].scale.setScalar(hatFit));
    if (an.backwardsFeet) { legL.rotation.y = Math.PI; legR.rotation.y = Math.PI; parts.backwards = true; }
    parts.lids = [P.lidL, P.lidR].filter(Boolean); parts.lids.forEach(l => l.userData.r0 = l.rotation.x);
    parts.lidsG = true;
    parts.irises = []; parts.eyeWhites = [];
    face.traverse(o => { if (o.isMesh && o.userData.matName === 'nd_iris') parts.irises.push(o); if (o.isMesh && o.userData.matName === 'nd_sclera') parts.eyeWhites.push(o); });
    face.traverse(o => { if (o.isMesh && o.morphTargetDictionary && 'open' in o.morphTargetDictionary) { parts.morph = o; parts.morphIdx = o.morphTargetDictionary.open; } });
    if (an.wideEyes && P.eyeLP) { P.eyeLP.position.x *= 1.45; P.eyeLP.scale.setScalar(1.3); if (P.lidL) { P.lidL.position.x *= 1.45; P.lidL.scale.setScalar(1.3); } }
    if (an.extraEye && P.eyeLP) {
      const e3 = P.eyeLP.clone(true); e3.position.set(0, P.eyeLP.position.y + 0.052, P.eyeLP.position.z - 0.004); e3.rotation.z = Math.PI / 2; face.add(e3);
      e3.traverse(o => { if (o.isMesh && o.userData.matName === 'nd_iris') { o.material = o.material.clone(); parts.irises.push(o); } });
    }
    if (an.mannequin) {
      [P.browL, P.browR].forEach(b => b && (b.visible = false));
      parts.irises.forEach(i => i.material.color.setHex(0x101010)); parts.eyeWhites.forEach(w => w.material.color.setHex(0x101010));
      head.add(cyl(0.052, 0.052, 0.006, 16, mat(0x2a2018), 0, -0.02, 0.004));
      [armL, armR].forEach(a => a.add(cyl(0.036, 0.036, 0.006, 12, mat(0x2a2018), 0, -0.5, 0)));
    }
    if (an.tall) { const tl = 1.25 + 0.3 * (an.k ?? 1); legL.scale.y = legR.scale.y = tl; parts.bodyY0 = J.hips.y * (tl - 1); body.position.y = parts.bodyY0; armL.scale.y = armR.scale.y = 1.35; parts.tall = true; }
    if (an.longNeck) head.position.y += 0.08 + 0.18 * (an.k ?? 1);
    if (an.rot) {   // flies circling the head
      const fm = new THREE.MeshBasicMaterial({ color: 0x050505 });
      parts.flies = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 3), fm); m.userData.ph = Math.random() * 6; m.userData.r = 0.12 + Math.random() * 0.08; head.add(m); return m; });
    }
    if (an.sleep) parts.sleep = true;
    if (an.bleeding) torso.add(box(0.1, 0.25, 0.02, mat(0x5a0a0a), 0.05, 0.3, 0.13));
    if (p.elder) { parts.elder = true; parts.lean = 0.12; }
    if (P.acc_cane) P.acc_cane.visible = !!p.elder;
    const mouth = new THREE.Group(); mouth.position.copy(mouthPos); mouth.position.z += 0.01; face.add(mouth); parts.mouth = mouth;
    parts.mouthInner = new THREE.Object3D();
  } else {
  const hipY = 0.86;
  // legs
  const mkLeg = (x) => {
    const g = new THREE.Group(); g.position.set(x, hipY, 0);
    g.add(box(0.13, 0.82, 0.15, pantsM, 0, -0.41, 0));
    g.add(box(0.14, 0.08, 0.24, shoeM, 0, -0.82, 0.04));
    body.add(g); return g;
  };
  parts.legL = mkLeg(0.1); parts.legR = mkLeg(-0.1);
  if (p.skirt) body.add(cyl(0.17, 0.29, 0.44, 7, pantsM, 0, hipY - 0.12, 0));
  // torso
  torso = new THREE.Group(); torso.position.y = hipY; body.add(torso); parts.torso = torso;
  const tm = cyl(0.21, 0.17, 0.6, 7, shirtM, 0, 0.3, 0); tm.scale.z = 0.62; torso.add(tm);
  torso.add(box(0.5, 0.12, 0.25, shirtM, 0, 0.55, 0));
  if (p.coat) { const c = cyl(0.235, 0.25, 0.78, 7, mat(0x2a2a30), 0, 0.22, -0.005); c.scale.z = 0.66; torso.add(c); torso.add(box(0.06, 0.6, 0.02, shirtM, 0, 0.3, 0.16)); }
  if (an.bleeding) { torso.add(box(0.12, 0.3, 0.02, mat(0x5a0a0a), 0.05, 0.3, 0.135)); }
  // arms
  const armLen = an.longArms ? 0.98 : 0.6;
  const mkArm = (x) => {
    const g = new THREE.Group(); g.position.set(x, 0.55, 0);
    g.add(box(0.11, armLen, 0.12, p.coat ? mat(0x2a2a30) : shirtM, 0, -armLen / 2, 0));
    const hand = box(0.085, an.longArms ? 0.2 : 0.1, 0.08, skinM, 0, -armLen - (an.longArms ? 0.1 : 0.05), 0);
    g.add(hand); g.userData.hand = hand;
    torso.add(g); return g;
  };
  parts.armL = mkArm(0.28); parts.armR = mkArm(-0.28);
  // neck + head
  const neckLen = an.longNeck ? 0.34 : 0.08;
  torso.add(cyl(0.055, 0.062, neckLen + 0.04, 6, skinM, 0, 0.6 + neckLen / 2, 0));
  head = new THREE.Group(); head.position.y = 0.6 + neckLen; torso.add(head); parts.head = head;
  face = new THREE.Group(); head.add(face); parts.face = face; // disguise part (hidden on cam for mirrors)
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 8, 6), skinM);
  skull.scale.set(1, 1.18, 1.02); skull.position.y = 0.14; face.add(skull);
  face.add(box(0.025, 0.05, 0.04, skinM, 0.127, 0.14, 0)); face.add(box(0.025, 0.05, 0.04, skinM, -0.127, 0.14, 0));
  }
  const eyeSep = an.wideEyes ? 0.068 : (G ? 0.031 : 0.045);
  if (!G) {
  // eyes
  parts.lids = [];
  const mkEye = (x, y, s = 1, rot = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, G ? 0.104 : 0.112); g.rotation.z = rot; g.scale.setScalar(s);
    const white = box(0.042, 0.024, 0.02, an.blackEyes ? darkM : mat(0xe8e4da, { unique: true }));
    g.add(white); parts.eyeWhites.push(white);
    const irisM = mat(an.blackEyes ? 0x000000 : p.eye, { unique: true, emissive: 0x000000 });
    const iris = box(an.tinyPupils ? 0.008 : 0.019, an.tinyPupils ? 0.008 : 0.019, 0.01, irisM, 0, 0, 0.011);
    g.add(iris); parts.irises.push(iris);
    if (!an.blackEyes) g.add(box(0.008, 0.008, 0.005, darkM, 0, 0, 0.017));
    const lidGeo = new THREE.BoxGeometry(0.05, 0.03, 0.024); lidGeo.translate(0, -0.015, 0);
    const lid = new THREE.Mesh(lidGeo, skinM); lid.position.set(0, 0.016, 0.002); lid.scale.y = 0.01;
    g.add(lid); parts.lids.push(lid);
    face.add(g); return g;
  };
  parts.eyeL = mkEye(eyeSep, 0.16, an.wideEyes ? 1.25 : 1);
  parts.eyeR = mkEye(-eyeSep, an.wideEyes ? 0.15 : 0.16, 1);
  if (an.extraEye) mkEye(0, 0.245, 0.9, Math.PI / 2);
  const bz = G ? 0.104 : 0.118, by = G ? 0.188 : 0.192;
  face.add(box(0.05, 0.011, 0.012, hairM, eyeSep, by, bz)); face.add(box(0.05, 0.011, 0.012, hairM, -eyeSep, by, bz));
  if (!G) face.add(box(0.026, 0.045, 0.03, skinM, 0, 0.128, 0.13));
  // mouth
  const mouth = new THREE.Group(); mouth.position.set(0, G ? 0.078 : 0.083, G ? 0.107 : 0.116); face.add(mouth); parts.mouth = mouth;
  const mw = an.wideMouth ? 0.17 : 0.058;
  mouth.add(box(mw, 0.013, 0.012, lipM, 0, 0.008, 0));
  const inner = box(mw * 0.86, 0.03, 0.01, an.wideMouth ? mat(0x3a0505) : darkM, 0, -0.006, 0.001);
  inner.geometry.translate(0, -0.008, 0); inner.scale.y = an.wideMouth ? 0.8 : 0.15; mouth.add(inner); parts.mouthInner = inner;
  if (an.wideMouth) {
    for (let i = 0; i < 12; i++) mouth.add(box(0.011, 0.016, 0.008, mat(0xe8e0c8), -0.066 + i * 0.012, -0.004, 0.008));
  }
  }
  // hair
  const hs = p.hairStyle;
  if (hs !== 'bald' && !G) {
    const capM = hs === 'buzz' ? mat(new THREE.Color(p.hairColor).lerp(new THREE.Color(p.skin), 0.5).getHex()) : hairM;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.137, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), capM);
    cap.scale.set(1, 1.12, 1.05); cap.position.set(0, 0.155, -0.008); cap.rotation.x = -0.18; face.add(cap);
    if (hs === 'long') {
      face.add(box(0.27, 0.38, 0.08, hairM, 0, 0.0, -0.085));
      face.add(box(0.04, 0.26, 0.15, hairM, 0.125, 0.06, -0.01)); face.add(box(0.04, 0.26, 0.15, hairM, -0.125, 0.06, -0.01));
    } else if (hs === 'bob') {
      face.add(box(0.05, 0.2, 0.2, hairM, 0.123, 0.09, -0.01)); face.add(box(0.05, 0.2, 0.2, hairM, -0.123, 0.09, -0.01));
      face.add(box(0.27, 0.2, 0.08, hairM, 0, 0.08, -0.09));
    } else if (hs === 'pony') {
      const pt = cyl(0.04, 0.02, 0.28, 5, hairM, 0, 0.06, -0.17); pt.rotation.x = 0.45; face.add(pt);
      face.add(box(0.24, 0.1, 0.06, hairM, 0, 0.13, -0.1));
    } else if (hs === 'short') {
      face.add(box(0.24, 0.12, 0.06, hairM, 0, 0.13, -0.1));
    } else if (hs === 'spiky') {
      for (let i = 0; i < 6; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), hairM);
        c.position.set(-0.08 + (i % 3) * 0.08, 0.29, -0.04 + Math.floor(i / 3) * 0.07); c.rotation.z = (i % 3 - 1) * 0.4; face.add(c);
      }
    }
  }
  if (p.glasses && !G) {
    const gG = new THREE.Group(); face.add(gG); if (G) gG.position.set(0, -0.016, 0); const faceAdd = o => gG.add(o);
    const gz = G ? -0.04 : 0;
    const fm = mat(0x111111);
    faceAdd(box(0.056, 0.006, 0.008, fm, eyeSep, 0.182, 0.13 + gz)); faceAdd(box(0.056, 0.006, 0.008, fm, -eyeSep, 0.182, 0.13 + gz));
    faceAdd(box(0.056, 0.006, 0.008, fm, eyeSep, 0.14, 0.13 + gz)); faceAdd(box(0.056, 0.006, 0.008, fm, -eyeSep, 0.14, 0.13 + gz));
    faceAdd(box(0.03, 0.006, 0.008, fm, 0, 0.175, 0.132 + gz));
    const lens = basic(0x8899aa, { transparent: true, opacity: 0.25 });
    faceAdd(box(0.05, 0.04, 0.003, lens, eyeSep, 0.161, 0.131 + gz)); faceAdd(box(0.05, 0.04, 0.003, lens, -eyeSep, 0.161, 0.131 + gz));
  }
  const hatG = new THREE.Group(); face.add(hatG); if (G) { hatG.scale.setScalar(0.8); hatG.position.set(0, 0.05, 0.004); }
  if (p.hat === 'beanie' && !G) {
    hatG.add(cyl(0.142, 0.142, 0.1, 8, mat(p.shirt), 0, 0.25, -0.005));
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.142, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(p.shirt)); top.position.y = 0.3; hatG.add(top);
  } else if (p.hat === 'cap' && !G) {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.142, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(p.pants)); top.position.y = 0.22; top.scale.y = 0.9; hatG.add(top);
    hatG.add(box(0.2, 0.015, 0.12, mat(p.pants), 0, 0.225, 0.15));
  }
  if (p.beard && !G) face.add(box(0.2, 0.08, 0.07, hairM, 0, 0.06, 0.085));

  // camera-only true form (mirror type)
  if (an.trueForm) {
    const tf = new THREE.Group(); head.add(tf); parts.trueForm = tf;
    const fleshM = mat(0x3a2a2a), boneM = mat(0xcfc6b0);
    const sk = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 6), fleshM); sk.position.set(0, 0.32, -0.04); sk.rotation.x = -0.35; tf.add(sk);
    for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.34, 4), boneM); const ang = (i / 6) * Math.PI * 2; h.position.set(Math.cos(ang) * 0.1, 0.32, Math.sin(ang) * 0.1 - 0.04); h.rotation.set(Math.sin(ang) * 0.9, 0, -Math.cos(ang) * 0.9); tf.add(h); }
    for (let i = 0; i < 6; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 3), basic(0xff2a10)); e.position.set(-0.07 + (i % 3) * 0.07, 0.42 + Math.floor(i / 3) * 0.1, 0.06 - Math.floor(i / 3) * 0.06); tf.add(e); }
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), fleshM); jaw.scale.set(1.1, 1.0, 1.1); jaw.position.y = 0.1; tf.add(jaw);
    const eyeM = basic(0xff2a10);
    for (let i = 0; i < 7; i++) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.016 + Math.random() * 0.012, 4, 3), eyeM);
      e.position.set(-0.08 + Math.random() * 0.16, 0.12 + Math.random() * 0.2, 0.12 + Math.random() * 0.02); tf.add(e);
    }
    tf.add(box(0.2, 0.07, 0.02, mat(0x050000), 0, 0.03, 0.14));
    for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 3), boneM); t.position.set(-0.08 + i * 0.02, 0.055, 0.15); t.rotation.z = Math.PI; tf.add(t); }
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 4), boneM); s.position.set(-0.1 + i * 0.05, -0.05, -0.12); s.rotation.x = -1.1; torso.add(s); setLayer(s, LAYER.TRUE); }
    [parts.armL, parts.armR].forEach(a => {
      const claw = new THREE.Group(); claw.position.copy(a.userData.hand.position);
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.3, 3), boneM); c.position.set(-0.025 + i * 0.025, -0.15, 0); c.rotation.x = Math.PI; claw.add(c); }
      a.add(claw); setLayer(claw, LAYER.TRUE); setLayer(a.userData.hand, LAYER.DISGUISE);
    });
    setLayer(tf, LAYER.TRUE); setLayer(face, LAYER.DISGUISE);
  }

  // hidden "reveal": when a disguised monster turns, its jaw splits open and veins crawl up the face
  if (an.monster) {
    const rv = new THREE.Group(); rv.visible = false; head.add(rv); parts.reveal = rv; if (G && parts.mouth) rv.position.copy(parts.mouth.position).sub(new THREE.Vector3(0, 0.075, 0.1));
    const gumM = mat(0x3a0505), boneM = mat(0xe8e0c8), veinM = mat(0x1a0a14);
    const jaw = new THREE.Group(); jaw.position.set(0, 0.075, 0.1); rv.add(jaw); parts.revJaw = jaw;
    jaw.add(box(0.15, 0.2, 0.05, gumM, 0, -0.1, 0.01));
    teethRow(jaw, 10, 0.14, -0.005, 0.04, false, boneM, 0.008);
    teethRow(jaw, 10, 0.14, -0.19, 0.04, true, boneM, 0.008);
    for (let i = 0; i < 8; i++) { const v = box(0.005, 0.06 + Math.random() * 0.06, 0.004, veinM, -0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.12, 0.124); v.rotation.z = (Math.random() - 0.5) * 1.4; rv.add(v); }
    [eyeSep, -eyeSep].forEach(x => rv.add(box(0.008, 0.07, 0.004, veinM, x, 0.12, 0.124)));
  }
  if (an.strings) {
    const sm = new THREE.LineBasicMaterial({ color: 0xd8d0c0 });
    const pts = [[0, 1.85, 0], [0.33, 0.85, 0], [-0.33, 0.85, 0], [0.1, 0.1, 0], [-0.1, 0.1, 0]];
    pts.forEach(([x, y, z]) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z), new THREE.Vector3(x * 0.6, 7, z)]); const l = new THREE.Line(g, sm); l.layers.set(LAYER.TRUE); root.add(l); });
    const bar = box(0.9, 0.04, 0.04, mat(0x3a2a1a), 0, 3.2, 0); bar.layers.set(LAYER.TRUE); root.add(bar);
  }
  const noShadow = !!an.noShadow;
  root.traverse(o => { if (o.isMesh) { o.castShadow = !noShadow; } });
  root.scale.setScalar(p.height);

  function update(dt, s) {
    parts.phase += dt * (s.walking ? 7.5 * (s.speed || 1) * (parts.elder ? 0.7 : 1) : 1.2);
    if (an.strings && Math.random() < 0.04) parts.jerk = (Math.random() - 0.5) * 0.5;
    parts.jerk = (parts.jerk || 0) * 0.9; body.rotation.z = parts.jerk || 0;
    const ph = parts.phase;
    if (s.walking) {
      const a = Math.sin(ph) * (parts.skirt ? 0.3 : 0.55);
      parts.legL.rotation.x = a; parts.legR.rotation.x = -a;
      const sw = an.mannequin ? 0.05 : 0.7;
      parts.armL.rotation.x = -a * sw; parts.armR.rotation.x = a * sw;
      body.position.y = (parts.bodyY0 || 0) + Math.abs(Math.cos(ph)) * 0.04;
    } else {
      parts.legL.rotation.x *= 0.85; parts.legR.rotation.x *= 0.85;
      parts.armL.rotation.x *= 0.9; parts.armR.rotation.x *= 0.9;
      body.position.y = parts.bodyY0 || 0;
      torso.scale.y = 1 + Math.sin(ph * 2) * (an.noBreath ? 0 : 0.008);
    }
    // blink
    if (!an.noBlink) {
      parts.blinkT -= dt;
      if (parts.blinkT < 0) { parts.blink = 0.16; parts.blinkT = 1.5 + Math.random() * 4; }
      if (parts.blink > 0) parts.blink -= dt;
      const c = parts.blink > 0 ? 1 : 0.01;
      if (parts.lidsG) parts.lids.forEach(l => l.rotation.x = l.userData.r0 + (c > 0.5 ? 1.75 : 0));
      else parts.lids.forEach(l => l.scale.y = c);
    }
    // twitch
    let tw = 0;
    if (an.twitch) {
      parts.twitchT -= dt;
      if (parts.twitchT < 0) { parts.twitch = 0.18; parts.twitchT = 0.7 + Math.random() * 3; parts.twDir = (Math.random() - 0.5) * 1.1; }
      if (parts.twitch > 0) { parts.twitch -= dt; tw = parts.twDir; }
    }
    const turn = s.turning || 0;
    head.rotation.z = tw + (an.headTilt ? 0.35 : 0) + turn * 0.5 * Math.sin(ph * 9);
    head.rotation.y = (s.look || 0) + turn * 0.2 * Math.sin(ph * 13);
    head.rotation.x = -0.12 * (s.atWindow ? 1 : 0) + turn * 0.25;
    torso.rotation.x = turn * 0.35 + (parts.lean || 0);
    // mouth
    const talk = an.noLips ? 0 : (s.talk || 0);
    const base = an.wideMouth ? 0.8 : 0.15;
    if (parts.morph) parts.morph.morphTargetInfluences[parts.morphIdx] = Math.min(1, talk * 1.5 + turn * 1.2 + (an.wideMouth ? 0.25 : 0));
    else parts.mouthInner.scale.y = base + talk * 2.2 + turn * 3;
    if (parts.reveal) {
      parts.reveal.visible = turn > 0.15;
      if (parts.tall && turn > 0) parts.torso.rotation.x = 0.35 + turn * 0.5;   // the tall one bends down to the window
      parts.revJaw.scale.y = Math.min(1.6, turn * 1.6 + Math.sin(ph * 20) * 0.05 * turn);
      parts.mouth.visible = turn <= 0.15;
    }
    if (parts.flies) parts.flies.forEach((m, i) => { const t = ph * (2 + i * 0.3) + m.userData.ph; m.position.set(Math.cos(t) * m.userData.r, 0.16 + Math.sin(t * 1.7) * 0.06, Math.sin(t) * m.userData.r); });
    if (parts.sleep && s.walking) { parts.armL.rotation.x = -0.5; parts.armR.rotation.x = -0.5; }
    if (parts.facePainter) {
      const lvl = an.noLips ? 0 : Math.min(3, Math.round((s.talk || 0) * 4));
      parts.facePainter.draw({ blink: parts.blink > 0 && !an.noBlink, talk: lvl, glow: turn > 0.1 ? 'red' : (s.shine || 0) > 0.3 ? 'yellow' : '', turn });
    }
    // turning: eyes glow
    if (turn > 0 || s.shine) {
      const k = Math.max(turn, s.shine || 0);
      parts.irises.forEach(i => i.material.emissive.setRGB(k * 1.0, k * (s.shine && !turn ? 0.9 : 0.05), k * (s.shine && !turn ? 0.5 : 0.0)));
    } else parts.irises.forEach(i => i.material.emissive.setRGB(0, 0, 0));
  }

  return { root, parts, update, mouthWorld: () => parts.mouth.getWorldPosition(new THREE.Vector3()) };
}

// ---------------------------------------------------------------- shared monster bits
function teethRow(parent, n, w, y, z, up, m, size = 0.009) {
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(size, size * 5 * (0.7 + Math.random() * 0.6), 3), m);
    t.position.set(-w / 2 + (i + 0.5) * (w / n), y, z); if (!up) t.rotation.z = Math.PI; parent.add(t);
  }
}
function limb(len, r, m) { // tapered low poly limb hanging down from origin
  const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, len, 5), m); me.position.y = -len / 2; return me;
}

// ---------------------------------------------------------------- Blender monsters
function glbMonster(key, anim) {
  const inst = instance(key); if (!inst) return null;
  const { root, parts: P } = inst;
  const parts = { phase: Math.random() * 6, ...P };
  const update = (dt, s) => { parts.phase += dt * (s.walking ? (anim.walkRate || 4) : 1.5); anim.update(parts, parts.phase, s, dt); };
  const hd = P.head || root;
  return { root, parts, update, mouthWorld: () => hd.getWorldPosition(new THREE.Vector3()) };
}
function glbGaunt() {
  return glbMonster('gaunt', { walkRate: 4, update(P, ph, s) {
    const a = s.walking ? Math.sin(ph) * 0.4 : 0;
    P.legL.rotation.x = a; P.legR.rotation.x = -a;
    if (!s.banging) { P.armL.rotation.x = s.walking ? -a * 0.5 : Math.sin(ph * 1.3) * 0.05; P.armR.rotation.x = s.walking ? a * 0.5 : Math.cos(ph * 1.1) * 0.05; }
    P.head.rotation.z = Math.sin(ph * 0.7) * 0.25 + (Math.random() < 0.02 ? (Math.random() - 0.5) * 0.6 : 0);
    P.jaw.rotation.x = 0.1 + (s.talk || 0) * 0.5 + (s.turning || 0) * 0.7 + Math.sin(ph * 3) * 0.03;
  } });
}
function glbCrawler() {
  return glbMonster('crawler', { walkRate: 9, update(P, ph, s) {
    ['legFL', 'legFR', 'legBL', 'legBR'].forEach((k, i) => {
      const L = P[k], sx = k.endsWith('L') ? 1 : -1;
      const w = s.walking ? Math.sin(ph + i * 1.6) : Math.sin(ph * 0.4 + i) * 0.12;
      L.rotation.x = w * 0.28; L.rotation.z = sx * Math.max(0, w) * 0.12;
    });
    P.body.position.y = s.walking ? Math.abs(Math.sin(ph * 2)) * 0.05 : Math.sin(ph) * 0.02;
    P.head.rotation.y = Math.sin(ph * 0.5) * 0.3 + (Math.random() < 0.03 ? (Math.random() - 0.5) * 0.8 : 0);
    P.head.rotation.x = (s.turning || 0) * 0.4;
  } });
}
function glbWeeper() {
  return glbMonster('weeper', { walkRate: 2, update(P, ph, s) {
    P.body.position.y = Math.sin(ph * 2) * 0.01;
    if (!s.banging) { P.armL.rotation.x = Math.sin(ph * 0.9) * 0.08 - (s.turning || 0) * 1.2; P.armR.rotation.x = Math.cos(ph * 0.8) * 0.08 - (s.turning || 0) * 1.2; }
    P.head.rotation.z = 0.25 + Math.sin(ph * 0.4) * 0.1;
    const open = Math.max(s.turning || 0, s.talk ? 0.15 : 0);
    P.hairL.rotation.z = open * 0.9; P.hairR.rotation.z = -open * 0.9;
  } });
}
function glbHound() {
  return glbMonster('hound', { walkRate: 7, update(P, ph, s) {
    const legs = { legFL: 0, legBR: 0, legFR: Math.PI, legBL: Math.PI };
    for (const k in legs) P[k].rotation.x = s.walking ? Math.sin(ph + legs[k]) * 0.45 : 0;
    P.body.position.y = s.walking ? Math.abs(Math.sin(ph)) * 0.03 : Math.sin(ph * 2) * 0.01;
    P.head.rotation.z = Math.sin(ph * 0.6) * 0.3 + (s.turning || 0) * Math.sin(ph * 20) * 0.2;
    P.head.rotation.x = s.walking ? 0.2 : -0.05 - (s.turning || 0) * 0.2;
  } });
}
export function buildWeeper() { return glbWeeper(); }
export function buildHound() { return glbHound(); }

// ---------------------------------------------------------------- obvious monster: the Gaunt
export function buildGaunt() {
  const g = glbGaunt(); if (g) return g;
  const root = new THREE.Group();
  const fleshM = mat(0x8a8c84), paleM = mat(0xa6a89c), darkM = mat(0x050303), boneM = mat(0xe0d8c0), veinM = mat(0x4a2525), clothM = mat(0x1e1c1a), gumM = mat(0x5a1414);
  const glowM = basic(0xffe8a0);
  const parts = { phase: 0 };
  const hipY = 1.35;
  const mkLeg = x => {
    const g = new THREE.Group(); g.position.set(x, hipY, 0);
    const thigh = new THREE.Group(); g.add(thigh); thigh.add(limb(0.7, 0.05, fleshM));
    const knee = new THREE.Group(); knee.position.y = -0.7; knee.rotation.x = 0.35; thigh.add(knee);
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 4), paleM));
    knee.add(limb(0.68, 0.04, fleshM));
    const foot = box(0.08, 0.04, 0.26, paleM, 0, -0.68, 0.07); knee.add(foot);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.08, 3), boneM); c.position.set(-0.025 + i * 0.025, -0.68, 0.22); c.rotation.x = Math.PI / 2; knee.add(c); }
    root.add(g); g.userData.knee = knee; return g;
  };
  parts.legL = mkLeg(0.12); parts.legR = mkLeg(-0.12);
  // tattered loincloth strips
  for (let i = 0; i < 7; i++) root.add(box(0.05, 0.3 + Math.random() * 0.3, 0.01, clothM, -0.15 + i * 0.05, hipY - 0.2, 0.1 - (i % 2) * 0.2));
  const torso = new THREE.Group(); torso.position.y = hipY; torso.rotation.x = 0.95; root.add(torso); parts.torso = torso;
  const t = cyl(0.13, 0.09, 0.9, 6, fleshM, 0, 0.45, 0); t.scale.z = 0.6; torso.add(t);
  // ribcage
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.004, 0.012, 3, 8, Math.PI), boneM);
    rib.position.set(0, 0.42 + i * 0.07, 0.01); rib.rotation.set(Math.PI / 2, 0, 0); rib.scale.set(1, 0.65, 1); torso.add(rib);
  }
  // spine ridges on the back
  for (let i = 0; i < 9; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1 + (i % 3) * 0.03, 4), boneM); sp.position.set(0, 0.1 + i * 0.1, -0.085); sp.rotation.x = -1.2; torso.add(sp); }
  for (let i = 0; i < 4; i++) torso.add(box(0.008, 0.25, 0.008, veinM, -0.06 + i * 0.04, 0.3, 0.075));
  // arms: long, two segments, with long fingers
  const mkArm = x => {
    const g = new THREE.Group(); g.position.set(x, 0.85, 0);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), paleM));
    g.add(limb(0.7, 0.045, fleshM));
    const el = new THREE.Group(); el.position.y = -0.7; el.rotation.x = -0.25; g.add(el);
    el.add(limb(0.65, 0.035, fleshM));
    const hand = new THREE.Group(); hand.position.y = -0.66; el.add(hand);
    hand.add(box(0.07, 0.08, 0.03, paleM));
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.3, 3), boneM); f.position.set(-0.03 + i * 0.02, -0.18, 0); f.rotation.z = (i - 1.5) * 0.08; hand.add(f); }
    torso.add(g); return g;
  };
  parts.armL = mkArm(0.2); parts.armR = mkArm(-0.2);
  const head = new THREE.Group(); head.position.y = 0.95; torso.add(head); parts.head = head;
  head.rotation.x = -0.95;
  const sk = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 5), paleM); sk.scale.set(0.85, 1.5, 1); sk.position.y = 0.2; head.add(sk);
  const brow = box(0.24, 0.04, 0.08, paleM, 0, 0.26, 0.1); head.add(brow);
  // deep sockets with pinprick lights
  [0.055, -0.055].forEach(x => { head.add(box(0.06, 0.06, 0.03, darkM, x, 0.21, 0.125)); const e = box(0.012, 0.012, 0.01, glowM, x, 0.21, 0.142); head.add(e); });
  head.add(box(0.03, 0.05, 0.02, darkM, 0, 0.15, 0.135)); // nose hole
  // hanging, unhinged jaw
  const mouth = new THREE.Group(); mouth.position.set(0, 0.07, 0.1); head.add(mouth); parts.mouth = mouth;
  teethRow(mouth, 11, 0.16, 0.0, 0.03, false, boneM, 0.01);
  const jaw = new THREE.Group(); jaw.position.set(0, 0.0, 0); mouth.add(jaw); parts.jaw = jaw;
  const inner = box(0.16, 0.16, 0.06, gumM, 0, -0.08, 0); jaw.add(inner); parts.mouthInner = inner;
  jaw.add(box(0.17, 0.03, 0.09, paleM, 0, -0.17, 0.01));
  teethRow(jaw, 11, 0.16, -0.14, 0.04, true, boneM, 0.01);
  const tongue = box(0.05, 0.2, 0.02, mat(0x7a2a2a), 0, -0.22, 0.04); jaw.add(tongue);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  function update(dt, s) {
    parts.phase += dt * (s.walking ? 4 : 1.5);
    const ph = parts.phase;
    if (s.walking) {
      const a = Math.sin(ph) * 0.4;
      parts.legL.rotation.x = a; parts.legR.rotation.x = -a;
      parts.legL.userData.knee.rotation.x = 0.35 + Math.max(0, -a); parts.legR.userData.knee.rotation.x = 0.35 + Math.max(0, a);
      parts.armL.rotation.x = 0.4 - a * 0.5; parts.armR.rotation.x = 0.4 + a * 0.5;
    } else {
      parts.armL.rotation.x = 0.55 + Math.sin(ph * 1.3) * 0.05; parts.armR.rotation.x = 0.55 + Math.cos(ph * 1.1) * 0.05;
    }
    head.rotation.z = Math.sin(ph * 0.7) * 0.25 + (Math.random() < 0.02 ? (Math.random() - 0.5) : 0);
    const open = 0.15 + (s.talk || 0) * 0.5 + (s.turning || 0) * 0.6 + Math.sin(ph * 3) * 0.03;
    parts.jaw.rotation.x = open;
    tongue.rotation.x = Math.sin(ph * 5) * 0.3;
  }
  return { root, parts, update, mouthWorld: () => parts.mouth.getWorldPosition(new THREE.Vector3()) };
}

// ---------------------------------------------------------------- obvious monster: the Crawler
// a human torso carried on four long jointed spider legs; the head hangs upside down
export function buildCrawler(p) {
  const g = glbCrawler(); if (g) return g;
  const root = new THREE.Group();
  const skinM = mat(0x9a9488), legM = mat(0x5a5048), darkM = mat(0x050303), boneM = mat(0xe8e0c8), shirtM = mat(p ? p.shirt : 0x3a3a44), hairM = mat(p ? p.hairColor : 0x1a1410), gumM = mat(0x5a1414);
  const parts = { phase: 0, legs: [] };
  const body = new THREE.Group(); body.position.y = 1.25; root.add(body); parts.body = body;
  const torso = cyl(0.2, 0.16, 0.6, 7, shirtM, 0, 0, 0); torso.scale.z = 0.62; torso.rotation.x = Math.PI / 2 - 0.3; body.add(torso);
  // four legs
  [[0.18, 0.2, 1], [-0.18, 0.2, 1], [0.2, -0.22, -1], [-0.2, -0.22, -1]].forEach(([x, z, fz]) => {
    const hip = new THREE.Group(); hip.position.set(x, 0, z); body.add(hip);
    hip.rotation.z = -Math.sign(x) * 1.0; hip.rotation.x = -fz * 0.3;
    hip.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), skinM));
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.85, 5), legM); up.position.y = 0.42; hip.add(up);
    const knee = new THREE.Group(); knee.position.y = 0.85; hip.add(knee);
    knee.rotation.z = -Math.sign(x) * 1.91;
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), skinM));
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.008, 1.75, 4), legM); lo.position.y = 0.875; knee.add(lo);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 3), boneM); claw.position.y = 1.78; knee.add(claw);
    parts.legs.push({ hip, knee, x, z, off: Math.random() * 6 });
  });
  // human arms dangling from the front
  [0.15, -0.15].forEach(x => { const a = new THREE.Group(); a.position.set(x, 0.05, 0.3); a.add(box(0.08, 0.55, 0.09, shirtM, 0, -0.27, 0)); a.add(box(0.07, 0.1, 0.07, skinM, 0, -0.6, 0)); body.add(a); });
  // upside-down head at the front, on a long neck
  const neck = cyl(0.05, 0.05, 0.4, 5, skinM, 0, 0.12, 0.42); neck.rotation.x = 0.9; body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.32, 0.58); head.rotation.z = Math.PI; body.add(head); parts.head = head;
  const sk = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skinM); sk.scale.set(1, 1.18, 1.02); head.add(sk);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.scale.set(1, 1.12, 1.05); hair.position.y = 0.01; head.add(hair);
  for (let i = 0; i < 6; i++) head.add(box(0.03, 0.18 + Math.random() * 0.15, 0.03, hairM, -0.1 + i * 0.04, 0.2, -0.02)); // hair hanging "up"
  [0.05, -0.05].forEach(x => { head.add(box(0.045, 0.03, 0.02, darkM, x, 0.03, 0.12)); head.add(box(0.012, 0.012, 0.01, basic(0xffffff), x, 0.03, 0.132)); });
  const mouth = new THREE.Group(); mouth.position.set(0, -0.06, 0.115); head.add(mouth); parts.mouth = mouth;
  const inner = box(0.13, 0.06, 0.02, gumM, 0, -0.02, 0); inner.geometry.translate(0, -0.02, 0); mouth.add(inner); parts.mouthInner = inner;
  teethRow(mouth, 9, 0.12, 0.0, 0.012, false, boneM);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  function update(dt, s) {
    parts.phase += dt * (s.walking ? 9 : 2);
    const ph = parts.phase;
    parts.legs.forEach((l, i) => {
      const k = s.walking ? Math.sin(ph + i * 1.6) : Math.sin(ph * 0.4 + l.off) * 0.15;
      l.hip.rotation.x = -Math.sign(l.z) * 0.3 + k * 0.25;
      l.knee.rotation.z = -Math.sign(l.x) * (1.91 + Math.max(0, k) * 0.2);
    });
    body.position.y = 1.25 + (s.walking ? Math.abs(Math.sin(ph * 2)) * 0.05 : Math.sin(ph) * 0.02);
    head.rotation.y = Math.sin(ph * 0.5) * 0.3 + (Math.random() < 0.03 ? (Math.random() - 0.5) * 0.8 : 0);
    head.rotation.z = Math.PI + Math.sin(ph * 0.33) * 0.15;
    parts.mouthInner.scale.y = 0.5 + (s.talk || 0) * 2.5 + (s.turning || 0) * 2;
  }
  return { root, parts, update, mouthWorld: () => parts.mouth.getWorldPosition(new THREE.Vector3()) };
}

// ---------------------------------------------------------------- jumpscare face
export function buildScareFace() {
  const sc = instance('scare'); if (sc) { sc.root.traverse(o => { if (o.isMesh) o.castShadow = false; }); return sc.root; }
  const g = new THREE.Group();
  const flesh = basic(0x8f8a80), dark = basic(0x000000), bone = basic(0xf0e8d0), red = basic(0xff1100), gum = basic(0x3a0000), vein = basic(0x3a1a2a);
  const sk = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 7), flesh); sk.scale.set(1, 1.35, 0.8); g.add(sk);
  for (let i = 0; i < 10; i++) { const v = box(0.006, 0.08 + Math.random() * 0.1, 0.005, vein, -0.17 + Math.random() * 0.34, 0.05 + Math.random() * 0.15, 0.158); v.rotation.z = (Math.random() - 0.5) * 1.2; g.add(v); }
  [[0.08, 0.09], [-0.08, 0.07]].forEach(([x, y]) => {
    g.add(box(0.09, 0.08, 0.02, dark, x, y, 0.16));
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.014, 4, 3), red); p.position.set(x, y, 0.175); g.add(p);
    g.add(box(0.012, 0.12, 0.006, dark, x, y - 0.09, 0.161)); // black tears
  });
  g.add(box(0.3, 0.28, 0.02, gum, 0, -0.15, 0.15));
  g.add(box(0.2, 0.18, 0.02, dark, 0, -0.16, 0.152));
  for (let i = 0; i < 13; i++) {
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 3), bone); a.position.set(-0.13 + i * 0.022, -0.04, 0.165); a.rotation.z = Math.PI; g.add(a);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 3), bone); b.position.set(-0.13 + i * 0.022, -0.26, 0.165); g.add(b);
  }
  return g;
}

// ---------------------------------------------------------------- 3D portraits (ID cards / ledger photos are rendered from the actual model)
let PR = null;
const pScene = new THREE.Scene(), pCam = new THREE.PerspectiveCamera(20, 96 / 116, 0.05, 10);
const pRT = new THREE.WebGLRenderTarget(96, 116);
const pCache = new Map();
export function setPortraitRenderer(r) {
  PR = r;
  pScene.add(new THREE.HemisphereLight(0xf4f0ea, 0x40382f, 1.6));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(0.8, 1.2, 2); pScene.add(key);
}
function portrait3D(p, bg) {
  const k = JSON.stringify(p) + bg;
  if (pCache.has(k)) return pCache.get(k);
  const ch = p.rare ? buildRare() : buildCharacter(p, {});
  pScene.add(ch.root); ch.update(0.016, { atWindow: false }); ch.root.updateMatrixWorld(true);
  const hp = ch.parts.head.getWorldPosition(new THREE.Vector3());
  pCam.position.set(hp.x, hp.y + 0.11, hp.z + 1.25); pCam.lookAt(hp.x, hp.y + 0.07, hp.z);
  pScene.background = new THREE.Color(bg);
  const prev = PR.getRenderTarget();
  PR.setRenderTarget(pRT); PR.render(pScene, pCam);
  const buf = new Uint8Array(96 * 116 * 4); PR.readRenderTargetPixels(pRT, 0, 0, 96, 116, buf); PR.setRenderTarget(prev);
  pScene.remove(ch.root);
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 116; const g = cv.getContext('2d'); const img = g.createImageData(96, 116);
  for (let y = 0; y < 116; y++) for (let x = 0; x < 96; x++) {
    const s = ((115 - y) * 96 + x) * 4, d = (y * 96 + x) * 4;
    for (let ch_ = 0; ch_ < 3; ch_++) img.data[d + ch_] = Math.min(255, Math.pow(buf[s + ch_] / 255, 1 / 2.2) * 255);
    img.data[d + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  pCache.set(k, cv); if (pCache.size > 80) pCache.delete(pCache.keys().next().value);
  return cv;
}

export function buildRare() {
  const inst = instance('rare_makima'); if (!inst) return null;
  const root = inst.root;
  // normalise the imported mesh: 1.68 m tall, facing the window (+Z), centred on the spot
  root.traverse(o => { if (o.isMesh) { o.scale.setScalar(1); o.rotation.set(0, Math.PI / 2, 0); o.castShadow = true; } });
  root.updateMatrixWorld(true);
  let bb = new THREE.Box3().setFromObject(root);
  const k = 1.68 / (bb.max.y - bb.min.y);
  root.children.forEach(ch => ch.scale.multiplyScalar(k));
  root.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(root);
  const ctr = bb.getCenter(new THREE.Vector3());
  root.children.forEach(ch => { ch.position.x -= ctr.x; ch.position.z -= ctr.z; ch.position.y -= bb.min.y; });
  const head = new THREE.Object3D(); head.position.set(0, 1.5, 0.05); root.add(head);
  const mouth = new THREE.Object3D(); mouth.position.set(0, 1.5, 0.1); root.add(mouth);
  const parts = { phase: 0, head, mouth };
  return { root, parts, update(dt, s) { parts.phase += dt; root.children.forEach(ch => { if (ch !== head && ch !== mouth) { ch.position.y = Math.sin(parts.phase * 1.3) * 0.004; ch.rotation.y = (s.turning || 0) * Math.sin(parts.phase * 18) * 0.05; } }); },
    mouthWorld: () => mouth.getWorldPosition(new THREE.Vector3()) };
}

// ---------------------------------------------------------------- 2D portrait for IDs and ledger
export function drawPortrait(cv, p, { bg = '#9fb0b8', grain = true } = {}) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  if (PR && TEMPLATES['human_m'] && (!p.rare || TEMPLATES.rare_makima)) {
    c.imageSmoothingEnabled = true; c.drawImage(portrait3D(p, bg), 0, 0, W, H);
    if (grain) { const img = c.getImageData(0, 0, W, H), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; } c.putImageData(img, 0, 0); }
    return;
  }
  c.imageSmoothingEnabled = false;
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const cx = W / 2, fy = H * 0.42, fw = W * 0.26, fh = H * 0.27;
  const hair = hex(p.hairColor), skin = hex(p.skin);
  // shoulders
  c.fillStyle = p.coat ? '#2a2a30' : hex(p.shirt);
  c.beginPath(); c.moveTo(W * 0.08, H); c.lineTo(W * 0.2, H * 0.78); c.lineTo(W * 0.8, H * 0.78); c.lineTo(W * 0.92, H); c.fill();
  c.fillStyle = skin; c.fillRect(cx - W * 0.07, fy + fh * 0.8, W * 0.14, H * 0.12);
  // back hair
  c.fillStyle = hair;
  if (p.hairStyle === 'long') c.fillRect(cx - fw * 1.12, fy - fh * 0.6, fw * 2.24, fh * 2.0);
  if (p.hairStyle === 'bob') c.fillRect(cx - fw * 1.15, fy - fh * 0.6, fw * 2.3, fh * 1.3);
  // face
  c.fillStyle = skin; c.beginPath(); c.ellipse(cx, fy, fw, fh, 0, 0, Math.PI * 2); c.fill();
  c.fillRect(cx - fw * 1.08, fy - fh * 0.1, fw * 0.12, fh * 0.35); c.fillRect(cx + fw * 0.96, fy - fh * 0.1, fw * 0.12, fh * 0.35);
  // hair top
  if (p.hairStyle !== 'bald') {
    c.fillStyle = p.hairStyle === 'buzz' ? '#' + new THREE.Color(p.hairColor).lerp(new THREE.Color(p.skin), 0.5).getHexString() : hair;
    c.beginPath(); c.ellipse(cx, fy - fh * 0.35, fw * 1.06, fh * 0.75, 0, Math.PI, Math.PI * 2); c.fill();
    c.fillRect(cx - fw * 1.06, fy - fh * 0.4, fw * 2.12, fh * 0.2);
    if (p.hairStyle === 'spiky') for (let i = 0; i < 5; i++) { c.beginPath(); const x = cx - fw * 0.8 + i * fw * 0.4; c.moveTo(x - 6, fy - fh * 0.9); c.lineTo(x, fy - fh * 1.35); c.lineTo(x + 6, fy - fh * 0.9); c.fill(); }
    if (p.hairStyle === 'pony') c.fillRect(cx + fw * 0.85, fy - fh * 0.2, fw * 0.3, fh * 0.9);
    if (p.hairStyle === 'long' || p.hairStyle === 'bob') { c.fillRect(cx - fw * 1.1, fy - fh * 0.4, fw * 0.25, fh * (p.hairStyle === 'long' ? 1.6 : 1.0)); c.fillRect(cx + fw * 0.85, fy - fh * 0.4, fw * 0.25, fh * (p.hairStyle === 'long' ? 1.6 : 1.0)); }
  }
  if (p.hat) { c.fillStyle = hex(p.hat === 'beanie' ? p.shirt : p.pants); c.beginPath(); c.ellipse(cx, fy - fh * 0.5, fw * 1.1, fh * 0.65, 0, Math.PI, Math.PI * 2); c.fill(); if (p.hat === 'cap') c.fillRect(cx - fw * 0.9, fy - fh * 0.55, fw * 1.9, fh * 0.12); }
  // eyes
  const ey = fy - fh * 0.05, ex = fw * 0.42;
  [cx - ex, cx + ex].forEach(x => {
    c.fillStyle = '#ece8e0'; c.fillRect(x - fw * 0.2, ey - fh * 0.06, fw * 0.4, fh * 0.13);
    c.fillStyle = hex(p.eye); c.fillRect(x - fw * 0.08, ey - fh * 0.06, fw * 0.16, fh * 0.13);
    c.fillStyle = '#000'; c.fillRect(x - fw * 0.03, ey - fh * 0.025, fw * 0.06, fh * 0.06);
    c.fillStyle = hair; c.fillRect(x - fw * 0.22, ey - fh * 0.24, fw * 0.44, fh * 0.06);
  });
  if (p.glasses) { c.strokeStyle = '#111'; c.lineWidth = 2; c.strokeRect(cx - ex - fw * 0.26, ey - fh * 0.15, fw * 0.52, fh * 0.3); c.strokeRect(cx + ex - fw * 0.26, ey - fh * 0.15, fw * 0.52, fh * 0.3); c.beginPath(); c.moveTo(cx - fw * 0.16, ey); c.lineTo(cx + fw * 0.16, ey); c.stroke(); }
  // nose & mouth
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(cx - fw * 0.06, fy + fh * 0.1, fw * 0.12, fh * 0.22);
  if (p.beard) { c.fillStyle = hair; c.beginPath(); c.ellipse(cx, fy + fh * 0.62, fw * 0.8, fh * 0.42, 0, 0, Math.PI); c.fill(); }
  c.fillStyle = '#6a2a26'; c.fillRect(cx - fw * 0.28, fy + fh * 0.48, fw * 0.56, fh * 0.07);
  // grain
  if (grain) {
    const img = c.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(img, 0, 0);
  }
}
