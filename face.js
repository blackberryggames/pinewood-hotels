// Night Desk — painted faces for the low-poly residents (one small texture per person, redrawn when they blink/talk)
import * as THREE from 'three';

const S = 128;                       // texture size
const hex = c => '#' + new THREE.Color(c).getHexString();
const shade = (c, k) => { const o = new THREE.Color(c); o.multiplyScalar(k); return '#' + o.getHexString(); };
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

// UV layout (v = 0 chin .. 1 top of head): mouth .27, nose tip .40, eyes .55, brows .625, mask top .71
let RM = false;   // the second female base mesh needs its lower face lifted
const X = u => u * S, Y = v => (1 - (RM ? v - 0.025 : v)) * S;

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export class FacePainter {
  constructor(p, an = {}) {
    this.p = p; this.an = an;
    this.seed = Math.floor((p.seed ?? Math.random()) * 1e9);
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = S;
    this.g = this.cv.getContext('2d');
    this.glowCv = document.createElement('canvas'); this.glowCv.width = this.glowCv.height = S;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.glowTex = new THREE.CanvasTexture(this.glowCv); this.glowTex.colorSpace = THREE.SRGBColorSpace;
    this.tex.flipY = false; this.glowTex.flipY = false;   // glTF UVs are top-down
    this.key = '';
    const k_ = an.k ?? 1;
    this.skin = an.mannequin ? 0xd6c2a6 : an.pale ? new THREE.Color(p.skin).lerp(new THREE.Color(0xa9b5b0), 0.35 + 0.65 * k_).getHex() : an.rot ? new THREE.Color(p.skin).lerp(new THREE.Color(0x7a8a5a), 0.2 + 0.3 * k_).getHex() : p.skin;
    this.decal = !!p.body2;
    this.material = new THREE.MeshLambertMaterial({ map: this.tex, emissiveMap: this.glowTex, emissive: 0x000000, color: 0xe4e4e4,
      ...(this.decal ? { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: 0.01 } : {}) });
    this.draw({});
  }

  draw({ blink = false, talk = 0, glow = '', turn = 0 } = {}) {
    const key = `${blink ? 1 : 0}${talk}${glow}${Math.round(turn * 3)}`;
    if (key === this.key) return;
    this.key = key;
    const { g, p, an } = this, r = rng(this.seed);
    RM = this.decal;   // the second female's decal: features sit a touch lower
    const f = p.gender === 'f', kid = p.child, old = p.elder;
    const skin = hex(this.skin);
    g.clearRect(0, 0, S, S);
    // base skin with soft shading (darker toward the sides, lighter forehead/nose)
    if (!this.decal) { g.fillStyle = skin; g.fillRect(0, 0, S, S); }   // decals stay transparent: the real head shows through
    let gr;   // (no edge shading: the mask must blend seamlessly into the head)
    if (!an.mannequin) {
      // pores / skin noise
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,235,220' : '60,30,20'},${0.025 + r() * 0.03})`; g.fillRect(r() * S, r() * S, 1, 1); }
      // cheeks
      const blush = f || kid ? 0.16 : 0.07;
      for (const u of [0.28, 0.72]) { gr = g.createRadialGradient(X(u), Y(0.4), 1, X(u), Y(0.4), 14); gr.addColorStop(0, `rgba(200,80,70,${blush})`); gr.addColorStop(1, 'rgba(200,80,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
      if (p.freckles) for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,60,30,${0.25 + r() * 0.2})`; const u = 0.5 + (r() - 0.5) * 0.55, v = 0.42 + (r() - 0.5) * 0.12; g.fillRect(X(u), Y(v), 1.3, 1.3); }
      // stubble / beard
      if (!f && !kid && !p.beard && p.stubble) { for (let i = 0; i < 420; i++) { const u = 0.5 + (r() - 0.5) * 0.75, v = r() * 0.36; if (Math.abs(u - 0.5) < 0.12 && v > 0.22 && v < 0.33) continue; g.fillStyle = `rgba(30,20,15,${0.12 + r() * 0.12})`; g.fillRect(X(u), Y(v), 1, 1); } }
      // eye sockets
      for (const u of this.eyeU()) { gr = g.createRadialGradient(X(u), Y(0.555), 4, X(u), Y(0.555), 20); gr.addColorStop(0, `rgba(60,30,30,${an.pale ? 0.45 : old ? 0.22 : 0.12})`); gr.addColorStop(1, 'rgba(60,30,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
      // nose
      if (!p.body2) {
      g.strokeStyle = 'rgba(60,28,18,0.42)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0.46), Y(0.53)); g.quadraticCurveTo(X(0.44), Y(0.44), X(0.46), Y(0.4)); g.stroke();
      g.beginPath(); g.moveTo(X(0.44), Y(0.405)); g.quadraticCurveTo(X(0.5), Y(0.385), X(0.56), Y(0.405)); g.stroke();
      g.fillStyle = 'rgba(255,235,220,0.18)'; g.beginPath(); g.ellipse(X(0.5), Y(0.43), 3, 6, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(40,15,10,0.55)'; for (const u of [0.45, 0.55]) { g.beginPath(); g.ellipse(X(u), Y(0.385), 4.2, 2.3, 0, 0, 7); g.fill(); }
      }
      // wrinkles for older people
      if (old) {
        g.strokeStyle = 'rgba(60,30,20,0.3)'; g.lineWidth = 1;
        for (const v of [0.665, 0.69]) { g.beginPath(); g.moveTo(X(0.36), Y(v)); g.quadraticCurveTo(X(0.5), Y(v + 0.012), X(0.64), Y(v)); g.stroke(); }
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(0.5 + s * 0.08), Y(0.39)); g.quadraticCurveTo(X(0.5 + s * 0.14), Y(0.32), X(0.5 + s * 0.13), Y(0.26)); g.stroke();
          for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(X(0.5 + s * 0.27), Y(0.56 - k * 0.015)); g.lineTo(X(0.5 + s * 0.31), Y(0.57 - k * 0.03)); g.stroke(); } }
      }
    }
    if (an.rot) { for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(50,60,30,${(0.15 + r() * 0.25) * (0.5 + 0.5 * (this.an.k ?? 1))})`; g.beginPath(); g.ellipse(r() * S, r() * S * 0.8 + S * 0.1, 3 + r() * 6, 2 + r() * 5, r() * 3, 0, 7); g.fill(); } }
    this.eyes(blink, glow);
    this.brows();
    this.mouth(talk, turn);
    if (p.beard && !an.mannequin) this.beard(r);
    if (turn > 0.2 || an.veins) { g.strokeStyle = `rgba(50,10,40,${0.5 * Math.max(turn, an.veins ? 0.6 : 0)})`; g.lineWidth = 1;
      for (let i = 0; i < 9; i++) { let u = 0.25 + r() * 0.5, v = 0.6 + r() * 0.1; g.beginPath(); g.moveTo(X(u), Y(v)); for (let k = 0; k < 4; k++) { u += (r() - 0.5) * 0.06; v -= 0.03 + r() * 0.03; g.lineTo(X(u), Y(v)); } g.stroke(); } }
    // glow layer (eye-shine under the flashlight, red when they turn)
    const gg = this.glowCv.getContext('2d'); gg.fillStyle = '#000'; gg.fillRect(0, 0, S, S);
    if (glow) { gg.fillStyle = glow === 'red' ? '#ff2a10' : '#fff2a0'; for (const u of this.eyeU()) { gg.beginPath(); gg.ellipse(X(u), Y(0.55), 3.4, 3.4, 0, 0, 7); gg.fill(); }
      if (an.extraEye) { gg.beginPath(); gg.ellipse(X(0.5), Y(0.665), 2.6, 3.4, 0, 0, 7); gg.fill(); } }
    this.material.emissive.setHex(glow ? 0xffffff : 0x000000);
    this.tex.needsUpdate = true; this.glowTex.needsUpdate = true;
  }

  eyeU() { const d = this.an.wideEyes ? 0.215 + 0.06 * (this.an.k ?? 1) : 0.215; return [0.5 - d, 0.5 + d]; }

  eyes(blink, glow) {
    const { g, p, an } = this, f = p.gender === 'f';
    const eyesAt = this.eyeU().map((u, i) => [u, 0.55, an.wideEyes && i === 0 ? 1.3 : 1, 0]);
    if (an.extraEye) eyesAt.push([0.5, 0.665, 0.45 + 0.45 * (this.an.k ?? 1), Math.PI / 2]);
    for (const [u, v, sc, rot] of eyesAt) {
      const F = this.decal ? 1.12 : 1, FY = this.decal ? 1.3 : 1;   // the decal maps a taller head into the same square   // the second female base mesh has a narrower face mapping
      g.save(); g.translate(X(u), Y(v)); g.rotate(rot); g.scale(sc * F, sc * F * FY);
      const w = 15.8, h = 7.6;
      if (an.mannequin) { g.fillStyle = '#141010'; g.beginPath(); g.ellipse(0, 0, 3, 3, 0, 0, 7); g.fill(); g.restore(); continue; }
      if ((blink && !an.noBlink) || an.sleep) {
        g.strokeStyle = 'rgba(40,20,15,0.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-w, 0); g.quadraticCurveTo(0, 2.5, w, 0); g.stroke();
        if (f) { g.lineWidth = 2.2; g.beginPath(); g.moveTo(-w, 0); g.quadraticCurveTo(0, 2.8, w + 1, -0.5); g.stroke(); }
        g.restore(); continue;
      }
      // white of the eye (almond)
      const fullBlack = an.blackEyes && (this.an.k ?? 1) > 0.75;
      g.fillStyle = fullBlack ? '#050404' : '#ece6dc';
      g.beginPath(); g.moveTo(-w, 0); g.quadraticCurveTo(0, -h * 1.6, w, 0); g.quadraticCurveTo(0, h * 1.3, -w, 0); g.fill();
      if (!fullBlack) {
        g.save(); g.clip();
        const ir = an.blackEyes ? 8.4 : an.tinyPupils ? 6 : 6.7;
        g.fillStyle = glow ? (glow === 'red' ? '#ff3010' : '#fff4a0') : an.blackEyes ? '#060505' : hex(p.eye); g.beginPath(); g.arc(0, 0.2, ir, 0, 7); g.fill();
        g.fillStyle = an.tinyPupils ? '#ece6dc' : 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(0, 0.2, ir * 0.75, 0, 7); g.fill();
        g.fillStyle = '#050505'; g.beginPath(); g.arc(0, 0.2, an.tinyPupils ? 1.2 : 3, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(1.4, -2.2, 1.7, 1.7);
        g.fillStyle = 'rgba(60,30,20,0.25)'; g.fillRect(-w, -h * 1.6, w * 2, 2.2);   // upper lid shadow
        g.restore();
      }
      // lids + lashes
      g.strokeStyle = 'rgba(30,15,10,1)'; g.lineWidth = f ? 2.8 : 1.9;
      g.beginPath(); g.moveTo(-w - (f ? 1 : 0), f ? -0.6 : 0); g.quadraticCurveTo(0, -h * 1.65, w + (f ? 1.5 : 0), f ? -1 : 0); g.stroke();
      g.strokeStyle = 'rgba(70,35,25,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-w + 1, 0.6); g.quadraticCurveTo(0, h * 1.4, w - 1, 0.6); g.stroke();
      if (p.makeup && f) { g.fillStyle = `rgba(${p.makeup},0.18)`; g.beginPath(); g.ellipse(0, -h * 1.3, w, 3, 0, 0, 7); g.fill(); }
      g.restore();
    }
  }

  brows() {
    const { g, p, an } = this, f = p.gender === 'f';
    if (an.mannequin) return;
    const col = p.elder ? '#8a8a84' : shade(p.hairColor, 0.8);
    g.strokeStyle = col; g.lineCap = 'round';
    for (const [u, s] of this.eyeU().map((u, i) => [u, i ? 1 : -1])) {
      g.lineWidth = f ? 3.6 : 5.6;
      const lift = p.browLift || 0;
      g.beginPath(); g.moveTo(X(u - s * 0.135), Y(0.632 + lift)); g.quadraticCurveTo(X(u + s * 0.01), Y(f ? 0.68 : 0.668), X(u + s * 0.155), Y(0.635 + lift)); g.stroke();
    }
  }

  mouth(talk, turn) {
    const { g, p, an } = this, f = p.gender === 'f';
    const cx = X(0.5), cy = Y(0.27);
    if (p.body2 && !an.wideMouth && !an.smile && talk === 0 && turn <= 0 && !an.mannequin) {
      g.fillStyle = 'rgba(170,70,75,0.45)'; g.beginPath(); g.ellipse(cx, cy + 1, 13, 4.5, 0, 0, 7); g.fill(); return;
    }
    if (an.mannequin) { g.strokeStyle = 'rgba(90,40,40,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy); g.stroke(); return; }
    const lip = an.pale ? '#5a4a50' : f ? (p.lipColor ? hex(p.lipColor) : '#b0545a') : mix(this.skin, 0x8a3a34, 0.45);
    const wide = an.wideMouth;
    const mw = wide ? 21 + 24 * (this.an.k ?? 1) : f ? 18.5 : 20;
    const open = Math.max(talk / 3, turn > 0 ? 0.4 + turn * 0.6 : 0, wide ? 0.35 : 0);
    if (open > 0.05) {
      const oh = 2 + open * (wide ? 9 : 7);
      g.fillStyle = '#2a0808'; g.beginPath(); g.ellipse(cx, cy + 1, mw * (wide ? 1 : 0.8), oh, 0, 0, 7); g.fill();
      g.fillStyle = '#e8e0cc';
      if (wide || turn > 0) { for (let i = -mw + 2; i < mw - 2; i += 3) { g.fillRect(cx + i, cy - oh + 1.5, 2, 2.6); g.fillRect(cx + i + 1, cy + oh - 2.5, 2, 2.2); } }
      else g.fillRect(cx - mw * 0.55, cy - oh + 1, mw * 1.1, 2);
    }
    // lips
    g.fillStyle = lip;
    g.beginPath(); g.moveTo(cx - mw, cy); g.quadraticCurveTo(cx - mw * 0.4, cy - (f ? 4 : 3), cx, cy - (f ? 2.5 : 2)); g.quadraticCurveTo(cx + mw * 0.4, cy - (f ? 4 : 3), cx + mw, cy);
    g.quadraticCurveTo(cx, cy - 0.6 - (open > 0.05 ? open * 5 : 0), cx - mw, cy); g.fill();
    g.beginPath(); g.moveTo(cx - mw + 1, cy + (open > 0.05 ? open * 5 : 0) * 0.7); g.quadraticCurveTo(cx, cy + (f ? 5 : 4) + open * 6, cx + mw - 1, cy + (open > 0.05 ? open * 5 : 0) * 0.7);
    g.quadraticCurveTo(cx, cy + 1 + open * 5, cx - mw + 1, cy + (open > 0.05 ? open * 5 : 0) * 0.7); g.fill();
    if (open <= 0.05) { g.strokeStyle = 'rgba(40,10,10,0.7)'; g.lineWidth = 1; g.beginPath(); const up = an.smile ? 2 + 3 * (this.an.k ?? 1) : 0; g.moveTo(cx - mw - up * 0.6, cy - up); g.quadraticCurveTo(cx, cy + (wide ? -3 : 0.6) + up, cx + mw + up * 0.6, cy - up); g.stroke(); }
  }

  beard(r) {
    const { g, p } = this;
    const col = new THREE.Color(p.elder ? 0x9a9a94 : p.hairColor);
    for (let i = 0; i < 1400; i++) {
      const u = 0.5 + (r() - 0.5) * 0.86, v = r() * 0.38;
      const du = Math.abs(u - 0.5);
      if (v > 0.335 - du * 0.25) continue;                       // stays below the cheeks
      if (du < 0.14 && v > 0.215 && v < 0.315) continue;        // keep the lips clear
      const k = 0.7 + r() * 0.5;
      g.fillStyle = `rgba(${col.r * 255 * k | 0},${col.g * 255 * k | 0},${col.b * 255 * k | 0},${0.55 + r() * 0.4})`;
      g.fillRect(X(u), Y(v), 1.4, 2);
    }
    for (let i = 0; i < 220; i++) { const u = 0.5 + (r() - 0.5) * 0.26, v = 0.315 + r() * 0.03; g.fillStyle = `rgba(${col.r * 230 | 0},${col.g * 230 | 0},${col.b * 230 | 0},0.8)`; g.fillRect(X(u), Y(v), 1.4, 1.6); }
  }
}

// grayscale hair-strand texture, tinted per person by the material colour
let HAIR_TEX = null;
export function hairTexture() {
  if (HAIR_TEX) return HAIR_TEX;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, 128, 128);
  const r = rng(77);
  for (let i = 0; i < 900; i++) { const x = r() * 128, w = 0.6 + r() * 1.2, l = 20 + r() * 70, y = r() * 128; g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.06 + r() * 0.16})`; g.fillRect(x, y, w, l); g.fillRect(x, y - 128, w, l); }
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.1)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  HAIR_TEX = new THREE.CanvasTexture(c); HAIR_TEX.wrapS = HAIR_TEX.wrapT = THREE.RepeatWrapping; HAIR_TEX.colorSpace = THREE.SRGBColorSpace; HAIR_TEX.flipY = false;
  return HAIR_TEX;
}
