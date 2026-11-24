// Night Desk — character customizer (3 save slots). Your look is what the other player sees in co-op.
// Separate from normal single-player: it only stores a look in localStorage.
import * as THREE from 'three';
import { buildCharacter, randomParams, SKINS, HAIRS, SHIRTS, PANTS, EYES } from './chars.js';

const KEY = 'nightdesk_chars';
const SLOTS = 3;
const HAIR_M = ['short', 'buzz', 'curly', 'bald', 'slick', 'sidepart', 'mohawk'];
const HAIR_F = ['long', 'pony', 'braid', 'pigtails', 'bun', 'bob', 'short', 'curly'];
const OUTFITS = ['tee', 'hoodie', 'jacket', 'suit', 'sweater', 'tank', 'coat'];
const OUTFITS_F = [...OUTFITS, 'dress'];
const LEGS = ['pants', 'shorts', 'skirt'];
const HATS = ['', 'cap', 'beanie', 'bucket'];
const BODIES = [['m', 'Male'], ['f', 'Female'], ['f2', 'Female (alt body)']];

function defaultLook(i) {
  return [{ name: 'Night Clerk', body: 'm', skin: SKINS[3], hairStyle: 'short', hairColor: HAIRS[2], outfit: 'jacket', shirt: SHIRTS[1], pants: PANTS[0], legwear: 'pants', glasses: false, hat: '', beard: false, eye: EYES[0] },
    { name: 'Night Clerk', body: 'f', skin: SKINS[1], hairStyle: 'pony', hairColor: HAIRS[5], outfit: 'sweater', shirt: SHIRTS[4], pants: PANTS[2], legwear: 'pants', glasses: true, hat: '', beard: false, eye: EYES[1] },
    { name: 'Night Clerk', body: 'f2', skin: SKINS[6], hairStyle: 'long', hairColor: HAIRS[0], outfit: 'coat', shirt: SHIRTS[6], pants: PANTS[1], legwear: 'pants', glasses: false, hat: 'beanie', beard: false, eye: EYES[0] }][i % 3];
}
export function loadChars() {
  let d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  if (!d || !Array.isArray(d.slots)) d = { active: 0, slots: [] };
  for (let i = 0; i < SLOTS; i++) d.slots[i] = { ...defaultLook(i), ...(d.slots[i] || {}) };
  return d;
}
function saveChars(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
export function activeLook() { const d = loadChars(); return d.slots[d.active] || defaultLook(0); }

// look -> parameters for chars.js buildCharacter
export function lookToParams(L) {
  const f = L.body !== 'm';
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const p = randomParams(f ? 'f' : 'm', rnd);
  Object.assign(p, {
    gender: f ? 'f' : 'm', body2: L.body === 'f2', child: false, elder: false, skin: L.skin, hairStyle: L.hairStyle, hairColor: L.hairColor,
    outfit: L.outfit === 'coat' ? 'tee' : L.outfit, coat: L.outfit === 'coat', coatColor: L.shirt, shirt: L.shirt, pants: L.pants,
    legwear: L.legwear, skirt: f && L.outfit === 'dress', glasses: !!L.glasses, sunglasses: false, hat: L.hat || null, hatColor: L.shirt,
    beard: !f && !!L.beard, stubble: !f && !L.beard, eye: L.eye, backpack: false, bag: false, headphones: false, earmuffs: false, scarf: false, apron: false, chain: false, vest: false,
    pattern: 'solid', denim: false, height: f ? 0.97 : 1.02, build: { w: 1, d: 1, legs: 1, head: 1 },
  });
  return p;
}

// ---------------------------------------------------------------- UI
let ui = null, renderer = null, scene = null, cam = null, model = null, raf = 0, data = null, slot = 0, onClose = null;
const hex = c => '#' + c.toString(16).padStart(6, '0');
function swatches(id, list, cur) { return `<div class="sw" data-k="${id}">${list.map(c => `<button style="background:${hex(c)}" data-v="${c}" class="${c === cur ? 'on' : ''}"></button>`).join('')}</div>`; }
function select(id, opts, cur) { return `<select data-k="${id}">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o || 'none']; return `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`; }).join('')}</select>`; }

function render() {
  const L = data.slots[slot];
  const f = L.body !== 'm';
  ui.querySelector('#ccSlots').innerHTML = data.slots.map((s_, i) => `<button data-slot="${i}" class="${i === slot ? 'on' : ''}">Slot ${i + 1}<small>${s_.name}${i === data.active ? ' · in use' : ''}</small></button>`).join('');
  ui.querySelector('#ccForm').innerHTML = `
    <label>Name <input data-k="name" maxlength="20" value="${L.name.replace(/"/g, '')}"></label>
    <label>Body ${select('body', BODIES, L.body)}</label>
    <div class="ccl">Skin</div>${swatches('skin', SKINS, L.skin)}
    <label>Hair ${select('hairStyle', f ? HAIR_F : HAIR_M, L.hairStyle)}</label>
    <div class="ccl">Hair colour</div>${swatches('hairColor', HAIRS, L.hairColor)}
    <div class="ccl">Eyes</div>${swatches('eye', EYES, L.eye)}
    <label>Top ${select('outfit', f ? OUTFITS_F : OUTFITS, L.outfit)}</label>
    <div class="ccl">Top colour</div>${swatches('shirt', SHIRTS, L.shirt)}
    <label>Legs ${select('legwear', f ? LEGS : LEGS.slice(0, 2), L.legwear)}</label>
    <div class="ccl">Trousers colour</div>${swatches('pants', PANTS, L.pants)}
    <label>Hat ${select('hat', HATS, L.hat)}</label>
    <label class="cb"><input type="checkbox" data-k="glasses" ${L.glasses ? 'checked' : ''}> Glasses</label>
    ${f ? '' : `<label class="cb"><input type="checkbox" data-k="beard" ${L.beard ? 'checked' : ''}> Beard</label>`}`;
  rebuild();
}
function rebuild() {
  if (model) scene.remove(model.root);
  try { model = buildCharacter(lookToParams(data.slots[slot]), {}); scene.add(model.root); } catch (e) { console.warn(e); model = null; }
}
function set(k, v) {
  const L = data.slots[slot];
  if (['skin', 'hairColor', 'shirt', 'pants', 'eye'].includes(k)) v = +v;
  L[k] = v;
  if (k === 'body') {   // keep the hair/outfit valid for the body
    const f = v !== 'm';
    if (f && !HAIR_F.includes(L.hairStyle)) L.hairStyle = 'long';
    if (!f && !HAIR_M.includes(L.hairStyle)) L.hairStyle = 'short';
    if (!f && (L.outfit === 'dress' || L.legwear === 'skirt')) { L.outfit = L.outfit === 'dress' ? 'tee' : L.outfit; L.legwear = 'pants'; }
  }
  saveChars(data);
  if (k === 'name') { ui.querySelector(`#ccSlots [data-slot="${slot}"] small`).textContent = v + (slot === data.active ? ' · in use' : ''); return; }
  render();
}
function frame() {
  raf = requestAnimationFrame(frame);
  if (!renderer) return;
  const c = renderer.domElement, w = c.clientWidth, h = c.clientHeight;
  if (c.width !== w || c.height !== h) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  if (model) { model.root.rotation.y += 0.008; model.update(1 / 60, { walking: false, talk: 0 }); }
  renderer.render(scene, cam);
}
export function openCustomizer(close) {
  onClose = close; data = loadChars(); slot = data.active;
  if (!ui) {
    ui = document.createElement('div'); ui.id = 'custom'; ui.className = 'screen';
    ui.innerHTML = `<div class="ccWrap panel"><div class="ptitle">Character</div>
      <div class="ccMain"><div class="ccLeft"><div id="ccSlots"></div><div id="ccForm"></div></div>
      <div class="ccRight"><canvas id="ccView"></canvas><p class="dim">This is how the other player sees you in co-op.</p>
      <div class="ccBtns"><button id="ccUse">Use this slot</button><button id="ccReset">Reset slot</button><button id="ccBack">Back</button></div></div></div></div>`;
    document.body.appendChild(ui);
    ui.addEventListener('keydown', e => e.stopPropagation());
    ui.addEventListener('click', e => {
      const sb = e.target.closest('[data-slot]'); if (sb) { slot = +sb.dataset.slot; render(); return; }
      const sw = e.target.closest('.sw button'); if (sw) { set(sw.parentElement.dataset.k, sw.dataset.v); return; }
    });
    ui.addEventListener('change', e => { const k = e.target.dataset.k; if (!k) return; set(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value); });
    ui.addEventListener('input', e => { if (e.target.dataset.k === 'name') set('name', e.target.value || 'Night Clerk'); });
    ui.querySelector('#ccUse').onclick = () => { data.active = slot; saveChars(data); render(); };
    ui.querySelector('#ccReset').onclick = () => { data.slots[slot] = defaultLook(slot); saveChars(data); render(); };
    ui.querySelector('#ccBack').onclick = () => closeCustomizer();
    renderer = new THREE.WebGLRenderer({ canvas: ui.querySelector('#ccView'), antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xe8e4ff, 0x3a3028, 1.7));
    const dl = new THREE.DirectionalLight(0xfff0d8, 2.0); dl.position.set(1.5, 3, 3); scene.add(dl);
    cam = new THREE.PerspectiveCamera(28, 1, 0.05, 30); cam.position.set(0, 1.05, 4.4); cam.lookAt(0, 0.92, 0);
  }
  ui.classList.remove('hidden');
  render();
  cancelAnimationFrame(raf); frame();
}
export function closeCustomizer() {
  if (ui) ui.classList.add('hidden');
  cancelAnimationFrame(raf);
  onClose && onClose();
}
