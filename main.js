// Night Desk — a low poly checkpoint horror game
import * as THREE from 'three';
import { AudioSys } from './audio.js';
import { LAYER, PSX, mat, basic, patchPSX, setLayer, buildCharacter, buildGaunt, buildCrawler, buildWeeper, buildHound, buildScareFace, loadModels, buildRare, setPortraitRenderer, randomParams, drawPortrait, HAIRS, EYES } from './chars.js';

const $ = id => document.getElementById(id);
const VT = window.VOICE_TEXT || {};
VT.mgr_visit = VT.mgr_visit || '';
VT.mgr_logbook = "Just grabbing the logbook. You're doing fine. Keep that shutter handy.";   // (put the clip's transcript here to show it as a subtitle)
for (const k in VT) VT[k] = VT[k].replace(/\bI D\b/g, 'ID');
const audio = new AudioSys();
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const slug = n => n.replace(/[^A-Za-z]/g, '').toLowerCase();

const NAMES = {
  f: ["Mara Quinn", "Jessica Hale", "Ruth Calloway", "Nina Park", "Delia Moss", "Ivy Hart", "Carmen Reyes", "Holly Vance", "Tess Morrow", "Grace Lin", "Opal Fenn", "Wendy Shaw", "Lucy Bram", "Ada Kessler", "June Ortega", "Rosa Dunn"],
  m: ["Victor Lane", "Sam Okafor", "Elliot Crane", "Marcus Bell", "Tom Hadley", "Felix Grey", "Hank Mercer", "Owen Pike", "Leo Varga", "Dale Whitford", "Ray Castillo", "Gus Neville", "Ben Archer", "Milo Stroud", "Isaac Ford", "Walt Harlow"]
};
for (const [n_, sl] of Object.entries(window.NAME_SLOTS || {})) NAMES[sl[0] === 'm' ? 'm' : 'f'].push(n_);
const COUNT = { greet: 6, id: 4, where: 6, strange: 5, shutter: 5, admit: 4, deny: 4, guest: 2, stranger: 2, mgreet: 4, mwhere: 4, mstrange: 3, mshutter: 7, mturn: 3, madmit: 2, mdeny: 3 };
const GAME_DATE = 'NOV 23 1999';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const nightDate = n => { const d = new Date(1999, 10, 22 + (n || 1)); return `${MONTHS[d.getMonth()]} ${d.getDate()} 1999`; };   // night 1 = NOV 23 1999
const tonight = () => nightDate(typeof night !== 'undefined' && night ? night.n : (typeof G !== 'undefined' && G && G.night) || 1);
const MANAGER = { name: 'Dan Mercer', role: 'Night Manager', code: 'MGR-0071' };
(window.VOICE_EL ||= []).push('mgr_visit', 'mgr_logbook');
if (!(window.SFX_EL ||= []).includes('jumpscare_mgr')) window.SFX_EL.push('jumpscare_mgr');   // sting when the manager bursts in   // the night manager at the window (ElevenLabs clip in voices/)
const GAME_YEAR = 1999;
const dobStr = y => `${String(1 + Math.random() * 12 | 0).padStart(2, '0')}/${String(1 + Math.random() * 28 | 0).padStart(2, '0')}/${y}`;
// an age no living person can have: born 130-210 years ago, or (sometimes) after tonight
// resident cards: real ones were issued before tonight, carry the red VALIDATED stamp, a signature and the exact hotel name
const HOTEL_ORG = 'HOLLOW PINES HOTEL';
const MISPRINTS = ['HOLLOW PINE HOTEL', 'HALLOW PINES HOTEL', 'HOLLOW PINES MOTEL', 'HOLOW PINES HOTEL', 'HOLLOW PlNES HOTEL', 'HOLLOW PINES HOTE'];
const issuedStr = () => dobStr(1990 + (Math.random() * 9 | 0));                    // 1990-1998: always before NOV 23 1999
const futureIssued = () => dobStr(GAME_YEAR + 1 + (Math.random() * 6 | 0));        // 2000-2005: a card that hasn't been printed yet
function impossibleDob() { return dobStr(Math.random() < 0.75 ? GAME_YEAR - 130 - (Math.random() * 80 | 0) : GAME_YEAR + 1 + (Math.random() * 40 | 0)); }

// ------------------------------------------------------------------ monster catalogue
const MTYPES = {
  hollow: { name: 'Hollow', night: 1, diff: 'EASY', tell: 'Eyes are pitch black — no whites at all. Skin has a grey, drowned tinge. Their voice crackles.', an: { blackEyes: true, pale: true }, distort: 0.4, patience: [32, 42], odd: 0.5 , temp: 0.3 },
  grinner: { name: 'Grinner', night: 1, diff: 'EASY', tell: 'A smile stretched much too wide, full of small teeth. It never stops smiling.', an: { wideMouth: true }, distort: 0.25, patience: [32, 42], odd: 0.5 , temp: 0.55 },
  gaunt: { name: 'Gaunt', night: 1, diff: 'OBVIOUS', tell: 'Doesn\'t even pretend. Tall, grey, no eyes. Slam the shutter immediately — it attacks within seconds.', gaunt: true, model: 'gaunt', distort: 1, patience: [8, 11], temp: 0.1 },
  seer: { name: 'Seer', night: 2, diff: 'MEDIUM', tell: 'A third eye, vertical, in the middle of the forehead. Lean in close — it\'s small through the glass.', an: { extraEye: true }, distort: 0.15, patience: [45, 60], odd: 0.3 , temp: 0.6 },
  stretched: { name: 'Stretched', night: 2, diff: 'MEDIUM', tell: 'Something is too long. A neck that holds the head too high, or arms whose hands hang down by the knees.', an: null, distort: 0.1, patience: [45, 60], odd: 0.3 , temp: 0.45 },
  twitcher: { name: 'Twitcher', night: 2, diff: 'MEDIUM', tell: 'Mismatched, too-wide eyes. The head snaps sideways at wrong angles. Gives strange answers when questioned.', an: { twitch: true, wideEyes: true }, distort: 0.2, patience: [45, 60], odd: 1 , temp: 0.5 },
  mirror: { name: 'Mirror', night: 2, diff: 'CAMERA', tell: 'Looks perfectly human through the glass. On the CAMERA it has no face — just eyes and teeth. Always check the monitor.', an: { trueForm: true }, distort: 0, patience: [55, 70], odd: 0 , temp: 0.15 },
  crawler: { name: 'Crawler', night: 3, diff: 'OBVIOUS', tell: 'Something wearing a person\'s top half, carried on four long legs. Its face hangs upside down. It is fast. Shutter, now.', gaunt: true, crawler: true, model: 'crawler', temp: 0.1, distort: 1, patience: [7, 10] },
  weeper: { name: 'Weeper', night: 2, diff: 'OBVIOUS', tell: 'A tall woman in a long grey dress, hair hanging over her face, arms reaching past her knees. If the hair parts, you have seconds.', gaunt: true, model: 'weeper', distort: 1, patience: [12, 16], temp: 0.1 },
  puppet: { name: 'Puppet', night: 2, diff: 'CAMERA', tell: 'Moves in small jerks, as if something above is pulling it. On the CAMERA you can see the strings rising into the dark.', an: { strings: true }, distort: 0.1, patience: [55, 70], odd: 0.2, temp: 0.2 },
  echo: { name: 'Echo', night: 3, diff: 'HARD', tell: 'Its voice is perfect, but its lips never move while it talks. Lean in and watch the mouth.', an: { noLips: true }, distort: 0, patience: [70, 90], odd: 0, temp: 0.85 },
  hound: { name: 'Hound', night: 4, diff: 'OBVIOUS', tell: 'Walks on all fours on human hands. A man\'s face and far too many teeth. It smiles the whole time. Shutter immediately.', gaunt: true, model: 'hound', distort: 1, patience: [7, 10], temp: 0.1 },
  backwards: { name: 'Backwards', night: 4, diff: 'MEDIUM', tell: 'Its feet point the wrong way. Watch it walk up, or look down at it on the CAMERA.', an: { backwardsFeet: true }, distort: 0.1, patience: [55, 70], odd: 0.2, temp: 0.5 },
  copy: { name: 'Copy', night: 3, diff: 'HARD', tell: 'A perfect copy of a resident. Only the papers are wrong: ID number, room, a misspelled name, an expired card, an impossible birth year, a missing stamp or signature, a card issued in the future, a misprinted hotel name — or the real resident is already IN.', idOnly: true, distort: 0, patience: [75, 95], odd: 0 , temp: 0.9 },
  lookalike: { name: 'Lookalike', night: 3, diff: 'HARD', tell: 'Copies a resident from memory and gets one detail wrong: hair colour, glasses, eye colour, beard. Compare their face with the ledger photo.', look: true, distort: 0, patience: [75, 95], odd: 0 , temp: 0.9 },
  mannequin: { name: 'Mannequin', night: 3, diff: 'MEDIUM', tell: 'Plastic skin, painted-on eyes, a seam around the neck and wrists. Never blinks, never breathes, its mouth never opens. Walks without swinging its arms.', an: { mannequin: true, noBlink: true, noBreath: true, noLips: true }, distort: 0.15, patience: [55, 70], odd: 0.3, temp: 0.1 },
  usher: { name: 'Usher', night: 4, diff: 'CAMERA', tell: 'Far too tall to fit the window — you only ever see its chest. Check the camera to see what is above. When it bends down to look at you, it is too late.', an: { tall: true }, distort: 0.2, patience: [45, 60], odd: 0.3, temp: 0.3 },
  controller: { name: 'The Controller', night: 99, diff: 'RARE', tell: 'Calm, polite, perfect papers. Ringed eyes that never leave yours. She does not want in for herself. She wants the people inside. Never let her in.', distort: 0, patience: [9999, 9999], odd: 0, temp: 0.5, rare: true },
  smiler: { name: 'Smiler', night: 6, diff: 'MEDIUM', tell: 'A small, fixed smile that never changes, even when it is begging or complaining. Its lips never part when it speaks.', an: { smile: true, noLips: true }, distort: 0.08, patience: [55, 70], odd: 0.2, temp: 0.6 },
  wrongvoice: { name: 'Wrong Voice', night: 6, diff: 'HARD', tell: 'The face is right. The papers are right. The voice belongs to someone else entirely — a man\'s voice from a woman\'s mouth, or the other way round.', an: { wrongVoice: true }, distort: 0, patience: [70, 90], odd: 0, temp: 0.85 },
  rot: { name: 'Rot', night: 7, diff: 'MEDIUM', tell: 'Skin with a grey-green tinge and dark blotches. Flies circle its head. It smells like the ditch.', an: { rot: true }, distort: 0.2, patience: [50, 65], odd: 0.4, temp: 0.2 },
  sleepwalker: { name: 'Sleepwalker', night: 7, diff: 'MEDIUM', tell: 'Its eyes stay closed the entire time — while walking up, while talking, while you stare at it.', an: { sleep: true, noBlink: true }, distort: 0.1, patience: [55, 70], odd: 0.3, temp: 0.7 },
  static: { name: 'Static', night: 8, diff: 'CAMERA', tell: 'Through the glass it is perfectly normal. On the CAMERA it keeps flickering out of existence, like the tape cannot hold it.', an: { static: true }, distort: 0.05, patience: [55, 70], odd: 0.1, temp: 0.3 },
  ancient: { name: 'Ancient', night: 5, diff: 'HARD', tell: 'Looks and sounds like anyone else. Read the date of birth — it is 1999. Born in the 1800s means older than anyone has ever lived. Born after tonight means not born yet. Neither is a person.', idOnly: true, distort: 0, patience: [70, 90], odd: 0, temp: 0.4 },
  impostor: { name: 'Impostor', night: 3, special: true, diff: 'HARD', tell: 'Wears the night manager\'s face, voice and sometimes even his badge, perfectly. Only the date gives it away: check the MANAGER ROTA in the ledger. If tonight is not one of his dates, he is not here.', idOnly: true, distort: 0, patience: [70, 90], odd: 0, temp: 0.85 },
  still: { name: 'Still', night: 4, diff: 'VERY HARD', tell: 'Never blinks. Does not breathe — no breath fog in the cold air. Casts no shadow under the lamp. Eyes shine under the flashlight.', an: { noBlink: true, noBreath: true, noShadow: true, eyeShine: true }, distort: 0, patience: [70, 90], odd: 0 , temp: 0.05 },
};

const MAX_NIGHT = 11;
const BRIEF = {
  1: { title: 'NIGHT ONE', key: 'mgr_n1', newTypes: ['hollow', 'grinner', 'gaunt'] },
  2: { title: 'NIGHT TWO', key: 'mgr_n2', newTypes: ['mirror', 'seer', 'stretched', 'twitcher', 'weeper', 'puppet'], notes: ['<b>CAM 03 — THERMAL</b> is online (press 3 in camera view). The living show up warm. Most of them don\'t.', '<b>Staff</b> may come to the gate. Check their card against tonight\'s staff list.', 'Listen to the <b>radio</b>. Bulletins and calls appear under <b>Notices</b> in the ledger.'] },
  3: { title: 'NIGHT THREE', key: 'mgr_n3', extra: 'mgr_uv', newTypes: ['copy', 'lookalike', 'crawler', 'echo', 'mannequin', 'impostor'], notes: ['<b>The night manager</b>, Dan Mercer, may come to the gate. Check the date tonight against the <b>MANAGER ROTA</b> (Ledger → Staff). On his nights, let him in: he will step into the booth through the side door. On any other night it is not him, whatever badge it shows.', '<b>UV LAMP</b>: press U while looking at a card. Real resident and staff cards show a glowing hotel seal.', '<b>Check-outs</b>: residents leaving the hotel come to your window from inside. Check their card and stamp them out (A). Anyone who checked out no longer lives here.', 'The <b>power</b> can fail. Hit the breaker (G) fast — they know when the lights are off.'] },
  4: { title: 'NIGHT FOUR', key: 'mgr_n4', newTypes: ['still', 'hound', 'backwards', 'usher'], notes: ['<b>Resident cards</b>: every real one carries the red <b>VALIDATED</b> stamp and a <b>signature</b>, was <b>ISSUED</b> before tonight (NOV 23 1999), and reads exactly <b>HOLLOW PINES HOTEL</b>. A card missing any of that was not made here.'] },
  5: { title: 'NIGHT FIVE', key: 'mgr_n5b', text: "Night five. They are out in numbers tonight. Trust nothing, and keep your hand near the shutter. You're halfway there.", newTypes: ['ancient'], notes: ['Read every <b>date of birth</b>. It is <b>1999</b>. Nobody is 130 years old, and nobody at the window was born in the future.'] },
  6: { title: 'NIGHT SIX', key: 'mgr_n6', text: "Night six. You're still here. Good. Watch for the ones who smile too much, and the ones whose voices don't match their faces. Listen as well as look.", newTypes: ['smiler', 'wrongvoice'], notes: ['From tonight on, the tells get <b>smaller</b> every night.'] },
  7: { title: 'NIGHT SEVEN', key: 'mgr_n7', text: 'Night seven. Something out there is rotting. Look for the flies. And some of them are walking in their sleep. Eyes closed is not a good sign.', newTypes: ['rot', 'sleepwalker'] },
  8: { title: 'NIGHT EIGHT', key: 'mgr_n8', text: "Night eight. The camera keeps glitching on certain visitors. It isn't the camera.", newTypes: ['static'] },
  9: { title: 'NIGHT NINE', key: 'mgr_n9', text: 'Night nine. A few residents are checking out this week. Stamp them out. If someone who checked out comes back, they did not come back.', newTypes: [], notes: ['Some <b>check-outs</b> are fakes: a resident who was never inside cannot check out.'] },
  10: { title: 'NIGHT TEN', key: 'mgr_n10', text: 'Night ten. They are getting better at this. The tells are smaller now. Slow down. Look twice.', newTypes: [] },
  11: { title: 'FINAL NIGHT', key: 'mgr_n11', text: 'Final night. Everything you have learned, all at once. Hold the gate until dawn, and then you can go home.', newTypes: [] },
};

// ------------------------------------------------------------------ renderer
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);
scene.fog = new THREE.FogExp2(0x070a10, 0.05);

let pixelSize = 2;
let RW = 320, RH = 180;
const sceneRT = new THREE.WebGLRenderTarget(RW, RH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
sceneRT.depthBuffer = true;
const camRT = new THREE.WebGLRenderTarget(320, 240, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });

const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.03, 120);
cam.position.set(0, 1.32, 0.28);
cam.layers.enable(LAYER.DISGUISE); cam.layers.enable(LAYER.MAIN);
scene.add(cam);
const secCams = [
  { name: 'CAM 01 — GATE', cam: new THREE.PerspectiveCamera(62, 4 / 3, 0.05, 80), pos: [0.55, 2.5, -1.06], look: [0, 1.35, -1.75] },
  { name: 'CAM 02 — ROAD', cam: new THREE.PerspectiveCamera(60, 4 / 3, 0.05, 80), pos: [-7.5, 3.6, -1.4], look: [-15, 0.8, -4.2] },
];
const _sc = secCams.forEach(s => { s.cam.position.set(...s.pos); s.cam.lookAt(...s.look); s.cam.layers.enable(LAYER.TRUE); scene.add(s.cam); });
secCams.push({ name: 'CAM 03 — THERMAL', cam: secCams[0].cam, thermal: true });
let camIdx = 0;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (!w || !h) return;
  RH = Math.max(120, Math.round(h / pixelSize)); RW = Math.round(RH * w / h);
  renderer.setSize(RW, RH, false);
  sceneRT.setSize(RW, RH);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  PSX.snap.value.set(RW / 2, RH / 2);
  post.uniforms.uRes.value.set(RW, RH);
}

// ------------------------------------------------------------------ post process
const post = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: sceneRT.texture }, tCam: { value: camRT.texture }, uCam: { value: 0 }, uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(RW, RH) }, uFlash: { value: 0 }, uFade: { value: 0 }, uNoise: { value: 0 }, uShake: { value: 0 }, uTherm: { value: 0 }, uLight: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    uniform sampler2D tScene, tCam; uniform float uCam, uTime, uFlash, uFade, uNoise, uShake, uTherm, uLight;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); } uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float bayer(vec2 p){ ivec2 i = ivec2(mod(p,4.)); int k = i.x + i.y*4;
      float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for(int j=0;j<16;j++){ if(j==k) return m[j]/16.; } return 0.; }
    void main(){
      vec2 uv = vUv;
      vec3 col;
      if (uCam > 0.5) {
        float line = floor(uv.y * uRes.y);
        uv.x += (h(vec2(line, floor(uTime*20.))) - 0.5) * 0.006 * (1. + uNoise*6.) + sin(uv.y*30. + uTime*2.) * 0.0015;
        col = pow(texture2D(tCam, uv).rgb, vec3(1./2.2));
        if (uTherm > 0.5) { col = col * 1.1; }
        else {
        float l = dot(col, vec3(.3,.59,.11));
        l = pow(l, 0.85) * 1.35;
        col = vec3(l*0.78, l*1.05, l*0.82);
        }
        col += (h(uv*uRes + uTime) - 0.5) * (0.2 + uNoise*0.6);
        col *= 0.82 + 0.18*sin(uv.y*uRes.y*3.14159);
        float bar = fract(uv.y*0.6 - uTime*0.08); col *= 0.92 + 0.08*smoothstep(0., .08, bar);
        vec2 q = vUv - .5; col *= 1. - dot(q,q)*1.6;
      } else {
        vec2 sh = vec2(h(vec2(uTime,1.)) - .5, h(vec2(1.,uTime)) - .5) * uShake * 0.03;
        vec2 u2 = uv + sh;
        // VHS: rolling tracking band + slight chroma bleed
        float bandY = fract(uTime * 0.045);
        float band = 1. - smoothstep(0.0, 0.025, abs(uv.y - bandY));
        u2.x += band * 0.0025 * sin(uTime * 60. + uv.y * 300.) + (h(vec2(floor(uv.y * uRes.y), floor(uTime * 24.))) - .5) * 0.0012;
        float ca = 0.6 / uRes.x;
        vec3 raw = vec3(texture2D(tScene, u2 + vec2(ca, 0.)).r, texture2D(tScene, u2).g, texture2D(tScene, u2 - vec2(ca, 0.)).b);
        raw += uLight * vec3(0.55, 0.6, 0.75);
        col = pow(aces(raw * 1.45), vec3(1./2.2));
        col += band * 0.05;
        vec2 q = vUv - .5; col *= 1. - dot(q,q)*1.1;
        col += (h(uv*uRes + uTime) - 0.5) * 0.035;
      }
      float d = bayer(gl_FragCoord.xy) - 0.5;
      col = floor(col * 56. + d) / 56.;
      col = mix(col, vec3(0.9, 0.05, 0.02), uFlash);
      col *= 1. - uFade;
      gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

// ------------------------------------------------------------------ textures
function tex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, w, h, base, amt, n = 1) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * n / 4; i++) { const v = Math.random() * amt - amt / 2; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`; g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + (Math.random() * 2 | 0), 1); }
}
const T = {
  asphalt: tex(64, 64, (g, w, h) => speckle(g, w, h, '#1d1e21', 60, 2), [30, 30]),
  road: tex(64, 64, (g, w, h) => { speckle(g, w, h, '#18191c', 50, 2); g.fillStyle = '#8a7a3a'; for (let x = 0; x < w; x += 32) g.fillRect(x, 31, 18, 2); }, [40, 1]),
  grass: tex(64, 64, (g, w, h) => speckle(g, w, h, '#121a10', 70, 3), [40, 40]),
  wallOut: tex(64, 64, (g, w, h) => { speckle(g, w, h, '#8a877c', 40); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 16) { g.fillRect(0, y, w, 1); for (let x = (y / 16) % 2 * 16; x < w; x += 32) g.fillRect(x, y, 1, 16); } g.fillStyle = 'rgba(40,30,10,.25)'; g.fillRect(0, h - 10, w, 10); }, [3, 3]),
  wallIn: tex(64, 64, (g, w, h) => { speckle(g, w, h, '#5d6655', 30); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h); g.fillStyle = 'rgba(60,40,10,.18)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 18); }, [3, 2]),
  floor: tex(32, 32, (g, w, h) => { speckle(g, w, h, '#3a3530', 40); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); }, [6, 6]),
  wood: tex(64, 32, (g, w, h) => { g.fillStyle = '#5a3d24'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; g.fillRect(0, y, w, 1); } g.fillStyle = 'rgba(255,220,160,.06)'; for (let i = 0; i < 8; i++) g.fillRect(Math.random() * w, Math.random() * h, 12, 1); }, [3, 1]),
  metal: tex(16, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7b7f82'); gr.addColorStop(.5, '#a3a7a8'); gr.addColorStop(1, '#55595c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,50,20,.3)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }, [8, 1]),
  stripes: tex(64, 8, (g, w, h) => { for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16) % 2 ? '#e8e0d0' : '#b01a12'; g.fillRect(x, 0, 16, h); } }, [3, 1]),
  bark: tex(16, 16, (g, w, h) => speckle(g, w, h, '#2a2018', 50), [1, 2]),
  hotel: tex(256, 128, (g, w, h) => {
    g.fillStyle = '#25221e'; g.fillRect(0, 0, w, h);
    for (let fl = 0; fl < 5; fl++) for (let i = 0; i < 16; i++) {
      const lit = Math.random() < 0.35;
      g.fillStyle = lit ? (Math.random() < 0.2 ? '#c86a3a' : '#d8b870') : '#0d0e10';
      g.fillRect(6 + i * 15.6, 10 + fl * 23, 9, 13);
      if (lit && Math.random() < 0.15) { g.fillStyle = '#000'; g.fillRect(9 + i * 15.6, 14 + fl * 23, 3, 9); }
    }
  }),
  poster: tex(64, 88, (g, w, h) => {
    g.fillStyle = '#d8ceb0'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a1a14'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.fillText('NIGHT RULES', 5, 10);
    g.fillStyle = '#222'; g.font = '6px monospace';
    ['1 CHECK EVERY ID', '2 CHECK CAMERA', '3 IN = INSIDE', '4 NO VISITORS', '5 DON\'T STARE', '6 SHUTTER SAVES', '  LIVES'].forEach((t, i) => g.fillText(t, 4, 26 + i * 9));
    g.fillStyle = '#7a1a14'; g.fillRect(4, 80, 56, 2);
  }),
  sign: tex(256, 64, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.font = 'bold 30px Impact, sans-serif'; g.textAlign = 'center';
    g.shadowColor = '#ff2a1a'; g.shadowBlur = 12; g.fillStyle = '#ff4a30';
    g.fillText('HOLLOW PINES', w / 2, 32);
    g.font = 'bold 18px Impact, sans-serif'; g.fillStyle = '#ffd070'; g.shadowColor = '#ffb030'; g.fillText('H O T E L  ·  N O   V A C A N C Y', w / 2, 56);
  }),
  puff: (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); return t; })(),
};
const M = {
  wallOut: mat(0xffffff, { map: T.wallOut }), wallIn: mat(0xffffff, { map: T.wallIn }), floor: mat(0xffffff, { map: T.floor }),
  wood: mat(0xffffff, { map: T.wood }), metal: mat(0xffffff, { map: T.metal }), dark: mat(0x1a1a1c), beige: mat(0xb8ae94),
  asphalt: patchPSX(new THREE.MeshPhongMaterial({ map: T.asphalt, shininess: 90, specular: 0x303236 })), road: patchPSX(new THREE.MeshPhongMaterial({ map: T.road, shininess: 90, specular: 0x2c2e32 })), grass: mat(0xffffff, { map: T.grass }),
  stripes: mat(0xffffff, { map: T.stripes }), pole: mat(0x3a3c3e), bark: mat(0xffffff, { map: T.bark }), pine: mat(0x0f1e14), pine2: mat(0x132619),
};

// ------------------------------------------------------------------ world construction
function add(geo, m, x, y, z, parent = scene, opts = {}) {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z);
  if (opts.rot) me.rotation.set(...opts.rot);
  me.castShadow = opts.cast ?? false; me.receiveShadow = opts.recv ?? true;
  parent.add(me); return me;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const world = {};

function buildWorld() {
  // ground
  add(new THREE.PlaneGeometry(120, 120, 48, 48), M.grass, 0, 0, 0, scene, { rot: [-Math.PI / 2, 0, 0] });
  add(new THREE.PlaneGeometry(90, 4.4, 90, 4), M.road, 0, 0.01, -3.3, scene, { rot: [-Math.PI / 2, 0, 0] });
  add(new THREE.PlaneGeometry(8, 3, 16, 6), M.asphalt, 0, 0.012, -0.2, scene, { rot: [-Math.PI / 2, 0, 0] });
  add(B(40, 0.12, 0.25), M.beige, 0, 0.06, -5.6);
  // puddles catch the lamp light
  const pudM = patchPSX(new THREE.MeshPhongMaterial({ color: 0x07090c, shininess: 160, specular: 0x9a9a9a }));
  [[-0.6, -2.3, 0.9, 0.5], [1.2, -3.6, 1.4, 0.6], [-3.5, -4.2, 1.1, 0.5], [-7, -2.6, 1.6, 0.7], [5, -4.4, 1.2, 0.5]].forEach(([x, z, sx, sz]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 14), pudM); p.rotation.x = -Math.PI / 2; p.scale.set(sx, sz, 1); p.position.set(x, 0.016, z); p.receiveShadow = true; scene.add(p);
  });

  // ---- booth
  const ext = M.wallOut, int = M.wallIn;
  const fw = [ext, ext, ext, ext, int, ext];
  add(B(2.4, 0.95, 0.1), fw, 0, 0.475, -1.0);
  add(B(2.4, 0.65, 0.1), fw, 0, 2.275, -1.0);
  add(B(0.4, 1.0, 0.1), fw, -1.0, 1.45, -1.0);
  add(B(0.4, 1.0, 0.1), fw, 1.0, 1.45, -1.0);
  add(B(0.1, 2.6, 2.4), [int, ext, ext, ext, ext, ext], -1.2, 1.3, 0.2);
  add(B(0.1, 2.6, 2.4), [ext, int, ext, ext, ext, ext], 1.2, 1.3, 0.2);
  add(B(2.4, 2.6, 0.1), [ext, ext, ext, ext, ext, int], 0, 1.3, 1.4);
  add(B(2.5, 0.08, 2.5), M.dark, 0, 2.64, 0.2);
  add(B(2.4, 0.05, 2.4), M.floor, 0, 0.0, 0.2);
  add(B(3.0, 0.08, 1.3), M.metal, 0, 2.72, -1.55, scene, { cast: true });
  // window frame + sill + glass
  add(B(1.7, 0.05, 0.6), M.metal, 0, 0.95, -1.0);
  [[-0.81, 1.45], [0.81, 1.45]].forEach(([x, y]) => add(B(0.03, 1.0, 0.14), M.dark, x, y, -1.0));
  add(B(1.66, 0.04, 0.14), M.dark, 0, 1.96, -1.0);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.92), basic(0x9fb4c4, { transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.set(0, 1.49, -1.0); scene.add(glass);
  add(B(0.16, 0.1, 0.01), mat(0x2a2a2a), 0.62, 1.1, -0.995); // speaker grill
  world.porch = new THREE.PointLight(0xffd8a8, 2.2, 3.2, 1.6); world.porch.position.set(0, 2.45, -1.75); scene.add(world.porch);
  add(B(0.3, 0.03, 0.1), basic(0xfff0c8), 0, 2.66, -1.75);
  // shutter
  const shutter = new THREE.Group(); shutter.position.set(0, 0, -0.925); scene.add(shutter);
  world.slats = [];
  for (let i = 0; i < 12; i++) {
    const s = add(B(1.62, 0.083, 0.025), M.metal, 0, 1.95 - (i + 0.5) * (1 / 12), 0, shutter);
    s.castShadow = true; world.slats.push(s);
  }
  world.shutter = shutter;
  add(B(1.72, 0.14, 0.14), M.dark, 0, 2.02, -0.9);
  world.shutterProg = 0; world.shutterTarget = 0;
  // side door on the bare LEFT wall (clear of the poster and breaker on the right); the night manager comes in through it
  add(B(0.012, 2.02, 0.72), basic(0x050505), -1.142, 1.01, 0.16);          // dark doorway behind the door
  const bDoor = new THREE.Group(); bDoor.position.set(-1.13, 0, -0.2); scene.add(bDoor);
  add(B(0.035, 2.0, 0.7), M.wood, 0, 1.0, 0.36, bDoor);
  add(B(0.05, 0.04, 0.1), M.metal, 0.03, 1.0, 0.63, bDoor);
  world.bDoor = bDoor; world.bDoorTarget = 0;
  // CCTV housing on the booth corner
  add(B(0.1, 0.09, 0.2), mat(0xd8d8d0), 0.55, 2.58, -1.1, scene, { cast: true });
  add(B(0.015, 0.015, 0.01), basic(0xff2010), 0.58, 2.61, -1.205);

  // desk
  add(B(2.3, 0.05, 0.64), M.wood, 0, 0.78, -0.62);
  add(B(2.3, 0.75, 0.04), M.dark, 0, 0.38, -0.32);
  // ledger
  const ledger = new THREE.Group(); ledger.position.set(-0.5, 0.805, -0.55); ledger.rotation.y = 0.18; scene.add(ledger);
  add(B(0.3, 0.045, 0.22), mat(0x5a1e1a), 0, 0.022, 0, ledger);
  add(B(0.29, 0.035, 0.205), mat(0xe6dcc0), 0.006, 0.022, 0, ledger);
  add(B(0.12, 0.002, 0.05), mat(0xd8b860), 0, 0.046, 0, ledger);
  ledger.userData = { act: 'ledger', label: 'Resident Ledger (L)' };
  // CRT monitor
  const mon = new THREE.Group(); mon.position.set(0.66, 0.805, -0.66); mon.rotation.y = -0.62; scene.add(mon);
  add(B(0.44, 0.36, 0.38), M.beige, 0, 0.19, 0, mon, { cast: true });
  add(B(0.3, 0.26, 0.2), M.beige, 0, 0.17, -0.25, mon);
  world.screenMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: camRT.texture }, uTime: post.uniforms.uTime, uOn: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D t; uniform float uTime, uOn; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ vec2 uv = vUv; vec2 c = uv - .5; uv = .5 + c * (1. + dot(c,c)*0.25);
        vec3 col = pow(texture2D(t, uv).rgb, vec3(1./2.2)); float l = dot(col, vec3(.3,.59,.11)) * 1.5;
        col = vec3(l*.7, l*1.05, l*.75) + (h(uv*200. + uTime) - .5) * .2; col *= .8 + .2*sin(uv.y*240.);
        if (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) col = vec3(0.);
        gl_FragColor = vec4(pow(max(col,0.)*uOn, vec3(2.2)), 1.); }`,
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), world.screenMat);
  scr.position.set(0, 0.2, 0.191); mon.add(scr); setLayer(scr, LAYER.MAIN);
  mon.userData = { act: 'cam', label: 'Security Monitor (C)' };
  // button panel
  const panel = new THREE.Group(); panel.position.set(0.04, 0.805, -0.5); scene.add(panel);
  add(B(0.4, 0.05, 0.14), mat(0x2a2c2e), 0, 0.025, 0, panel);
  const mkBtn = (x, col, act, label) => {
    const b = add(new THREE.CylinderGeometry(0.035, 0.038, 0.03, 8), mat(col, { emissive: col, emissiveIntensity: 0.25 }), x, 0.06, 0, panel);
    b.userData = { act, label }; return b;
  };
  world.btns = [mkBtn(-0.12, 0x2a9a30, 'admit', 'ADMIT — open gate (A)'), mkBtn(0, 0xd8a020, 'shutter', 'SHUTTER (SPACE)'), mkBtn(0.12, 0xc02018, 'deny', 'DENY (D)')];
  // lamp
  const lamp = new THREE.Group(); lamp.position.set(-0.92, 0.805, -0.8); scene.add(lamp);
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 8), M.dark, 0, 0.015, 0, lamp);
  add(B(0.02, 0.36, 0.02), M.dark, 0, 0.2, 0, lamp, { rot: [0.25, 0, 0] });
  add(new THREE.ConeGeometry(0.09, 0.12, 8, 1, true), mat(0x2a4a2a, { side: THREE.DoubleSide }), 0, 0.37, 0.07, lamp, { rot: [0.5, 0, 0] });
  world.lampLight = new THREE.PointLight(0xffb060, 1.6, 3, 2); world.lampLight.position.set(-0.92, 1.1, -0.72); scene.add(world.lampLight);
  // clutter
  add(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 8), mat(0xe8e0d0), 0.38, 0.85, -0.42);
  add(new THREE.CylinderGeometry(0.033, 0.033, 0.005, 8), mat(0x2a1a10), 0.38, 0.893, -0.42);
  const fl = add(new THREE.CylinderGeometry(0.022, 0.028, 0.22, 8), mat(0x202022), -0.18, 0.83, -0.4, scene, { rot: [0, 0, Math.PI / 2] });
  fl.userData = { act: 'flash', label: 'Flashlight (F)' };
  add(B(0.21, 0.003, 0.28), mat(0xe8e2d0), 0.22, 0.806, -0.68, scene, { rot: [0, 0.3, 0] });
  add(B(0.18, 0.003, 0.24), mat(0xd8d0b0), -0.05, 0.806, -0.75, scene, { rot: [0, -0.2, 0] });
  // radio
  const radio = new THREE.Group(); radio.position.set(-0.84, 0.805, -0.47); radio.rotation.y = 0.45; scene.add(radio);
  add(B(0.26, 0.13, 0.09), mat(0x4a3424), 0, 0.065, 0, radio, { cast: true });
  add(B(0.1, 0.09, 0.005), mat(0x1a1612), -0.07, 0.065, 0.046, radio);                       // speaker cloth
  for (let i = 0; i < 5; i++) add(B(0.09, 0.004, 0.003), mat(0x0c0a08), -0.07, 0.03 + i * 0.016, 0.049, radio);
  const lcdC = document.createElement('canvas'); lcdC.width = 128; lcdC.height = 32;
  world.radioLcd = { c: lcdC, t: new THREE.CanvasTexture(lcdC) };
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshBasicMaterial({ map: world.radioLcd.t })); lcd.position.set(0.055, 0.095, 0.046); radio.add(lcd); setLayer(lcd, LAYER.MAIN);
  const knob = add(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 10), mat(0x1a1a1a), 0.03, 0.045, 0.05, radio, { rot: [Math.PI / 2, 0, 0] });
  knob.userData = { act: 'radio', label: 'Radio — on / off (R)' };
  const chBtn = add(B(0.03, 0.016, 0.012), mat(0xb0a080), 0.085, 0.045, 0.05, radio); chBtn.userData = { act: 'channel', label: 'Radio — next channel (N)' };
  world.radioLed = add(B(0.006, 0.006, 0.004), basic(0x201010), 0.11, 0.098, 0.047, radio);
  radio.userData = { act: 'radio', label: 'Radio — on / off (R)' };
  world.radioOn = false; world.radioCh = 0;
  // poster + calendar
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), mat(0xffffff, { map: T.poster }));
  poster.position.set(1.14, 1.55, -0.3); poster.rotation.y = -Math.PI / 2; scene.add(poster);
  // ceiling fluorescent
  world.tube = add(B(0.9, 0.04, 0.08), basic(0xe8fff0), 0, 2.58, 0.1);
  world.tubeLight = new THREE.PointLight(0xd8f0e0, 2.6, 7, 1.6); world.tubeLight.position.set(0, 2.45, 0.1); scene.add(world.tubeLight);
  world.tubeBase = 2.6;
  // ID card on counter
  world.idCard = add(B(0.086, 0.004, 0.055), mat(0xb8c8d8), 0.18, 0.977, -0.84);
  world.idCard.visible = false; world.idCard.userData = { act: 'viewid', label: 'Look at documents (I)' };

  // ---- exterior: gate barrier
  const bar = new THREE.Group(); bar.position.set(2.7, 0, -1.4); scene.add(bar);
  add(B(0.3, 1.0, 0.3), mat(0xc8b030), 0, 0.5, 0, bar, { cast: true });
  const arm = new THREE.Group(); arm.position.set(0, 0.95, 0); bar.add(arm);
  add(B(0.08, 0.08, 4.0), M.stripes, 0, 0, -2.0, arm, { cast: true });
  world.barrierArm = arm; world.barrierUp = 0; world.barrierTarget = 0;
  // streetlamp (the one lighting the window)
  const mkLamp = (x, z, intensity, shadow) => {
    add(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 6), M.pole, x, 2.2, z, scene, { cast: true });
    add(B(0.06, 0.06, 0.7), M.pole, x, 4.35, z + 0.35);
    add(B(0.3, 0.1, 0.18), M.dark, x, 4.3, z + 0.7);
    const bulb = add(B(0.2, 0.02, 0.12), basic(0xffe0a0), x, 4.24, z + 0.7);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.15, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.set(x, 4.2 - 2.075, z + 0.7); scene.add(cone);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.puff, color: 0xffc880, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(x, 4.18, z + 0.7); glow.scale.setScalar(1.6); scene.add(glow);
    const sp = new THREE.SpotLight(0xffd49a, intensity, 14, 0.75, 0.55, 1.6);
    sp.position.set(x, 4.2, z + 0.7); sp.target.position.set(x + (0 - x) * 0.6, 0, z + 1.0); scene.add(sp, sp.target);
    if (shadow) { sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.002; sp.shadow.camera.near = 0.5; sp.shadow.camera.far = 12; }
    return { sp, bulb, cone, glow, base: intensity };
  };
  world.lamp1 = mkLamp(-2.2, -5.75, 75, true);
  world.lamp1.sp.target.position.set(-0.2, 0.8, -1.7); world.lamp1.sp.angle = 0.62; world.lamp1.sp.distance = 16;
  world.lamp1.cone.visible = false;
  world.lamp2 = mkLamp(-13, -5.6, 22, false);
  world.lamp3 = mkLamp(12, -5.6, 18, false);
  // hotel
  const hotel = new THREE.Group(); hotel.position.set(16, 0, -38); scene.add(hotel);
  add(B(26, 13, 8), [M.wallOut, M.wallOut, M.dark, M.dark, mat(0xffffff, { map: T.hotel, emissive: 0xffffff, emissiveMap: T.hotel, emissiveIntensity: 0.55 }), M.wallOut], 0, 6.5, 0, hotel);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: T.sign, fog: false, transparent: true, blending: THREE.AdditiveBlending }));
  sign.position.set(0, 14.6, 4.1); hotel.add(sign); world.sign = sign;
  add(B(4, 3, 1), mat(0x101010), 0, 1.5, 4.2, hotel);
  const door = add(B(2.4, 2.2, 0.1), basic(0xd8a050), 0, 1.1, 4.71, hotel); door.material = basic(0x8a5a2a);
  // fence
  for (let x = 3.2; x < 30; x += 2.5) { add(B(0.08, 1.6, 0.08), M.pole, x, 0.8, -1.3); }
  add(B(27, 0.04, 0.04), M.pole, 16.5, 1.55, -1.3); add(B(27, 0.04, 0.04), M.pole, 16.5, 0.8, -1.3);
  for (let x = -30; x < -3.5; x += 2.5) { add(B(0.08, 1.6, 0.08), M.pole, x, 0.8, -1.3); }
  add(B(26, 0.04, 0.04), M.pole, -17, 1.55, -1.3); add(B(26, 0.04, 0.04), M.pole, -17, 0.8, -1.3);
  // trees
  const tree = (x, z, s) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    add(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 5), M.bark, 0, 0.7, 0, g, { cast: true });
    for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(1.3 - i * 0.3, 1.8, 6), i % 2 ? M.pine : M.pine2, 0, 1.6 + i * 1.0, 0, g, { cast: true });
  };
  for (let i = 0; i < 140; i++) {
    const x = rand(-45, 45), z = rand(-45, 6);
    if (z > -7 && z < 4) continue;
    if (x > 0 && x < 32 && z < -30) continue;
    tree(x, z, rand(0.9, 2.2));
  }
  for (let i = 0; i < 20; i++) tree(rand(-30, -4), rand(-12, -7.5), rand(1, 1.8));
  // rain
  const N = 1400, pos = new Float32Array(N * 6);
  world.rain = { N, pos, spd: new Float32Array(N) };
  for (let i = 0; i < N; i++) { let x = rand(-10, 10), y = rand(0, 7), z = rand(-14, -1.12); if (z > -2.25 && Math.abs(x) < 1.6) z -= 1.1; if (z > -1.4 && Math.abs(x) < 3.5) z = rand(-6, -2.3); pos.set([x, y, z, x + 0.01, y + 0.22, z], i * 6); world.rain.spd[i] = rand(7, 10); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  world.rain.mesh = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8090a8, transparent: true, opacity: 0.25 }));
  world.rain.mesh.frustumCulled = false; scene.add(world.rain.mesh);

  // lights
  world.hemi = new THREE.HemisphereLight(0x27354a, 0x0a0806, 0.55); scene.add(world.hemi);
  world.ir = new THREE.PointLight(0xffffff, 0, 9, 1.2); scene.add(world.ir);
  const moon = new THREE.DirectionalLight(0x6a7aa0, 0.35); moon.position.set(6, 14, -25); scene.add(moon); world.moon = moon;
  world.monGlow = new THREE.PointLight(0x70ffa0, 0.6, 1.4, 2); world.monGlow.position.set(0.55, 1.05, -0.5); scene.add(world.monGlow);
  world.porchGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.puff, color: 0xffe0b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  world.porchGlow.position.set(0, 2.62, -1.75); world.porchGlow.scale.setScalar(0.9); scene.add(world.porchGlow);
  // rain running down the outside of the glass
  const dc = document.createElement('canvas'); dc.width = 128; dc.height = 256; const dg = dc.getContext('2d');
  for (let i = 0; i < 70; i++) { const x = Math.random() * 128, y = Math.random() * 256, r = 1 + Math.random() * 2.5; dg.fillStyle = `rgba(200,215,230,${0.25 + Math.random() * 0.35})`; dg.beginPath(); dg.ellipse(x, y, r, r * 1.3, 0, 0, 7); dg.fill(); if (Math.random() < 0.4) dg.fillRect(x - 0.5, y, 1, 10 + Math.random() * 30); }
  const dt2 = new THREE.CanvasTexture(dc); dt2.wrapS = dt2.wrapT = THREE.RepeatWrapping; dt2.magFilter = THREE.NearestFilter; dt2.repeat.set(2, 2);
  world.drops = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.92), new THREE.MeshBasicMaterial({ map: dt2, transparent: true, opacity: 0.55, depthWrite: false }));
  world.drops.position.set(0, 1.49, -1.006); world.drops.rotation.y = Math.PI; scene.add(world.drops);
  // breaker box on the right wall
  const brk = new THREE.Group(); brk.position.set(1.13, 1.45, 0.55); brk.rotation.y = -Math.PI / 2; scene.add(brk);
  add(B(0.26, 0.36, 0.06), mat(0x4a4e48), 0, 0, 0, brk);
  add(B(0.2, 0.04, 0.01), basic(0xd8b020), 0, 0.14, 0.031, brk);
  world.breakerLever = add(B(0.05, 0.12, 0.05), mat(0x8a1a16), 0, 0, 0.05, brk);
  brk.userData = { act: 'breaker', label: 'Breaker box (G)' };
  world.power = true; world.breakerT = 0;
  // flashlight
  world.flash = new THREE.SpotLight(0xfff2da, 0, 12, 0.32, 0.45, 1.4);
  world.flash.position.set(0.15, -0.15, 0); cam.add(world.flash); cam.add(world.flash.target); world.flash.target.position.set(0, 0, -1);
  // watcher in the woods (camera only)
  world.watcher = buildCharacter(randomParams('m'), { trueForm: true, blackEyes: true, longNeck: true });
  world.watcher.root.position.set(-17, 0, -8.5); world.watcher.root.rotation.y = 0.3;
  setLayer(world.watcher.root, LAYER.TRUE); world.watcher.root.visible = false; scene.add(world.watcher.root);
  // jumpscare face
  world.scare = buildScareFace(); world.scare.visible = false; cam.add(world.scare);
  // breath puffs
  world.puffs = [];
  const pm = new THREE.SpriteMaterial({ map: T.puff, transparent: true, depthWrite: false, opacity: 0 });
  for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(pm.clone()); s.visible = false; scene.add(s); world.puffs.push({ s, life: 0 }); }
}

// ------------------------------------------------------------------ game state
let G = null;           // run state
let night = null;       // night state
let V = null;           // current visitor
let mode = 'menu';      // menu | brief | play | report | over | paused
let camMode = false, ledgerOpen = false, docsOpen = false, talkOpen = false, flashOn = false, zoom = false;
let sens = 1, radioVol = 1;
const look = { yaw: 0, pitch: -0.05, ty: 0, tp: -0.05 };
let shake = 0, flashFx = 0, fadeFx = 1, fadeTarget = 0;
let scareT = -1;

const SAVE_KEY = 'nightdesk_saves', HIST_KEY = 'nightdesk_history';
function readSaves() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const old = localStorage.getItem('nightdesk_save');                       // migrate the old single slot
    if (old) { const g = JSON.parse(old); g.saveId = g.saveId || 's' + Date.now(); s[g.saveId] = { G: g, updated: Date.now() }; localStorage.removeItem('nightdesk_save'); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }
    return s;
  } catch (e) { return {}; }
}
function writeSaves(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
function saveRun() { if (!G) return; G.saveId = G.saveId || 's' + Date.now(); const s = readSaves(); s[G.saveId] = { G, updated: Date.now() }; writeSaves(s); }
function loadRun(id) { const s = readSaves(); if (id) return s[id] ? s[id].G : null; const l = Object.values(s).sort((a, b) => b.updated - a.updated); return l.length ? l[0].G : null; }
function deleteSave(id) { const s = readSaves(); delete s[id]; writeSaves(s); }
function readHistory() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { return []; } }
function addHistory(result) {
  try { const h = readHistory(); h.unshift({ result, night: G.night, pay: G.pay, lost: G.residents.filter(r => !r.alive).length, date: Date.now() }); localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 40))); } catch (e) {}
}
const fmtDate = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
function showSaves() {
  showScreen('saves');
  const saves = Object.entries(readSaves()).sort((a, b) => b[1].updated - a[1].updated);
  $('saveList').innerHTML = saves.length ? saves.map(([id, sv]) => `<div class="saveRow"><div><b>Night ${sv.G.night} of ${MAX_NIGHT}</b> · lost ${sv.G.cas}/3 · warnings ${sv.G.vio}/3 · $${sv.G.pay}<small>last played ${fmtDate(sv.updated)}</small></div>
    <span><button data-load="${id}">Load</button><button data-del="${id}">Delete</button></span></div>`).join('') : '<p class="dim">No saved shifts.</p>';
  const hist = readHistory();
  $('histList').innerHTML = hist.length ? hist.map(h => `<div class="saveRow"><div><b>${({ survived: 'Survived', taken: 'Taken at the window', silent: 'Hotel went silent', fired: 'Fired' })[h.result] || h.result}</b> on night ${h.night} · $${h.pay} · ${h.lost} missing<small>${fmtDate(h.date)}</small></div></div>`).join('') : '<p class="dim">No finished shifts yet.</p>';
  $('saveList').querySelectorAll('[data-load]').forEach(b => b.onclick = () => { audio.init(); const g = loadRun(b.dataset.load); if (g) { G = g; startBriefing(); } });
  $('saveList').querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (b.dataset.armed) { deleteSave(b.dataset.del); showSaves(); return; }
    b.dataset.armed = 1; b.textContent = 'Really delete?'; b.classList.add('danger');
  });
}

function ensureManager() {
  if (G.mgr) return G.mgr;
  const p = randomParams('m', nameRng(MANAGER.name));
  Object.assign(p, { child: false, elder: false, outfit: 'suit', coat: false, skirt: false, legwear: 'pants', hat: null, backpack: false, bag: false, headphones: false, earmuffs: false, sunglasses: false, apron: false, scarf: false, height: 1.03, hairStyle: 'sidepart', hairColor: 0x3a2416, glasses: true, beard: false, stubble: true });
  const nights = shuffle([3, 4, 5, 6, 7, 8, 9, 10, 11]).slice(0, 4).sort((a, b) => a - b);
  return (G.mgr = { ...MANAGER, p, schedule: nights });
}
function newRun() {
  const rooms = shuffle([101, 102, 103, 104, 105, 106, 107, 108, 201, 202, 203, 204, 205, 206, 207, 208, 301, 302, 303, 304, 305, 306]);
  const fN = shuffle([...NAMES.f]), mN = shuffle([...NAMES.m]);
  const residents = [];
  const NOTES = ['Works nights at the mill', 'Has a grey cat', 'Long-term guest', 'Quiet. Keeps to self', 'Owes 2 weeks rent', 'Nurse at County General', 'Retired teacher', 'Drives a blue sedan', 'Student', 'Allergic to dogs', 'Lives with mother', 'Plays piano late', 'Widower. Walks at night', 'Truck driver, odd hours'];
  for (let i = 0; i < 16; i++) {
    const g = i % 2 ? 'm' : 'f';
    const name = (g === 'f' ? fN : mN).pop();
    const p = personParams(name, g);
    residents.push({
      name, g, room: rooms[i], idnum: `HP-${String(1000 + Math.floor(Math.random() * 8999))}-${String.fromCharCode(65 + Math.random() * 26 | 0)}${String.fromCharCode(65 + Math.random() * 26 | 0)}`,
      dob: dobStr(p.child ? 1986 + (Math.random() * 4 | 0) : p.elder ? 1922 + (Math.random() * 12 | 0) : 1940 + (Math.random() * 40 | 0)),
      exp: `${String(1 + Math.random() * 12 | 0).padStart(2, '0')}/0${1 + (Math.random() * 3 | 0)}`, issued: issuedStr(),
      p, note: p.elder ? pick(['Retired. Early riser', 'Hard of hearing', 'Widower. Walks at night']) : pick(NOTES), status: 'OUT', alive: true,
    });
  }
  const spare = { f: fN, m: mN };
  G = { night: 1, cas: 0, vio: 0, residents, spare, pay: 0, seen: [], recent: [], saveId: 's' + Date.now() };
  ensureManager();
}

// voice slots: every name always gets the same ElevenLabs voice
const AVAIL = {};
for (const k of (window.VOICE_EL || [])) {
  const m = k.match(/^([a-z]+)_(\d+)_([a-z0-9]+)$/);
  if (m) ((AVAIL[m[3]] ||= {})[m[1]] ||= []).push(+m[2]);
}
const HAS = new Set(window.VOICE_EL || []);
function slotFor(name, g) {
  if (window.NAME_SLOTS && window.NAME_SLOTS[name]) return window.NAME_SLOTS[name];
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return g === 'm' ? ['m', 'm2', 'm3', 'mo'][h % 4] : ['f', 'f2', 'f3'][h % 3];
}
function nameRng(name) { let h = 2166136261; for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
function personParams(name, g, base) {
  const p = base || randomParams(g, nameRng(name));
  if (slotFor(name, g) === 'mo') { p.elder = true; p.child = false; p.hairColor = pick([0x9a9a9a, 0xc8c8c0, 0xd8d8d0]); p.height = 0.95; p.skirt = false; if (p.hairStyle === 'spiky') p.hairStyle = 'short'; }
  if (slotFor(name, g) === 'm3' || slotFor(name, g) === 'f3') p.child = p.child && Math.random() < 0.5;
  if (!p.coatColor) p.coatColor = pick([0x2a2a30, 0x3a2e24, 0x22262e]);
  return p;
}
const MONSTER_CATS = /^m(greet|where|strange|shutter|turn|admit|deny)$/;
function randLine(cat, g) { const idx = (AVAIL[g] && AVAIL[g][cat]) || [0]; return `${cat}_${pick(idx)}_${g}`; }
function lineSet(g, slot = g) {
  const o = {};
  const cats = new Set([...Object.keys(AVAIL[g] || {}), ...Object.keys(COUNT)]);
  for (const k of cats) {
    const s = !MONSTER_CATS.test(k) && AVAIL[slot] && AVAIL[slot][k] ? slot : g;
    const idx = (AVAIL[s] && AVAIL[s][k]) || [...Array(COUNT[k] || 1).keys()];
    o[k] = `${k}_${pick(idx)}_${s}`;
  }
  return o;
}
function nameKey(name, slot) { const k = `name_${slug(name)}_${slot}`; return HAS.has(k) ? k : `name_${slug(name)}`; }

// ------------------------------------------------------------------ visitor generation
function mutateName(n) {
  const opts = [
    s => s.replace(/([aeiou])/, '$1$1'),
    s => s.replace(/([a-z])\1/, '$1'),
    s => s.replace(/a/, 'e'),
    s => s.replace(/e/, 'a'),
    s => s.replace(/i/, 'y'),
    s => s.replace(/n /, 'nn '),
    s => s.slice(0, -1),
  ];
  for (const f of shuffle(opts)) { const r = f(n); if (r !== n && r.length > 3) return r; }
  return n + 'e';
}
function mutateId(id) {
  const digits = id.split('');
  const pos = digits.map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
  const idx = pick(pos);
  digits[idx] = String((+digits[idx] + 1 + Math.floor(Math.random() * 8)) % 10);
  return digits.join('');
}

const STAFF_ROLES = [
  { role: 'Maintenance', shirt: 0x9a4a1a, hat: 'cap' },
  { role: 'Night Nurse', shirt: 0x8fb0c0, hat: null },
  { role: 'Security Relief', shirt: 0x1e2a44, hat: 'cap' },
  { role: 'Housekeeping', shirt: 0x5a6a5a, hat: null },
];
const BULLETIN_COLORS = [['RED', 0x8a1a16], ['YELLOW', 0xa8902a], ['GREEN', 0x2a6a32], ['WHITE', 0xc8c8c0]];

function makeVisitor(spec) {
  const v = { ...spec, human: !spec.monster, mt: spec.monster ? MTYPES[spec.monster] : null, asked: {}, idShown: false, state: 'walkin', t: 0 };
  let p, an = {};
  if (v.mt && v.mt.rare) {
    v.g = 'f'; v.name = 'Makima'; v.slot = 'f'; v.shouldAdmit = false; v.kind = 'stranger';
    p = { rare: true, gender: 'f' };
    v.id = { type: 'lic', name: 'Makima', idnum: 'PS-000001', dob: '??/??/??', exp: '--/--', photo: p };
    v.p = p; v.an = {}; v.wrong = 'was something very old wearing a very calm face';
  } else if (v.mt && v.mt.gaunt) {
    v.gaunt = true; v.g = Math.random() < 0.5 ? 'm' : 'f'; v.name = '???';
    v.id = null; v.shouldAdmit = false; v.slot = v.g;
  } else {
    if (v.kind === 'manager') {
      const M_ = ensureManager(); v.g = 'm'; v.name = M_.name;
      p = JSON.parse(JSON.stringify(M_.p));
      const card = spec.monster ? Math.random() < 0.5 : Math.random() < 0.65;   // the real one usually carries his badge; fakes sometimes do too
      v.id = card ? { type: 'staff', name: M_.name, role: M_.role.toUpperCase(), code: M_.code, photo: M_.p, exp: '12/01', uv: true } : null;
      if (spec.monster) v.wrong = `came to the gate on ${tonight()}, a night the manager was not on the rota`;
    } else if (v.kind === 'resident' || v.kind === 'checkout') {
      const r = v.resident; v.g = r.g; v.name = r.name;
      p = JSON.parse(JSON.stringify(r.p));
      r.issued ||= issuedStr();   // (older saves)
      v.id = { type: 'res', name: r.name, room: r.room, idnum: r.idnum, dob: r.dob, exp: r.exp, photo: r.p, uv: true, issued: r.issued, stamp: true, sig: true, org: HOTEL_ORG };
    } else {
      v.g = spec.g || (Math.random() < 0.5 ? 'm' : 'f');
      v.name = spec.name; p = personParams(v.name, v.g, spec.p ? JSON.parse(JSON.stringify(spec.p)) : null);
      v.id = { type: 'lic', name: v.name, idnum: `D${String(100000 + Math.random() * 899999 | 0)}`, dob: dobStr(p.elder ? 1922 + (Math.random() * 12 | 0) : p.child ? 1986 + (Math.random() * 4 | 0) : 1945 + (Math.random() * 35 | 0)), exp: `0${1 + Math.random() * 9 | 0}/0${2 + Math.random() * 3 | 0}`, photo: p };
      if (v.kind === 'guest' || v.kind === 'fakeguest') v.slip = { name: v.name, code: v.arrival.code, nights: v.arrival.nights };
      if (v.kind === 'fakeguest') { if (Math.random() < 0.5) v.slip.code = mutateId(v.arrival.code); else { v.slip.name = mutateName(v.name); v.id.name = v.slip.name; } }
      if (v.kind === 'staff' || v.kind === 'fakestaff') {
        const s = v.staff; p.shirt = s.shirt; p.hat = s.hat; p.hatColor = s.shirt; p.coat = false; p.skirt = false; p.outfit = 'tee'; p.backpack = false;
        v.id = { type: 'staff', name: v.name, role: s.role, code: s.code, photo: p, exp: `12/0${2 + (Math.random() * 2 | 0)}`, uv: true };
        if (v.kind === 'fakestaff') { if (Math.random() < 0.6) v.id.code = mutateId(s.code); else v.id.role = pick(STAFF_ROLES.filter(r => r.role !== s.role)).role; }
      }
      if (v.kind === 'delivery') { p.shirt = 0x9a1e1a; p.hat = 'cap'; p.hatColor = 0x9a1e1a; p.pants = 0x22252b; p.coat = false; p.outfit = 'tee'; p.backpack = false; v.prop = 'box'; }
    }
    if (spec.bulletin) { p.coat = true; p.coatColor = spec.bulletin[1]; }
    if (v.mt) {
      if (v.mt.an) an = { ...v.mt.an };
      if (spec.monster === 'stretched') an = Math.random() < 0.5 ? { longNeck: true } : { longArms: true };
      if (spec.monster === 'seer') p.hat = null;
      if (spec.monster === 'lookalike') {
        const k = pick(['hair', 'glasses', 'eye', 'beard', 'hairStyle']);
        if (k === 'hair') p.hairColor = pick(HAIRS.filter(h => h !== p.hairColor));
        else if (k === 'glasses') p.glasses = !p.glasses;
        else if (k === 'eye') p.eye = pick(EYES.filter(e => e !== p.eye));
        else if (k === 'beard' && p.gender === 'm' && !p.child) p.beard = !p.beard;
        else p.hairStyle = pick(['short', 'long', 'bob', 'bald', 'pony', 'spiky'].filter(h => h !== p.hairStyle));
        v.wrong = `looked different from the ledger photo (${k === 'hairStyle' ? 'hair style' : k})`;
      }
      if (spec.monster === 'copy' && v.kind === 'checkout') v.wrong = `tried to check out as ${v.resident.name}, who was never inside`;
      if (spec.monster === 'copy' && v.kind === 'resident') {
        const r = v.resident;
        const k = r.status === 'CHECKED OUT' ? 'gone' : r.status === 'IN' ? 'inside' : pick(['idnum', 'room', 'name', 'exp', 'uv', 'uv', 'age', 'stamp', 'sig', 'issued', 'org']);
        if (k === 'idnum') v.id.idnum = mutateId(r.idnum);
        if (k === 'room') v.id.room = r.room + pick([1, -1, 100, -100]);
        if (k === 'name') v.id.name = mutateName(r.name);
        if (k === 'exp') v.id.exp = `${String(1 + Math.random() * 12 | 0).padStart(2, '0')}/9${4 + (Math.random() * 5 | 0)}`;
        if (k === 'uv') v.id.uv = false;
        if (k === 'age') v.id.dob = impossibleDob();
        if (k === 'stamp') v.id.stamp = false;
        if (k === 'sig') v.id.sig = false;
        if (k === 'issued') v.id.issued = futureIssued();
        if (k === 'org') v.id.org = pick(MISPRINTS);
        v.wrong = { inside: `claimed to be ${r.name}, who was already INSIDE`, idnum: 'had the wrong ID number', room: 'had the wrong room number', name: 'had a misspelled name on the ID', exp: 'carried an expired ID', uv: 'carried a card with no UV seal', gone: `claimed to be ${r.name}, who had already checked out`, age: 'had a date of birth no living person could have', stamp: 'carried a card with no VALIDATED stamp', sig: 'carried an unsigned card', issued: 'carried a card issued in the future', org: 'carried a card with the hotel name misprinted' }[k];
      }
      // any disguised monster may also carry a bad ID (more often on later nights)
      if (v.kind === 'resident' && spec.monster !== 'copy' && spec.monster !== 'lookalike' && v.id && Math.random() < 0.22 + 0.03 * Math.min(8, night ? night.n : 1)) {
        const r = v.resident, k = pick(['idnum', 'room', 'name', 'exp', 'uv', 'photo', 'age', 'stamp', 'sig', 'issued', 'org']);
        if (k === 'idnum') v.id.idnum = mutateId(r.idnum);
        if (k === 'room') v.id.room = r.room + pick([1, -1, 100, -100]);
        if (k === 'name') v.id.name = mutateName(r.name);
        if (k === 'exp') v.id.exp = `${String(1 + Math.random() * 12 | 0).padStart(2, '0')}/9${4 + (Math.random() * 5 | 0)}`;
        if (k === 'uv') v.id.uv = false;
        if (k === 'age') v.id.dob = impossibleDob();
        if (k === 'stamp') v.id.stamp = false;
        if (k === 'sig') v.id.sig = false;
        if (k === 'issued') v.id.issued = futureIssued();
        if (k === 'org') v.id.org = pick(MISPRINTS);
        if (k === 'photo') { const ph = JSON.parse(JSON.stringify(r.p)); ph.hairColor = pick(HAIRS.filter(h => h !== ph.hairColor)); ph.glasses = !ph.glasses; v.id.photo = ph; }
        v.idWrong = { idnum: 'a wrong ID number', room: 'the wrong room number', name: 'a misspelled name', exp: 'an expired card', uv: 'no UV seal', photo: 'a photo that was not its face', age: 'an impossible date of birth', stamp: 'no VALIDATED stamp', sig: 'no signature', issued: 'an issue date in the future', org: 'the hotel name misprinted' }[k];
      }
      if (spec.monster === 'ancient' && v.id) { v.id.dob = impossibleDob(); const y = +v.id.dob.slice(-4); v.wrong = y > GAME_YEAR ? `carried a card saying it would be born in ${y}` : `carried a card saying it was ${GAME_YEAR - y} years old`; }
      if (spec.monster === 'echo') v.wrong = 'spoke without moving its lips';
      if (spec.monster === 'backwards') v.wrong = 'had its feet on backwards';
      if (spec.monster === 'puppet') v.wrong = 'was hanging from strings only the camera could see';
    }
    v.p = p; v.an = an;
    v.slot = v.kind === 'manager' ? 'm' : slotFor(v.name, v.g);
    if (v.human) v.shouldAdmit = (v.kind === 'resident' && v.resident.status === 'OUT') || v.kind === 'guest' || v.kind === 'staff' || v.kind === 'checkout' || v.kind === 'manager';
    else v.shouldAdmit = false;
  }
  if (v.idWrong) v.wrong = (v.wrong ? v.wrong + ', and its card had ' : 'had ') + v.idWrong;
  if (spec.bulletin) v.wrong = (v.wrong ? v.wrong + ', and ' : '') + `matched the radio bulletin (${spec.bulletin[0].toLowerCase()} coat)`;
  v.lines = lineSet(v.g, v.slot);
  const baseSlot = v.slot === v.g;
  const vr = nameRng(v.name + '#voice')();
  v.rate = p && p.child ? 1.22 : baseSlot ? (v.g === 'f' ? 0.94 + vr * 0.16 : 0.86 + vr * 0.18) : 0.93 + vr * 0.12;   // every name sounds a bit different
  v.distort = v.mt ? v.mt.distort : 0;
  v.odd = v.mt ? Math.random() < (v.mt.odd || 0) : false;
  v.patience = v.mt ? rand(...v.mt.patience) * (1 - 0.03 * Math.max(0, (night ? night.n : 1) - 5)) : Infinity;
  if (v.an && v.mt) { const n_ = night ? night.n : 1; v.an.k = n_ <= 5 ? 1 : Math.max(0.45, 1 - (n_ - 5) * 0.09); v.distort *= v.an.k; v.odd = v.odd && Math.random() < v.an.k; }
  if (v.an && v.an.wrongVoice) { const og = v.g === 'm' ? 'f' : 'm'; v.voiceG = og; v.lines = lineSet(og, og); }
  v.temp = v.human ? 1 : (v.mt.temp ?? 0.2);
  if (v.an && !v.human) v.an.monster = true;
  if (v.an && v.p && v.p.body2 && (v.an.wideMouth || v.an.smile || v.an.noLips || v.an.mannequin)) { v.p = { ...v.p, body2: false }; }   // mouth tells need the painted-mouth body
  const model = v.mt && v.mt.model;
  v.model = v.mt && v.mt.rare ? (buildRare() || buildCharacter(randomParams('f'), {})) : model === 'crawler' ? buildCrawler(randomParams(v.g)) : model === 'weeper' ? (buildWeeper() || buildGaunt()) : model === 'hound' ? (buildHound() || buildCrawler(randomParams(v.g))) : v.gaunt ? buildGaunt() : buildCharacter(v.p, v.an);
  if (v.prop === 'box') {
    const bx = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), mat(0xc8a060));
    bx.position.set(0, 1.0, 0.25); bx.castShadow = true; v.model.root.add(bx);
    bx.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.002, 0.12), mat(0xe8e0d0))).position.set(0, 0.031, 0);
    v.model.parts.armL.rotation.x = -0.9; v.model.parts.armR.rotation.x = -0.9; v.holdsBox = true;
  }
  v.breathT = rand(1, 3);
  return v;
}

function planNight(n) {
  const R = G.residents.filter(r => r.alive && r.status !== 'CHECKED OUT');
  R.forEach(r => r.status = Math.random() < 0.35 ? 'IN' : 'OUT');
  const recent = new Set(G.recent || []);
  const fresh_ = arr => shuffle(arr.filter(r => !recent.has(r.name))).concat(shuffle(arr.filter(r => recent.has(r.name))));   // people seen last night go last
  const taken = new Set();
  const take = arr => { const r = fresh_(arr).find(r => !taken.has(r)); if (r) taken.add(r); return r; };
  const gone = G.residents.filter(r => r.alive && r.status === 'CHECKED OUT');
  const count = [0, 7, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15][Math.min(n, 11)];
  const nMon = Math.round(count * [0, 0.38, 0.42, 0.45, 0.5, 0.52, 0.54, 0.56, 0.58, 0.6, 0.62, 0.65][Math.min(n, 11)]);
  const avail = Object.keys(MTYPES).filter(k => MTYPES[k].night <= n && !MTYPES[k].special);
  const OBV = k => !!MTYPES[k].gaunt;
  const takeName = g => G.spare[g].length ? G.spare[g].pop() : pick(NAMES[g]);
  const arrivals = [];
  for (let i = 0; i < 2; i++) {
    const g = Math.random() < 0.5 ? 'f' : 'm', name = takeName(g);
    arrivals.push({ name, g, code: `BK-${10000 + Math.random() * 89999 | 0}`, nights: 1 + (Math.random() * 4 | 0), p: personParams(name, g) });
  }
  const staff = [];
  if (n >= 2) for (const s of shuffle([...STAFF_ROLES]).slice(0, 2)) {
    const g = Math.random() < 0.5 ? 'f' : 'm', name = takeName(g);
    staff.push({ ...s, name, g, code: `ST-${100 + Math.random() * 899 | 0}${String.fromCharCode(65 + Math.random() * 26 | 0)}`, p: personParams(name, g) });
  }
  const specs = [];
  // monsters (at most one obvious one per night, two on the final night)
  for (let i = 0; i < nMon; i++) {
    const fresh = avail.filter(k => MTYPES[k].night === n);
    let type = (fresh.length && Math.random() < 0.5) ? pick(fresh) : pick(avail);
    const obvCount = specs.filter(s => OBV(s.monster)).length;
    if (OBV(type) && obvCount >= (n === 5 ? 2 : 1)) type = pick(avail.filter(k => !OBV(k)));
    let target;
    if (type === 'copy' && gone.length && Math.random() < 0.45) target = pick(gone);          // "they did not come back"
    else if (type === 'copy' && Math.random() < 0.4) target = take(R.filter(r => r.status === 'IN'));
    else target = take(R.filter(r => r.status === 'OUT'));
    target = target || take(R) || pick(R);
    specs.push({ kind: 'resident', monster: type, resident: target });
  }
  // radio bulletin: one disguised monster is described on the radio
  let bulletin = null;
  const disguised = specs.filter(s => !OBV(s.monster));
  if (n >= 2 && disguised.length && Math.random() < 0.65) {
    const s = pick(disguised); s.bulletin = pick(BULLETIN_COLORS); bulletin = s.bulletin;
  }
  // humans
  const outs = fresh_(R.filter(r => r.status === 'OUT' && !taken.has(r))).reverse();
  const nHum = count - nMon;
  let guestsPlaced = 0, staffPlaced = 0;
  for (let i = 0; i < nHum; i++) {
    const opts = [['resident', outs.length ? 5 : 0], ['guest', guestsPlaced < arrivals.length ? 1.2 : 0], ['stranger', n >= 2 ? 0.6 : 0.25],
      ['fakeguest', n >= 3 && guestsPlaced < arrivals.length ? 0.5 : 0], ['staff', staffPlaced < staff.length ? 1.1 : 0],
      ['fakestaff', n >= 3 && staffPlaced < staff.length ? 0.45 : 0], ['delivery', 0.55]];
    let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), kind = 'stranger';
    for (const [k, w] of opts) { if ((r -= w) <= 0 && w > 0) { kind = k; break; } }
    if (i === nHum - 1 && guestsPlaced === 0) kind = 'guest';
    if (kind === 'resident') specs.push({ kind, resident: outs.pop() });
    else if (kind === 'guest' || kind === 'fakeguest') { const a = arrivals[guestsPlaced++]; specs.push({ kind, name: a.name, g: a.g, p: a.p, arrival: a }); }
    else if (kind === 'staff' || kind === 'fakestaff') { const s = staff[staffPlaced++]; specs.push({ kind, name: s.name, g: s.g, p: s.p, staff: s }); }
    else { const g = Math.random() < 0.5 ? 'f' : 'm'; specs.push({ kind, name: takeName(g), g }); }
  }
  shuffle(specs);
  if (n === 1) { // tutorial: start with a real resident
    const i = specs.findIndex(s => s.kind === 'resident' && !s.monster);
    if (i > 0) [specs[0], specs[i]] = [specs[i], specs[0]];
  }
  // phone call: a resident calls down from their room; later "they" show up at the window
  let phone = null;
  const used = new Set(specs.filter(s => s.resident).map(s => s.resident));
  const callable = R.filter(r => r.status === 'OUT' && !used.has(r));
  if (n >= 2 && callable.length && Math.random() < 0.75) {
    const r = pick(callable), at = 1 + Math.floor(Math.random() * Math.max(1, specs.length - 4));
    phone = { at, resident: r, done: false };
    specs.splice(at + 1 + Math.floor(Math.random() * (specs.length - at - 1)), 0, { kind: 'resident', monster: 'copy', resident: r });
  }
  // check-outs: residents leaving the hotel come to the window from the inside
  if (n >= 3) {
    const inside = fresh_(R.filter(r => r.status === 'IN' && !used.has(r) && !taken.has(r)));
    const k = Math.random() < 0.6 ? (n >= 7 ? 2 : 1) : 0;
    for (let i = 0; i < k && inside.length; i++) {
      const r = inside.shift(); taken.add(r);
      specs.splice(1 + Math.floor(Math.random() * (specs.length - 1)), 0, { kind: 'checkout', resident: r });
    }
    // a fake check-out: something wearing a resident who was never inside
    const outsNow = R.filter(r => r.status === 'OUT' && !taken.has(r));
    if (n >= 5 && outsNow.length && Math.random() < 0.35) specs.splice(1 + Math.floor(Math.random() * (specs.length - 1)), 0, { kind: 'checkout', monster: 'copy', resident: pick(outsNow) });
  }
  // the night manager: real on his rota nights, an Impostor wearing him on the others
  if (n >= 3) {
    const M_ = ensureManager(), onDuty = M_.schedule.includes(n);
    if (onDuty ? Math.random() < 0.85 : Math.random() < 0.4)
      specs.splice(1 + Math.floor(Math.random() * (specs.length - 1)), 0, onDuty ? { kind: 'manager' } : { kind: 'manager', monster: 'impostor' });
  }
  if (DEVQ.get('devmgr')) { const M_ = ensureManager(); const real = DEVQ.get('devmgr') === 'real'; if (real && !M_.schedule.includes(n)) M_.schedule = [...M_.schedule.slice(1), n].sort((x, y) => x - y); if (!real) M_.schedule = M_.schedule.filter(x => x !== n); specs.splice(0, specs.findIndex(s_ => s_.kind === 'manager') >= 0 ? 0 : 0, real ? { kind: 'manager' } : { kind: 'manager', monster: 'impostor' }); specs.forEach((s_, i) => { if (i > 0 && s_.kind === 'manager') specs.splice(i, 1); }); }
  // very rare visitor (at most once per run)
  if (!G.seenRare && n >= 2 && Math.random() < 0.07) { G.seenRare = true; specs.splice(1 + Math.floor(Math.random() * (specs.length - 1)), 0, { kind: 'stranger', monster: 'controller' }); }
  const power = n >= 3 ? { at: 2 + Math.floor(Math.random() * (specs.length - 3)), done: false } : null;
  const notices = [];
  if (bulletin) notices.push(`RADIO — County sheriff: "Someone in a ${bulletin[0]} coat was seen walking the old road tonight. They are not who they say they are. Do not let them in."`);
  return { n, specs, arrivals, staff, phone, power, bulletin, notices, idx: 0, log: [], wait: 3, clockFrac: 0, eventT: rand(14, 24), lightningT: rand(25, 60) };
}

// ------------------------------------------------------------------ visitor control
const PATH_IN = [[-24, -3.4], [-2.4, -3.4], [0, -1.58]];
const PATH_ADMIT = [[0.6, -2.0], [1.6, -2.9], [3.6, -3.4], [24, -3.4]];
const PATH_DENY = [[-0.6, -2.0], [-2.4, -3.4], [-26, -3.4]];
const PATH_FROM_INSIDE = [[24, -3.4], [3.6, -3.4], [1.6, -2.9], [0.6, -2.0], [0, -1.58]];
const STAND = { gaunt: -2.35, crawler: -2.1, weeper: -1.62, hound: -2.3 };
const SPEED = { gaunt: 1.6, crawler: 2.6, weeper: 0.75, hound: 2.3 };

function phoneCall() {
  const r = night.phone.resident;
  night.phone.done = true;
  for (let i = 0; i < 3; i++) setTimeout(() => { audio.tone(480, 0.35, { type: 'square', gain: 0.05 }); audio.tone(620, 0.35, { type: 'square', gain: 0.04, at: 0.02 }); }, i * 900);
  toast('The booth phone is ringing...', 3);
  setTimeout(() => {
    r.status = 'IN';
    say('mgr_phone', { distort: 0, who: 'Manager (phone)', v: null });
    night.notices.push(`PHONE ${clockText(night.clockFrac)} — ${r.name} (Room ${r.room}) called from their room. Ledger updated: IN.`);
    setTimeout(() => toast(`Ledger updated: ${r.name}, Room ${r.room} is now IN.`, 6), 2500);
  }, 2800);
}

function powerCut() {
  night.power.done = true; world.power = false; world.breakerT = 0;
  audio.thud(); audio.tone(120, 1.2, { type: 'sawtooth', gain: 0.08, endFreq: 30 });
  if (audio.hum) audio.hum.gain.value = 0;
  toast('POWER CUT! Hit the breaker on the right wall (G).', 6);
  if (!G.heardPower) { G.heardPower = true; setTimeout(() => say('mgr_power', { distort: 0, who: 'Manager (radio)', v: null }), 1200); }
  if (V && !V.human && V.state === 'wait') V.patience = Math.min(V.patience, V.waitT + rand(8, 14));
  updateHUD();
}
function hitBreaker() {
  if (world.power || world.breakerT > 0) return;
  audio.thud(); audio.click(); world.breakerT = 1.6; world.breakerArm = 1;
  setTimeout(() => { world.power = true; world.breakerT = 0; audio.buzz(); if (audio.hum) audio.hum.gain.value = 0.012; flicker(0.8); updateHUD(); toast('Power restored.', 2); }, 1600);
}

function spawnNext() {
  if (night.phone && !night.phone.done && night.idx >= night.phone.at) { phoneCall(); night.wait = 10; return; }
  if (night.idx >= night.specs.length) { endNight(); return; }
  const spec = night.specs[night.idx];
  V = makeVisitor(spec);
  V.path = (V.kind === 'checkout' ? PATH_FROM_INSIDE : PATH_IN).map(p => new THREE.Vector3(p[0], 0, p[1]));
  if (V.kind === 'checkout') toast('Someone is coming from inside the hotel — a check-out.', 4);
  const model = V.mt && V.mt.model;
  if (model) V.path[2].z = STAND[model] ?? -2.3;
  V.winZ = V.path[2].z;
  V.shutterClosed = world.shutterTarget > 0.5;
  V.model.root.position.copy(V.path[0]);
  V.pi = 1; V.speed = model ? SPEED[model] : (V.p && V.p.elder ? rand(1.0, 1.1) : rand(1.15, 1.45));
  scene.add(V.model.root);
  V.stepT = 0;
  updateHUD();
  if (night.n === 1 && night.idx === 0) toast('Someone is coming. Wait for them to reach the window.', 5);
}

function moveAlong(v, dt) {
  const tgt = v.path[v.pi]; if (!tgt) return true;
  const pos = v.model.root.position;
  const d = tgt.clone().sub(pos); d.y = 0;
  const dist = d.length(), step = v.speed * dt;
  const ang = Math.atan2(d.x, d.z);
  let da = ang - v.model.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
  v.model.root.rotation.y += da * Math.min(1, dt * 6);
  if (dist <= step) { pos.copy(tgt); v.pi++; return v.pi >= v.path.length; }
  pos.add(d.multiplyScalar(step / dist));
  v.stepT -= dt;
  if (v.stepT <= 0) { v.stepT = v.gaunt ? 0.62 : 0.45; const dd = pos.distanceTo(cam.position); audio.footstep(clamp(0.5 / (dd * 0.4 + 0.5), 0.02, 0.35)); }
  return false;
}

let talkLevel = 0;
async function say(key, { distort = V ? V.distort : 0, who, onEnd, v = V } = {}) {
  if (!key) return;
  const text = VT[key] || '';
  showSub(text, who ?? (v ? (v.state === 'walkin' ? '' : v.name === '???' ? '???' : 'Visitor') : ''), distort > 0.55);
  if (v) v.talking = true;
  const dur = await audio.playVoice(key, { rate: v ? v.rate : 1, distort, onEnd: () => { if (v) v.talking = false; onEnd && onEnd(); } });
  subTimer = Math.max(2, dur + 0.8);
  return dur;
}

function greet() {
  const v = V;
  if (v.gaunt) { audio.growl(1.8, 0.5); setTimeout(() => v === V && say(`mgreet_3_${v.g}`, { distort: 1 }), 900); return; }
  let key;
  if (v.kind === 'checkout') { key = v.lines.admit; setTimeout(() => toast(`Checking out: ${v.name}. Check the card, then stamp them out (A).`, 5), 1500); }
  else if (v.kind === 'resident' && v.an && v.an.wrongVoice) key = v.lines.greet;
  else if (v.kind === 'resident') key = (v.mt && v.odd && Math.random() < 0.5) ? v.lines.mgreet : nameKey(v.resident.name, v.slot);
  else if (v.kind === 'guest' || v.kind === 'fakeguest') key = v.lines.guest;
  else if (v.kind === 'staff' || v.kind === 'fakestaff') key = v.lines.staff;
  else if (v.kind === 'delivery') key = v.lines.delivery;
  else if (v.kind === 'manager') key = 'mgr_visit';
  else key = v.lines.stranger;
  say(key);
}

function ask(q) {
  if (!V || V.state !== 'wait') return;
  if (q === 'close') { setTalk(false); return; }
  if (q === 'id') { requestID(); return; }
  if (V.shutterClosed) { toast('They can\'t hear you through the shutter.'); return; }
  const v = V;
  if (v.gaunt) { say(v.lines.mshutter, { distort: 1 }); return; }
  v.asked[q] = true;
  if (q === 'who') greet();
  else if (q === 'where') say(v.odd ? v.lines.mwhere : v.lines.where, { distort: v.odd ? Math.max(0.3, v.distort) : v.distort });
  else if (q === 'strange') say(v.odd ? v.lines.mstrange : v.lines.strange, { distort: v.odd ? Math.max(0.3, v.distort) : v.distort });
}

function requestID() {
  if (!V || V.state !== 'wait') return;
  if (V.gaunt) { toast('It has no ID. It has no face.'); audio.growl(1, 0.4); return; }
  if (V.kind === 'manager' && !V.id) { toast('He pats his jacket. "Left my badge in the office. Come on, you know me."', 4.5); setTalk(false); return; }
  if (V.idShown) { openDocs(); return; }
  if (V.shutterClosed) { toast('Open the shutter first.'); return; }
  V.idShown = true;
  say(V.lines.id);
  setTimeout(() => { if (!V) return; audio.paper(); world.idCard.visible = true; world.idCard.material = mat(V.id.type === 'res' ? 0xb8c8d8 : V.id.type === 'staff' ? 0xd89040 : 0xd8ccaa); toast('Documents slid under the glass. Click them or press I.', 3); }, 900);
  setTalk(false);
}

function decide(admit) {
  if (!V || V.state !== 'wait') return;
  if (admit && V.shutterClosed) { toast('Open the shutter first.'); return; }
  closeOverlays();
  const v = V;
  v.state = 'leaving';
  world.idCard.visible = false;
  const correct = admit === v.shouldAdmit;
  const entry = { name: v.name, kind: v.kind, monster: v.mt ? v.mt.name : null, admit, correct, wrong: v.wrong, resident: v.resident };
  night.log.push(entry);
  if (admit) {
    audio.buzz(); world.barrierTarget = 1;
    if (v.human && v.kind === 'resident') v.resident.status = 'IN';
    if (!v.human) {
      G.cas += v.mt && v.mt.rare ? 2 : 1;
      if (v.mt && v.mt.rare) setTimeout(() => { toast('She smiled. Every light in the hotel went out at once.', 6); flicker(3); }, 2200);
      say(pick([v.lines.madmit]), { distort: 0.9 });
      setTimeout(() => { audio.stinger(); flicker(1.5); }, 1600);
    } else {
      say(v.lines.admit);
      if (!correct) G.vio++;
      if (v.kind === 'manager') setTimeout(() => managerEnters(), 5200);
    }
    v.path = PATH_ADMIT.map(p => new THREE.Vector3(p[0], 0, p[1]));
    if (v.kind === 'checkout') {
      v.path = PATH_DENY.map(p => new THREE.Vector3(p[0], 0, p[1])); world.barrierTarget = 0;
      if (v.human) { v.resident.status = 'CHECKED OUT'; night.notices.push(`CHECK-OUT ${clockText(night.clockFrac)} — ${v.name} (Room ${v.resident.room}) left the hotel.`); }
    }
  } else {
    if (v.human) { say(v.lines.deny); if (!correct) G.vio++; }
    else if (v.gaunt) { audio.scream(1.2, 0.8, 0.4); }
    else say(v.lines.mdeny, { distort: 0.85 });
    v.path = PATH_DENY.map(p => new THREE.Vector3(p[0], 0, p[1]));
    if (v.kind === 'checkout' && v.human) { v.path = PATH_ADMIT.map(p => new THREE.Vector3(p[0], 0, p[1])); world.barrierTarget = 1; }
  }
  v.pi = 0; v.leaveDelay = 1.6;
  updateHUD();
  if (G.vio >= 3) setTimeout(() => gameOver('fired'), 2600);
  else if (G.cas >= 3) setTimeout(() => startScare('silent'), 3200);
}

function visitorUpdate(dt) {
  const v = V; if (!v) return;
  v.t += dt;
  const st = { walking: false, talk: 0, atWindow: false, turning: 0, speed: v.speed / 1.3 };
  if (v.state === 'walkin') {
    st.walking = true;
    if (v.kind === 'checkout') { const x = v.model.root.position.x; world.barrierTarget = x > 0.8 && x < 6 ? 1 : 0; }
    if (moveAlong(v, dt)) { v.state = 'arrive'; v.t = 0; }
  } else if (v.state === 'arrive') {
    let da = 0 - v.model.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    v.model.root.rotation.y += da * Math.min(1, dt * 5);
    if (v.t > 0.6) { v.state = 'wait'; v.t = 0; v.waitT = 0; greet(); updateHUD(); if (night.n === 1 && night.idx === 0) toast('Ask for their ID (I) and compare it with the Ledger (L). Then Admit (A) or Deny (D).', 7); if (v.gaunt) toast('SLAM THE SHUTTER! (SPACE)', 4); }
  } else if (v.state === 'wait') {
    st.atWindow = true;
    v.waitT += dt;
    if (!v.human && v.shutterClosed && v.waitT > 2.5) { startBanging(); }
    else if (!v.human && v.waitT > v.patience) {
      v.state = 'turning'; v.t = 0;
      if (v.model.parts.trueForm) setLayer(v.model.parts.trueForm, LAYER.COMMON);
      say(v.lines.mturn, { distort: 1 }); audio.growl(2.5, 0.5); flicker(3); closeOverlays();
      toast('SHUTTER! NOW!', 2.5);
    }
    // humans get impatient with the shutter closed
    if (v.human && v.shutterClosed) {
      v.closedT = (v.closedT || 0) + dt;
      if (v.closedT > 2 && !v.knocked) { v.knocked = true; audio.knock(); say(v.lines.shutter); }
      if (v.closedT > 14) { toast('They gave up and walked away.'); decideForced(); }
    }
  } else if (v.state === 'turning') {
    st.atWindow = true; st.turning = Math.min(1, v.t / 1.2);
    v.model.root.position.z = v.winZ + Math.min(0.2, v.t * 0.12);
    shake = Math.max(shake, 0.2 * st.turning);
    if (v.shutterClosed) { startBanging(); }
    else if (v.t > 3.4) { startScare('taken'); }
  } else if (v.state === 'banging') {
    st.atWindow = true; st.turning = 0.6; st.banging = true;
    v.bangT -= dt;
    const p = v.model.parts;
    const pos = v.model.root.position;
    pos.z += ((v.winZ - 0.12) - pos.z) * Math.min(1, dt * 8);
    if (p.armL) { p.armL.rotation.x = -1.45 + Math.sin(v.t * 14) * 0.22; p.armR.rotation.x = -1.45 + Math.cos(v.t * 14) * 0.22; }
    if (v.bangT <= 0 && v.bangs > 0) {
      v.bangs--; v.bangT = rand(0.35, 0.75);
      audio.bang(rand(0.7, 1)); shake = 0.6; world.shutterShake = 0.04;
      if (v.bangs === 3) { if (Math.random() < 0.6) audio.scream(rand(1.2, 2), rand(0.8, 1.3), 0.4); else say(v.lines.mshutter, { distort: 1 }); }
      if (v.bangs === 1) say(randLine('mshutter', v.g), { distort: 1 });
    }
    if (v.bangs <= 0 && v.bangT <= -2.2) { decideForced(); }
  } else if (v.state === 'leaving') {
    v.leaveDelay -= dt;
    if (v.leaveDelay <= 0) {
      st.walking = true;
      if (v.gaunt && !v.shouldAdmit) v.speed = 3.2;
      if (moveAlong(v, dt)) { removeVisitor(); return; }
      if (v.model.root.position.x > 3.6) world.barrierTarget = 0;
    } else {
      st.atWindow = true;
    }
  }
  st.talk = v.talking ? talkLevel : 0;
  // flashlight eye-shine
  if (flashOn && v.an && v.an.eyeShine) {
    const hp = (v.model.parts.head || v.model.root).getWorldPosition(new THREE.Vector3());
    const dir = hp.sub(cam.position).normalize();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    st.shine = clamp((dir.dot(fwd) - 0.94) / 0.05, 0, 1);
  }
  v.model.update(dt, st);
  if (v.holdsBox) { v.model.parts.armL.rotation.x = -0.9; v.model.parts.armR.rotation.x = -0.9; }
  // breath
  if (!v.gaunt && !(v.an && v.an.noBreath) && v.state !== 'walkin') {
    v.breathT -= dt;
    if (v.breathT <= 0) { v.breathT = rand(2.6, 3.8); emitPuff(v.model.mouthWorld()); }
  }
}

// ---- the night manager steps into the booth for a moment after you let him in
let inMgr = null, forceLookT = 0;
function doorStep(dt) { world.bDoor.rotation.y += (world.bDoorTarget * 1.35 - world.bDoor.rotation.y) * Math.min(1, dt * 3); }   // swings inward
function managerEnters() {
  if (inMgr || mode !== 'play') return;
  const c = buildCharacter(G.mgr.p, {});
  c.root.position.set(-1.0, 0, 0.18); c.root.rotation.y = Math.PI / 2; scene.add(c.root);
  inMgr = { c, t: 0, phase: 'in' };
  world.bDoorTarget = 1; audio.knock(); audio.click();
  forceLookT = 2.6; closeOverlays();                    // snap the view to the door...
  if (!audio.sample('jumpscare_mgr', { gain: 0.9, rev: 0.15 })) audio.stinger();   // ...with a jolt
  shake = Math.max(shake, 0.35);
}
function managerUpdate(dt) {
  doorStep(dt);
  if (!inMgr) return;
  const m = inMgr, r = m.c.root; m.t += dt;
  const go = (x, z, sp) => { const d = new THREE.Vector3(x - r.position.x, 0, z - r.position.z), L = d.length(); if (L < 0.02) return true; r.rotation.y = Math.atan2(d.x, d.z); r.position.add(d.multiplyScalar(Math.min(1, sp * dt / L))); return false; };
  let walking = false;
  if (m.phase === 'in') { walking = true; if (go(-0.74, -0.2, 0.9)) { m.phase = 'stay'; m.t = 0; world.bDoorTarget = 0; m.talking = true; say('mgr_logbook', { who: G.mgr.name, v: null, distort: 0, onEnd: () => { m.talking = false; } }); } }
  else if (m.phase === 'stay') { const a = Math.atan2(cam.position.x - r.position.x, cam.position.z - r.position.z); let da = a - r.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); r.rotation.y += da * Math.min(1, dt * 4); if (m.t > 3 && (!m.talking || m.t > 12)) { m.phase = 'out'; world.bDoorTarget = 1; audio.click(); } }
  else if (m.phase === 'out') { walking = true; if (go(-1.05, 0.18, 0.9)) { scene.remove(r); inMgr = null; world.bDoorTarget = 0; audio.knock(); return; } }
  m.c.update(dt, { walking, speed: 0.7, talk: m.talking ? talkLevel : 0, look: 0 });
}

function decideForced() {
  // visitor leaves after shutter: counts as deny
  if (!V) return;
  const v = V;
  const wasBanging = v.state === 'banging';
  v.state = 'wait';
  decide(false);
  if (wasBanging) { v.leaveDelay = 0.3; v.speed = 2.6; }
}

function startBanging() {
  const v = V;
  if (!v || !(v.state === 'wait' || v.state === 'turning')) return;
  v.state = 'banging'; v.t = 0; v.bangs = 4 + (Math.random() * 3 | 0); v.bangT = 0.1;
  toast('Hold the shutter...', 2);
}

function removeVisitor() {
  if (!V) return;
  scene.remove(V.model.root);
  V = null;
  night.idx++;
  night.wait = rand(2.5, 5);
  world.barrierTarget = 0;
  updateHUD();
}

// ------------------------------------------------------------------ shutter
function toggleShutter(force) {
  const close = force ?? world.shutterTarget < 0.5;
  if (close === (world.shutterTarget > 0.5)) return;
  world.shutterTarget = close ? 1 : 0;
  if (close) {
    setTimeout(() => audio.shutterSlam(), 140); shake = Math.max(shake, 0.35);
    if (V && (V.state === 'wait' || V.state === 'turning')) {
      V.shutterClosed = true;
      if (!V.human && V.state === 'wait') {
        // the monster reacts
        setTimeout(() => { if (!V || !V.shutterClosed) return; startBanging(); }, 500);
      } else if (V.human && V.state === 'wait') {
        V.closedT = 0; V.knocked = false;
        setTimeout(() => { if (V && V.human && V.shutterClosed && !V.knocked) { V.knocked = true; say(V.lines.shutter); } }, 700);
      }
    }
  } else {
    audio.shutterOpen();
    if (V) { V.shutterClosed = false; V.closedT = 0; }
    if (V && V.state === 'banging') { startScare('taken'); }
  }
  updateHUD();
}

// ------------------------------------------------------------------ fx
let flickerT = 0, lightning = 0;
function flicker(sec) { flickerT = Math.max(flickerT, sec); }
function emitPuff(p) {
  const f = world.puffs.find(x => x.life <= 0); if (!f) return;
  f.life = 1.8; f.s.visible = true; f.s.position.copy(p).add(new THREE.Vector3(0, -0.05, 0.05)); f.s.scale.setScalar(0.06);
}
function updatePuffs(dt) {
  for (const f of world.puffs) {
    if (f.life <= 0) continue;
    f.life -= dt;
    f.s.position.y += dt * 0.08; f.s.position.z += dt * 0.12;
    const k = 1 - f.life / 1.8;
    f.s.scale.setScalar(0.06 + k * 0.28);
    f.s.material.opacity = Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.3 * (night && night.n >= 4 ? 1.4 : 1);
    if (f.life <= 0) f.s.visible = false;
  }
}

function startScare(cause) {
  if (scareT >= 0) return;
  closeOverlays(); camMode = false; setCam(false);
  scareT = 0; G.deathCause = cause;
  world.scare.visible = true; world.scare.position.set(0, -0.05, -1.4); world.scare.scale.setScalar(0.8);
  audio.stopVoice();
  audio.jumpscare(); audio.bang(1.2);
  setTimeout(() => audio.playVoice(`misc_found_${V ? V.g : 'm'}`, { distort: 1, gain: 1.4 }), 200);
  $('hud').classList.add('hidden');
}

// ------------------------------------------------------------------ UI helpers
let subTimer = 0, toastTimer = 0;
function showSub(text, who, monster) {
  const s = $('subs');
  s.innerHTML = (who ? `<span class="who">${who}</span>` : '') + (monster ? glitchText(text) : text);
  s.className = monster ? 'mon' : '';
  s.style.opacity = 1; subTimer = 4;
}
function glitchText(t) { return t.split('').map(c => Math.random() < 0.07 ? pick(['#', '%', '&', 'Ø', '▓', '░']) : c).join(''); }
function toast(t, sec = 3) { const el = $('toast'); el.textContent = t; el.classList.add('show'); toastTimer = sec; }

function updateHUD() {
  if (!G) return;
  $('casN').textContent = G.cas; $('vioN').textContent = G.vio;
  $('nightLbl').textContent = `NIGHT ${night ? night.n : G.night}`;
  if (night) $('queueLbl').textContent = `VISITOR ${Math.min(night.idx + 1, night.specs.length)} / ${night.specs.length}`;
  const waiting = V && V.state === 'wait';
  document.querySelectorAll('#actions button').forEach(b => {
    const a = b.dataset.act;
    if (['talk', 'id', 'admit', 'deny'].includes(a)) b.disabled = !waiting;
    if (a === 'shutter') b.classList.toggle('on', world.shutterTarget > 0.5);
    if (a === 'flash') b.classList.toggle('on', flashOn);
    if (a === 'cam') b.classList.toggle('on', camMode);
    if (a === 'ledger') b.classList.toggle('on', ledgerOpen);
    if (a === 'breaker') b.classList.toggle('hidden', !!world.power);
    if (a === 'radio') b.classList.toggle('on', !!world.radioOn);
  });
}
function clockText(frac) {
  const mins = Math.floor(frac * 360);
  let h = Math.floor(mins / 60), m = mins % 60;
  return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')} AM`;
}

function setTalk(on) { talkOpen = on; $('talkMenu').classList.toggle('hidden', !on); }
function setCam(on) {
  camMode = on; $('camOverlay').classList.toggle('hidden', !on);
  post.uniforms.uCam.value = on ? 1 : 0;
  $('crosshair').style.display = on ? 'none' : '';
  if (on) { closeLedger(); closeDocs(); setTalk(false); audio.static(0.3); $('camName').textContent = secCams[camIdx].name; }
  updateHUD();
}
function switchCam(i) { camIdx = i; $('camName').textContent = secCams[i].name; audio.static(0.4); post.uniforms.uNoise.value = 1; }
function closeOverlays() { closeLedger(); closeDocs(); setTalk(false); if (camMode) setCam(false); }

const PINE_SVG = `<svg viewBox="0 0 40 40" class="logo"><path d="M10 34 L10 30 L4 30 L10 22 L6 22 L12 13 L9 13 L15 4 L21 13 L18 13 L24 22 L20 22 L26 30 L20 30 L20 34 Z" fill="currentColor"/><path d="M24 34 L24 31 L19 31 L25 24 L22 24 L27 17 L25 17 L30 10 L35 17 L33 17 L38 24 L35 24 L40 31 L35 31 L35 34 Z" fill="currentColor" opacity=".7"/></svg>`;
function barcode(text, w = 260, h = 26) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  let x = 4, seed = [...text].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  g.fillStyle = '#111';
  while (x < w - 4) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; const bw = 1 + (seed >>> 16) % 3; if (((seed >>> 8) & 3) !== 0) g.fillRect(x, 0, bw, h); x += bw + 1 + ((seed >>> 4) & 1); }
  c.className = 'bars'; return c;
}
function mrz(a, b) { const pad = s => (s.toUpperCase().replace(/[^A-Z0-9]/g, '<') + '<'.repeat(36)).slice(0, 36); return `${pad(a)}<br>${pad(b)}`; }
function portraitCanvas(p, w = 48, h = 58, bg) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; drawPortrait(cv, p, bg ? { bg } : {}); return cv; }

let uvOn = false;
function setUV(on) { uvOn = on; $('docs').classList.toggle('uv', on); if (on) audio.tone(60, 0.4, { type: 'sawtooth', gain: 0.03 }); audio.click(); }

function openDocs() {
  if (!V || !V.id) return;
  docsOpen = true; audio.paper();
  const wrap = $('docWrap'); wrap.innerHTML = '';
  const id = V.id;
  const [first, ...rest] = id.name.split(' '); const last = rest.join(' ');
  const card = document.createElement('div');
  card.className = `card ${id.type} ${id.uv ? 'uvok' : 'uvbad'}`;
  if (id.type === 'res') {
    card.innerHTML = `<div class="ci"><div class="guil"></div>
      <div class="hdr">${PINE_SVG}<div class="org"><div>${id.org || HOTEL_ORG}</div><small>RESIDENT IDENTIFICATION CARD</small></div><div class="tag">RESIDENT</div></div>
      <div class="bodyc"><div class="photo"><span class="ph"></span><span class="ghost"></span></div>
        <div class="fields">
          <div class="f wide"><label>1. SURNAME</label><b>${last.toUpperCase()}</b></div>
          <div class="f wide"><label>2. GIVEN NAME</label><b>${first.toUpperCase()}</b></div>
          <div class="f"><label>ROOM</label><b class="room">${id.room}</b></div>
          <div class="f"><label>RESIDENT ID</label><b>${id.idnum}</b></div>
          <div class="f"><label>DATE OF BIRTH</label><b>${id.dob}</b></div>
          <div class="f"><label>EXPIRES</label><b>${id.exp}</b></div>
          <div class="f wide"><label>ISSUED</label><b>${id.issued || '01/04/1996'}</b></div>
        </div>${id.stamp === false ? '' : '<div class="vstamp">VALIDATED<small>HOLLOW PINES · NIGHT DESK</small></div>'}</div>
      <div class="sig">${id.sig === false ? '&nbsp;' : `${first} ${last[0] || ''}.`}</div><span class="bc"></span>
      <div class="mrz">${mrz(`IDHP<<${last}<<${first}`, `${id.idnum.replace(/-/g, '')}<<${id.room}<<${id.exp.replace('/', '')}`)}</div>
      <div class="holo"></div></div>
      <div class="uvseal">${PINE_SVG}<span>HOLLOW PINES</span></div><div class="uvfib"></div>`;
  } else if (id.type === 'staff') {
    card.innerHTML = `<div class="ci"><div class="clip"></div>
      <div class="hdr">${PINE_SVG}<div class="org"><div>HOLLOW PINES</div><small>STAFF ACCESS BADGE</small></div></div>
      <div class="photo"><span class="ph"></span></div>
      <div class="sname">${id.name.toUpperCase()}</div>
      <div class="role">${id.role.toUpperCase()}</div>
      <div class="fields"><div class="f"><label>STAFF CODE</label><b>${id.code}</b></div><div class="f"><label>VALID THRU</label><b>${id.exp}</b></div></div>
      <span class="bc"></span></div>
      <div class="uvseal">${PINE_SVG}<span>STAFF</span></div><div class="uvfib"></div>`;
  } else {
    card.innerHTML = `<div class="ci"><div class="guil lic"></div>
      <div class="hdr"><div class="star">★</div><div class="org"><div>STATE OF OREGON</div><small>DRIVER LICENSE · CLASS C</small></div><div class="tag usa">USA</div></div>
      <div class="bodyc"><div class="photo"><span class="ph"></span></div>
        <div class="fields">
          <div class="f wide"><label>DL NO.</label><b class="red">${id.idnum}</b></div>
          <div class="f wide"><label>NAME</label><b>${last.toUpperCase()}, ${first.toUpperCase()}</b></div>
          <div class="f"><label>DOB</label><b>${id.dob}</b></div>
          <div class="f"><label>EXP</label><b>${id.exp}</b></div>
          <div class="f"><label>SEX</label><b>${V.g === 'f' ? 'F' : 'M'}</b></div>
          <div class="f"><label>EYES</label><b>${['BRN', 'BLU', 'GRN', 'HAZ', 'BLK'][EYES.indexOf(id.photo.eye)] || 'BRN'}</b></div>
        </div><span class="ghost"></span></div>
      <div class="sig">${id.name}</div></div>
      <div class="uvseal">★<span>OREGON</span></div><div class="uvfib"></div>`;
  }
  card.querySelector('.ph').replaceWith(portraitCanvas(id.photo, 48, 58, id.type === 'lic' ? '#a8b4bc' : id.type === 'staff' ? '#c8ccd0' : '#9fb0b8'));
  const gh = card.querySelector('.ghost'); if (gh) gh.replaceWith(Object.assign(portraitCanvas(id.photo, 24, 29, '#c8d0d8'), { className: 'ghost' }));
  const bc = card.querySelector('.bc'); if (bc) bc.replaceWith(barcode(id.idnum || id.code || id.name, id.type === 'staff' ? 200 : 300));
  wrap.appendChild(card);
  if (V.slip) {
    const s = document.createElement('div'); s.className = 'slip';
    s.innerHTML = `<div class="perf"></div><div class="hdr">${PINE_SVG}<div>HOLLOW PINES HOTEL<small>RESERVATION CONFIRMATION</small></div></div>
      <table><tr><td>GUEST</td><td><b>${V.slip.name}</b></td></tr><tr><td>BOOKING</td><td><b>${V.slip.code}</b></td></tr>
      <tr><td>NIGHTS</td><td>${V.slip.nights}</td></tr><tr><td>ARRIVAL</td><td>${tonight()}</td></tr><tr><td>RATE</td><td>$${29 + V.slip.nights * 3}.00 / night</td></tr></table>
      <div class="note">Present at the gate with photo ID.<br>No visitors after midnight.</div><span class="bc"></span><div class="stamp">CONFIRMED</div><div class="perf b"></div>`;
    s.querySelector('.bc').replaceWith(barcode(V.slip.code, 220, 22));
    wrap.appendChild(s);
  }
  $('docs').classList.remove('hidden');
  setUV(false);
  setTalk(false);
}
function closeDocs() { docsOpen = false; $('docs').classList.add('hidden'); }

let ledgerTab = 'res';
function openLedger(tab = ledgerTab) {
  ledgerOpen = true; ledgerTab = tab; audio.paper();
  $('ledger').classList.remove('hidden');
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const body = $('ledgerBody');
  if (tab === 'res') {
    body.innerHTML = `<input class="lsearch" id="lsearch" placeholder="Search name, room or ID..."><table><thead><tr><th>PHOTO</th><th>NAME</th><th>ROOM</th><th>RESIDENT ID</th><th>STATUS</th><th>NOTES</th></tr></thead><tbody></tbody></table>`;
    const tb = body.querySelector('tbody');
    const sorted = [...G.residents].sort((a, b) => a.room - b.room);
    for (const r of sorted) {
      const tr = document.createElement('tr');
      const st = r.alive ? r.status : 'MISSING';
      const stc = st === 'CHECKED OUT' ? 'GONE' : st;
      tr.innerHTML = `<td></td><td><b>${r.name}</b></td><td>${r.room}</td><td>${r.idnum}</td><td><span class="st ${stc}">${st}</span></td><td class="dim">${r.note}</td>`;
      tr.dataset.s = `${r.name} ${r.room} ${r.idnum}`.toLowerCase();
      if (V && V.kind === 'resident' && V.id && V.idShown && V.id.name.split(' ')[1] === r.name.split(' ')[1]) tr.classList.add('hl');
      const cv = document.createElement('canvas'); cv.width = 40; cv.height = 48; drawPortrait(cv, r.p, { bg: '#b8b0a0' });
      tr.firstChild.appendChild(cv);
      tb.appendChild(tr);
    }
    const se = $('lsearch');
    se.addEventListener('input', () => { const q = se.value.toLowerCase(); tb.querySelectorAll('tr').forEach(tr => tr.style.display = tr.dataset.s.includes(q) ? '' : 'none'); });
    se.addEventListener('keydown', e => e.stopPropagation());
  } else if (tab === 'staff') {
    body.innerHTML = `<h3>AUTHORIZED STAFF — ${tonight()}</h3><p class="dim">Staff may enter with a staff badge. Name, role and staff code must all match this list.</p>` + (night.staff.length ? `<table><thead><tr><th>PHOTO</th><th>NAME</th><th>ROLE</th><th>STAFF CODE</th></tr></thead><tbody></tbody></table>` : '<p><i>No staff scheduled tonight.</i></p>');
    const tb = body.querySelector('tbody');
    if (tb) for (const st of night.staff) { const tr = document.createElement('tr'); tr.innerHTML = `<td></td><td><b>${st.name}</b></td><td>${st.role}</td><td>${st.code}</td>`; const cv = document.createElement('canvas'); cv.width = 40; cv.height = 48; drawPortrait(cv, { ...st.p, shirt: st.shirt, hat: st.hat }, { bg: '#b8b0a0' }); tr.firstChild.appendChild(cv); tb.appendChild(tr); }
    // manager rota: he only comes to the gate on these nights
    const M_ = ensureManager();
    const rota = document.createElement('div');
    rota.innerHTML = `<h3 style="margin-top:16px">MANAGER ROTA — NOV / DEC 1999</h3><p class="dim">The night manager only comes to the gate on the nights he is on the rota. Badge or no badge, anyone wearing his face on any other night is not him.</p>
      <table><thead><tr><th>PHOTO</th><th>NAME</th><th>ROLE</th><th>STAFF CODE</th><th>ON SITE</th></tr></thead><tbody><tr><td></td><td><b>${M_.name}</b></td><td>${M_.role}</td><td>${M_.code}</td><td>${M_.schedule.map(n => nightDate(n)).join('<br>')}</td></tr></tbody></table>`;
    const mcv = document.createElement('canvas'); mcv.width = 40; mcv.height = 48; drawPortrait(mcv, M_.p, { bg: '#b8b0a0' });
    rota.querySelector('td').appendChild(mcv); body.appendChild(rota);
  } else if (tab === 'notes') {
    body.innerHTML = `<h3>NOTICES — ${tonight()}</h3>` + (night.notices.length ? night.notices.map(t => `<div class="notice">${t}</div>`).join('') : '<p class="dim"><i>Nothing yet. Radio bulletins and phone calls will be logged here.</i></p>');
  } else if (tab === 'arr') {
    body.innerHTML = `<h3>EXPECTED ARRIVALS — ${tonight()}</h3><p class="dim">Guests must show photo ID and a booking slip. Name and booking code must match exactly.</p><table><thead><tr><th>GUEST</th><th>BOOKING CODE</th><th>NIGHTS</th></tr></thead><tbody>${night.arrivals.map(a => `<tr><td><b>${a.name}</b></td><td>${a.code}</td><td>${a.nights}</td></tr>`).join('')}</tbody></table>`;
  } else if (tab === 'guide') {
    body.innerHTML = `<p class="dim">Notes left by previous night staff. New entries appear as you survive.</p><div class="guide">${Object.entries(MTYPES).map(([k, m]) => {
      const locked = m.rare ? !G.seenRare : m.night > (night ? night.n : 1);
      return `<div class="g ${locked ? 'locked' : ''}"><h4>${locked ? '??????' : m.name.toUpperCase()}<small>${locked ? 'NIGHT ' + m.night : m.diff}</small></h4>${locked ? '<i>Page torn out.</i>' : m.tell}</div>`;
    }).join('')}</div>`;
  } else if (tab === 'rules') {
    body.innerHTML = `<h3>NIGHT DESK PROCEDURE</h3><ol>
      <li>Residents marked <b>CHECKED OUT</b> no longer live here. If they come back, it is not them.</li>
      <li><b>Check-outs</b> come from inside. Only residents marked <b>IN</b> can check out — stamp them out with Admit.</li>
      <li><b>Residents</b> may enter if their name, room and resident ID match this ledger exactly and they are marked <b>OUT</b>.</li>
      <li>A resident marked <b>IN</b> is already inside. Whatever is at the window is not them.</li>
      <li><b>Guests</b> may enter only if on tonight's Arrivals list with a matching booking code.</li>
      <li><b>No visitors.</b> No exceptions. No broken-down cars. No friends.</li>
      <li><b>Staff</b> may enter only with a badge matching tonight's staff list (name, role, code).</li>
      <li><b>Deliveries</b> are left at the gate. Couriers never come in.</li>
      <li>Expired cards are not valid. Resident and staff cards must show the hotel seal under the <b>UV lamp</b>.</li>
      <li>Anyone showing <b>abnormal traits</b> is to be denied, regardless of papers.</li>
      <li>Check the <b>monitor</b>. The camera does not lie.</li>
      <li>If anything turns hostile, <b>close the shutter</b> and keep it closed until it leaves.</li>
      <li>Do not open the shutter while something is banging on it.</li></ol>`;
  }
  updateHUD();
}
function closeLedger() { ledgerOpen = false; $('ledger').classList.add('hidden'); updateHUD(); }

// ------------------------------------------------------------------ flow: menu, briefing, night, report
function showScreen(id) { ['menu', 'brief', 'report', 'over', 'pause', 'saves'].forEach(s => $(s).classList.toggle('hidden', s !== id)); }

function toMenu() {
  mode = 'menu'; showScreen('menu'); $('hud').classList.add('hidden'); closeOverlays();
  if (V) { scene.remove(V.model.root); V = null; }
  $('bContinue').classList.toggle('hidden', !loadRun());
  audio.menuMusic && audio.menuMusic(true, MENU_TRACK);
  world.shutterTarget = 0; flashOn = false; world.flash.intensity = 0;
}

function startBriefing() {
  mode = 'brief'; showScreen('brief'); $('hud').classList.add('hidden');
  const b = BRIEF[G.night];
  $('briefNight').textContent = b.title;
  $('briefText').textContent = b.text || VT[b.key] || '';
  const notes = (b.notes || []).map(t => `<div class="newType mech">${t}</div>`).join('');
  $('briefNew').innerHTML = notes + (b.newTypes.length ? '<b>Field guide updated:</b>' + b.newTypes.map(k => `<div class="newType"><b>${MTYPES[k].name}</b> — ${MTYPES[k].tell}</div>`).join('') : '<div class="newType"><b>Everything you have seen so far may appear tonight.</b></div>');
  audio.init(); audio.startAmbience();
  audio.menuMusic && audio.menuMusic(false);
  if (b.key) audio.playVoice(b.key, { rate: 0.98, onEnd: () => { if (b.extra && mode === 'brief') audio.playVoice(b.extra, { rate: 0.98 }); } }); else audio.static(0.6);
  $('briefText').textContent = b.text || ((VT[b.key] || '') + (b.extra ? ' ' + (VT[b.extra] || '') : ''));
  G.snapshot = null; G.snapshot = JSON.stringify(G);
  saveRun();
}

function startNight() {
  if (inMgr) { scene.remove(inMgr.c.root); inMgr = null; } world.bDoorTarget = 0;
  audio.stopVoice();
  if (V) { scene.remove(V.model.root); V = null; }
  night = planNight(G.night);
  mode = 'play'; showScreen(null); $('hud').classList.remove('hidden');
  fadeFx = 1; fadeTarget = 0;
  world.shutterTarget = 0; world.barrierTarget = 0;
  updateHUD();
  toast(G.night === 1 ? 'Move the mouse to look around. Your desk: ledger (left), buttons, monitor (right).' : 'Shift started. Stay sharp.', 5);
}

function endNight() {
  mode = 'report';
  // admitted monsters kill residents
  const lines = [];
  let correct = 0;
  for (const e of night.log) {
    if (e.correct) correct++;
    if (e.admit && e.monster) {
      const victims = G.residents.filter(r => r.alive);
      const victim = pick(victims.filter(r => r.status === 'IN')) || pick(victims);
      if (victim) victim.alive = false;
      lines.push(`<div class="repLine bad">You let in a <b>${e.monster}</b> wearing ${e.name}'s face${e.wrong ? ' (it ' + e.wrong + ')' : ''}. ${victim ? `Room ${victim.room} — <b>${victim.name}</b> is missing. The door was open. The bed was wet.` : ''}</div>`);
    } else if (e.admit && !e.correct) {
      lines.push(`<div class="repLine bad">You admitted <b>${e.name}</b>, who was not allowed in (${({ stranger: 'not a resident', fakeguest: 'booking did not match', fakestaff: 'staff card did not match the list', delivery: 'deliveries stay at the gate' })[e.kind] || 'resident was already inside'}). Violation.</div>`);
    } else if (e.kind === 'checkout' && !e.monster) {
      lines.push(e.admit ? `<div class="repLine good"><b>${e.name}</b> checked out.</div>` : `<div class="repLine bad">You refused to let <b>${e.name}</b> check out. Complaint filed.</div>`);
    } else if (!e.admit && !e.correct) {
      lines.push(`<div class="repLine bad">You turned away <b>${e.name}</b>, a real ${({ guest: 'guest', staff: 'staff member' })[e.kind] || 'resident'}. They spent the night outside. Complaint filed.</div>`);
    } else if (!e.admit && e.monster) {
      lines.push(`<div class="repLine good">Stopped a <b>${e.monster}</b>${e.name !== '???' ? ` posing as ${e.name}` : ''}.${e.wrong ? ' It ' + e.wrong + '.' : ''}</div>`);
    }
  }
  const pay = 40 + correct * 15 - (night.log.length - correct) * 10;
  G.pay += Math.max(0, pay);
  showScreen('report');
  $('repTitle').textContent = `NIGHT ${G.night} SURVIVED — 6:00 AM`;
  $('repBody').innerHTML = `<p>Correct decisions: <b>${correct} / ${night.log.length}</b> · Monsters inside: <b>${G.cas}/3</b> · Violations: <b>${G.vio}/3</b> · Wages: <b>$${Math.max(0, pay)}</b> (total $${G.pay})</p>${lines.join('') || '<div class="repLine good">A clean night. Nobody went missing.</div>'}`;
  $('bNext').textContent = G.night >= MAX_NIGHT ? 'See the dawn' : 'Next Night';
  G.recent = night.log.map(e => e.name);
  $('hud').classList.add('hidden'); closeOverlays();
  if (G.night < MAX_NIGHT) { G.night++; saveRun(); } else { addHistory('survived'); deleteSave(G.saveId); }
  if (G.cas >= 3) setTimeout(() => startScare('silent'), 500);
}

function ending() {
  mode = 'over'; showScreen('over');
  $('overTitle').textContent = 'DAWN';
  $('overTitle').classList.remove('red');
  const lost = G.residents.filter(r => !r.alive).length;
  $('overText').innerHTML = `You survived ${MAX_NIGHT} nights at the Hollow Pines Hotel.<br>${lost ? `${lost} resident${lost > 1 ? 's' : ''} never came back down for breakfast.` : 'Every resident came down for breakfast. All of them. Exactly the right number.'}<br>Total wages: $${G.pay}.<br><br>The day manager hands you an envelope. "Same time tonight?"`;
  $('bRetry').textContent = 'New Shift';
}

function gameOver(cause) {
  mode = 'over'; showScreen('over'); $('hud').classList.add('hidden'); closeOverlays();
  if (V) { scene.remove(V.model.root); V = null; }
  $('overTitle').classList.add('red');
  $('bRetry').textContent = 'Retry Night';
  const t = { taken: ['YOU WERE TAKEN', 'You left the window open. It was faster than you.'], silent: ['THE HOTEL WENT SILENT', 'Too many of them got inside. By morning the halls were full of familiar faces, and none of them were right.'], fired: ['YOU\'RE FIRED', 'Too many violations. The residents complained, and management agreed. Someone else works the desk tomorrow night.'] }[cause];
  $('overTitle').textContent = t[0]; $('overText').textContent = t[1] + ` — Night ${G.night}`;
  addHistory(cause);
}

function retry() {
  if ($('bRetry').textContent === 'New Shift') { newRun(); startBriefing(); return; }
  if (G.snapshot) { const snap = G.snapshot; G = JSON.parse(snap); G.snapshot = snap; }
  startBriefing();
}

// ------------------------------------------------------------------ input
const mouse = new THREE.Vector2(), ndc = new THREE.Vector2();
const ray = new THREE.Raycaster(); ray.layers.enableAll();
let hoverObj = null;
window.addEventListener('mousemove', e => {
  mouse.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1));
  ndc.copy(mouse);
});
function interactables() {
  const list = [];
  scene.traverse(o => { if (o.userData && o.userData.act) list.push(o); });
  return list;
}
let INTER = [];
function findAct(obj) { while (obj) { if (obj.userData && obj.userData.act) return obj; obj = obj.parent; } return null; }

canvas.addEventListener('mousedown', e => {
  if (mode !== 'play' || scareT >= 0) return;
  if (e.button === 2) { zoom = true; return; }
  if (e.button !== 0) return;
  if (docsOpen) { closeDocs(); return; }
  if (camMode) return;
  if (hoverObj) action(hoverObj.userData.act);
});
window.addEventListener('mouseup', e => { if (e.button === 2) zoom = false; });
window.addEventListener('contextmenu', e => e.preventDefault());
$('docs').addEventListener('mousedown', e => { if (e.target.closest('.docBar')) return; closeDocs(); });
$('bUV').onclick = () => setUV(!uvOn);
$('bDocLedger').onclick = () => { closeDocs(); openLedger(); };
$('bDocClose').onclick = () => closeDocs();

function action(a) {
  if (mode !== 'play' || scareT >= 0) return;
  audio.click();
  switch (a) {
    case 'talk': if (V && V.state === 'wait') setTalk(!talkOpen); break;
    case 'id': case 'viewid': if (V && V.idShown) { docsOpen ? closeDocs() : openDocs(); } else requestID(); break;
    case 'ledger': ledgerOpen ? closeLedger() : (closeDocs(), setTalk(false), camMode && setCam(false), openLedger()); break;
    case 'cam': setCam(!camMode); break;
    case 'breaker': hitBreaker(); break;
    case 'radioDown': setRadioVol(radioVol - 0.1); break;
    case 'radioUp': setRadioVol(radioVol + 0.1); break;
    case 'radio': world.radioOn = !world.radioOn; audio.click(); audio.radioTune(world.radioOn ? RADIO[world.radioCh] : null, () => night && night.n >= 3); drawRadio(); updateHUD(); break;
    case 'channel': if (!world.radioOn) { world.radioOn = true; } else world.radioCh = (world.radioCh + 1) % RADIO.length; audio.click(); audio.radioTune(RADIO[world.radioCh], () => night && night.n >= 3); drawRadio(); toast(`${RADIO[world.radioCh].f} — ${RADIO[world.radioCh].name}`, 2); updateHUD(); break;
    case 'flash': flashOn = !flashOn; world.flash.intensity = flashOn ? 26 : 0; audio.click(); updateHUD(); break;
    case 'shutter': toggleShutter(); break;
    case 'admit': decide(true); break;
    case 'deny': decide(false); break;
  }
}
document.querySelectorAll('#actions button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); action(b.dataset.act); b.blur(); }));
document.querySelectorAll('#talkMenu button').forEach(b => b.addEventListener('click', () => ask(b.dataset.q)));
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => b.dataset.tab === 'close' ? closeLedger() : openLedger(b.dataset.tab)));

window.addEventListener('keydown', e => {
  if (e.repeat && e.code !== 'KeyZ') return;
  if (e.code === 'Escape') {
    if (mode === 'play') { if (ledgerOpen || docsOpen || talkOpen || camMode) { closeOverlays(); return; } mode = 'paused'; showScreen('pause'); return; }
    if (mode === 'paused') { resume(); return; }
  }
  if (mode !== 'play' || scareT >= 0) return;
  const k = e.code;
  if (talkOpen && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(k)) { ask(['who', 'where', 'strange', 'id'][+k.slice(-1) - 1]); return; }
  if (docsOpen && k === 'KeyU') { setUV(!uvOn); return; }
  if (camMode && ['Digit1', 'Digit2', 'Digit3'].includes(k)) { const i = +k.slice(-1) - 1; if (i === 2 && night && night.n < 2) { toast('THERMAL camera offline until night 2.'); return; } switchCam(i); return; }
  const map = { KeyT: 'talk', KeyI: 'id', KeyL: 'ledger', KeyC: 'cam', KeyF: 'flash', Space: 'shutter', KeyA: 'admit', KeyD: 'deny', KeyG: 'breaker', KeyR: 'radio', KeyN: 'channel', Minus: 'radioDown', Equal: 'radioUp', NumpadSubtract: 'radioDown', NumpadAdd: 'radioUp' };
  if (k === 'KeyZ') { zoom = true; return; }
  if (map[k]) { e.preventDefault(); action(map[k]); }
});
window.addEventListener('keyup', e => { if (e.code === 'KeyZ') zoom = false; });

function resume() { mode = 'play'; showScreen(null); }

// dev-only testing hooks, active only with URL params (e.g. ?devnight=3&devmgr=fake); normal play never sets these
const DEVQ = new URLSearchParams(location.search);
if (DEVQ.get('devmgr')) window.__ndm = () => ({ inMgr, V, managerEnters });
$('bNew').onclick = () => { audio.init(); newRun(); if (DEVQ.get('devnight')) G.night = +DEVQ.get('devnight'); startBriefing(); };
$('bContinue').onclick = () => { audio.init(); const s = loadRun(); if (s) { G = s; startBriefing(); } };
$('bSaves').onclick = () => { audio.init(); showSaves(); };
$('bSavesBack').onclick = () => toMenu();
$('bClearHist').onclick = () => { try { localStorage.removeItem(HIST_KEY); } catch (e) {} showSaves(); };
$('bHow').onclick = () => $('howTo').classList.remove('hidden');
$('bHowClose').onclick = () => $('howTo').classList.add('hidden');
$('bQuit').onclick = () => window.close();
$('bStart').onclick = () => startNight();
$('bNext').onclick = () => { if ($('bNext').textContent === 'See the dawn') ending(); else startBriefing(); };
$('bRetry').onclick = () => retry();
$('bMenu').onclick = () => toMenu();
$('bResume').onclick = () => resume();
$('bPMenu').onclick = () => toMenu();
$('optVol').oninput = e => audio.setVolume(+e.target.value);
$('optSens').oninput = e => sens = +e.target.value;
$('optRadio').oninput = e => { radioVol = +e.target.value; drawRadio(); };
$('optPix').oninput = e => { pixelSize = +e.target.value; resize(); };

// ------------------------------------------------------------------ ambient events
function ambientEvent() {
  const n = night.n;
  const r = Math.random();
  if (r < 0.3) flicker(rand(0.6, 1.6));
  else if (r < 0.5 && n >= 2) { world.watcher.root.visible = true; world.watcherT = rand(15, 30); world.watcher.root.position.set(rand(-22, -12), 0, rand(-10, -7.8)); }
  else if (r < 0.65) { audio.distantScream(); }
  else if (r < 0.8 && n >= 3) { audio.knock(); setTimeout(() => audio.playVoice(`misc_behind_${pick(['m', 'f'])}`, { distort: 0.9, gain: 0.5 }), 1600); }
  else audio.thud();
}

// ------------------------------------------------------------------ main loop
const clock = new THREE.Clock();
let time = 0;
const DEBUG = location.search.includes('debug');
function frame() {
  if (DEBUG && document.hidden) setTimeout(frame, 33); else requestAnimationFrame(frame);
  const real = Math.min(0.05, clock.getDelta());
  const n = DEBUG ? (window.__warp || 1) : 1;
  for (let i = 0; i < n; i++) tick(i === n - 1 ? real : 0.05, i === n - 1);
}
function tick(dt, doRender) {
  time += dt;
  post.uniforms.uTime.value = time;
  talkLevel = talkLevel * 0.6 + audio.level() * 0.4;

  const playing = mode === 'play';
  if (playing && scareT < 0) {
    // spawn
    if (!V) { night.wait -= dt; if (night.wait <= 0) spawnNext(); }
    visitorUpdate(dt);
    managerUpdate(dt);
    // clock
    const target = (night.idx + (V && V.state !== 'walkin' ? 0.5 : 0)) / night.specs.length;
    night.clockFrac += (target - night.clockFrac) * dt * 0.5;
    $('clock').textContent = clockText(Math.min(night.clockFrac, 0.999));
    $('camTime').textContent = `${tonight()}  ${clockText(night.clockFrac)}`;
    night.eventT -= dt;
    if (night.eventT <= 0) { night.eventT = rand(18, 34) / (1 + night.n * 0.15); ambientEvent(); }
    audio.setTension(V && !V.human && V.state === 'turning' ? 1 : V && V.state === 'banging' ? 0.7 : night.n * 0.05);
  } else if (mode === 'menu' && V) { /* none */ }

  // watcher
  if (world.watcher.root.visible) { world.watcherT -= dt; world.watcher.update(dt, { atWindow: false }); if (world.watcherT <= 0) world.watcher.root.visible = false; }

  // scare sequence
  if (scareT >= 0) {
    scareT += dt;
    const k = Math.min(1, scareT / 0.25);
    world.scare.position.set((Math.random() - 0.5) * 0.04, -0.05 + (Math.random() - 0.5) * 0.04, -1.4 + k * 1.05);
    world.scare.rotation.z = (Math.random() - 0.5) * 0.3;
    shake = 1; flashFx = scareT < 1.2 ? (Math.sin(scareT * 40) > 0 ? 0.5 : 0.15) : 0;
    if (scareT > 1.6) { fadeFx = 1; }
    if (scareT > 2.1) { world.scare.visible = false; scareT = -1; flashFx = 0; shake = 0; gameOver(G.deathCause); }
  }

  // look
  if (!camMode && (playing || mode === 'menu' || mode === 'brief')) {
    if (playing && !ledgerOpen && !docsOpen) {
      look.ty = -mouse.x * 0.95 * sens; look.tp = clamp(mouse.y * 0.55 * sens - 0.1, -0.72, 0.3);
    } else if (mode !== 'play') {
      look.ty = Math.sin(time * 0.15) * 0.12; look.tp = -0.02 + Math.sin(time * 0.11) * 0.03;
    }
    // the night manager bursting through the side door yanks your head round to him
    let lookRate = 6;
    if (forceLookT > 0 && inMgr) {
      forceLookT -= dt; lookRate = 16;
      const hp = (inMgr.c.parts.head || inMgr.c.root).getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.12, 0));
      const d = hp.sub(cam.position);
      look.ty = Math.atan2(-d.x, -d.z); look.tp = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.72, 0.6);
    }
    look.yaw += (look.ty - look.yaw) * Math.min(1, dt * lookRate);
    look.pitch += (look.tp - look.pitch) * Math.min(1, dt * lookRate);
  }
  const fovT = zoom && playing && !camMode ? 24 : 62;
  cam.fov += (fovT - cam.fov) * Math.min(1, dt * 7); cam.updateProjectionMatrix();
  cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  const lean = zoom && playing ? 0.22 : 0;
  cam.position.z += ((0.28 - lean) - cam.position.z) * Math.min(1, dt * 6);
  if (shake > 0) { cam.rotation.x += (Math.random() - 0.5) * shake * 0.03; cam.rotation.y += (Math.random() - 0.5) * shake * 0.03; shake = Math.max(0, shake - dt * 2); }

  // shutter animation (falls fast, rolls up slow)
  const sp = world.shutterTarget > world.shutterProg ? 7 : 1.3;
  world.shutterProg += clamp(world.shutterTarget - world.shutterProg, -sp * dt, sp * dt);
  const off = (1 - world.shutterProg) * 1.0;
  world.shutterShake = (world.shutterShake || 0) * 0.85;
  world.shutter.position.y = off; world.shutter.position.x = (Math.random() - 0.5) * world.shutterShake;
  world.shutter.position.z = -0.925 + (world.shutterShake || 0) * 0.5;
  world.slats.forEach(s => { s.visible = s.position.y + off < 1.97; });
  // barrier
  world.barrierUp += (world.barrierTarget - world.barrierUp) * Math.min(1, dt * 2.5);
  world.barrierArm.rotation.x = world.barrierUp * 1.35;

  // flicker
  const pk = world.power ? 1 : 0;
  let on = true;
  if (flickerT > 0) { flickerT -= dt; on = Math.random() > 0.45; if (audio.hum && world.power) audio.hum.gain.value = on ? 0.012 : 0.0; }
  else if (Math.random() < 0.002) flicker(0.15);
  const k1 = pk * (on ? 1 : 0.03);
  world.tubeLight.intensity = world.tubeBase * k1; world.tube.material.color.setHex(k1 > 0.5 ? 0xe8fff0 : 0x202420);
  world.lampLight.intensity = 1.6 * pk; world.porch.intensity = 2.2 * pk * (on ? 1 : 0.2); world.porchGlow.visible = pk > 0 && on;
  world.monGlow.intensity = 0.6 * pk; world.screenMat.uniforms.uOn.value = pk;
  for (const L of [world.lamp1, world.lamp2, world.lamp3]) {
    const lit = pk * (L === world.lamp1 ? (flickerT > 0 && Math.random() < 0.3 ? 0.05 : 1) : (Math.random() < 0.03 ? 0.1 : 1));
    L.sp.intensity = L.base * lit; L.glow.visible = lit > 0.5; L.cone.visible = lit > 0.5 && L !== world.lamp1; L.bulb.material.color.setHex(lit > 0.5 ? 0xffe0a0 : 0x221a10);
  }
  world.sign.material.opacity = pk * (Math.random() < 0.02 ? 0.3 : 1);
  world.drops.material.map.offset.y -= dt * 0.02;
  if (world.breakerLever) world.breakerLever.rotation.x = world.power ? 0 : 0.8;
  if (audio.radioOut) audio.radioLevel(world.radioOn && world.power && mode === 'play' ? (V && V.talking ? 0.22 : 0.6) * radioVol : 0);
  if (world.radioLcd && (world._lcdPower !== world.power)) { world._lcdPower = world.power; drawRadio(); }
  // power cut during a visit (night 3+)
  if (playing && night && night.power && !night.power.done && night.idx >= night.power.at && V && V.state === 'wait' && V.waitT > 5) powerCut();
  // lightning
  if (playing && night) {
    night.lightningT -= dt;
    if (night.lightningT <= 0) { night.lightningT = rand(35, 80); lightning = 0.45; setTimeout(() => audio.thunder && audio.thunder(), rand(700, 2600)); }
  }
  if (lightning > 0) { lightning -= dt; const f = (lightning > 0.3 || (lightning > 0.08 && lightning < 0.18)) ? 1 : 0; world.moon.intensity = 0.35 + f * 5; post.uniforms.uLight.value = f * 0.12; }
  else { world.moon.intensity = 0.35; post.uniforms.uLight.value = 0; }

  // rain
  const R = world.rain;
  for (let i = 0; i < R.N; i++) {
    const o = i * 6;
    R.pos[o + 1] -= R.spd[i] * dt; R.pos[o + 4] -= R.spd[i] * dt;
    if (R.pos[o + 1] < 0) { const y = 7 + Math.random(); R.pos[o + 1] = y; R.pos[o + 4] = y + 0.22; }
  }
  R.mesh.geometry.attributes.position.needsUpdate = true;
  updatePuffs(dt);

  // hover picking
  hoverObj = null;
  if (playing && !camMode && !ledgerOpen && !docsOpen && scareT < 0) {
    ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects(INTER, true);
    for (const h of hits) { if (!h.object.visible) continue; const a = findAct(h.object); if (a && h.distance < 2.2) { hoverObj = a; } break; }
  }
  $('hoverLbl').textContent = hoverObj ? hoverObj.userData.label : '';
  canvas.style.cursor = hoverObj ? 'pointer' : 'default';
  world.btns.forEach(b => b.material.emissiveIntensity = b === hoverObj ? 0.9 : 0.25);

  // timers
  if (subTimer > 0) { subTimer -= dt; if (subTimer <= 0) $('subs').style.opacity = 0; }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
  post.uniforms.uNoise.value = Math.max(0, post.uniforms.uNoise.value - dt * 2) + (V && V.state === 'turning' ? 0.6 : 0) + (flickerT > 0 ? 0.3 : 0);
  fadeFx += (fadeTarget - fadeFx) * Math.min(1, dt * 1.5);
  if (scareT > 1.6) fadeFx = 1;
  post.uniforms.uFade.value = fadeFx; post.uniforms.uFlash.value = flashFx; post.uniforms.uShake.value = shake;

  if (!doRender) return;
  // render
  const sc = secCams[camMode ? camIdx : 0];
  post.uniforms.uTherm.value = camMode && sc.thermal ? 1 : 0;
  if (!world.power) {
    renderer.setRenderTarget(camRT); renderer.setClearColor(0x000000); renderer.clear();
    if (camMode) post.uniforms.uNoise.value = 3;
  } else {
    world.hemi.intensity = 2.6; world.ir.intensity = 9; world.ir.position.copy(sc.cam.position);
    world.rain.mesh.visible = false; world.drops.visible = false;
    if (sc.thermal) renderThermal(sc.cam);
    else {
      const stat = V && V.an && V.an.static && V.state !== 'walkin';
      if (stat) { V.model.root.visible = Math.random() > 0.45; post.uniforms.uNoise.value = Math.max(post.uniforms.uNoise.value, camMode ? 0.8 : 0); }
      renderer.setRenderTarget(camRT); renderer.render(scene, sc.cam);
      if (stat) V.model.root.visible = true;
    }
    world.rain.mesh.visible = true; world.drops.visible = true;
    world.hemi.intensity = 0.55; world.ir.intensity = 0;
  }
  if (!camMode) { renderer.setRenderTarget(sceneRT); renderer.render(scene, cam); }
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}

// ------------------------------------------------------------------ radio stations
const RADIO = [
  { f: '88.1', name: 'KHPR OVERNIGHT NEWS', news: true },
  { f: '91.3', name: 'CLASSICAL 91', file: 'classical' },
  { f: '94.7', name: 'THE HEAT', file: 'trap' },
  { f: '99.1', name: 'DRILL AFTER DARK', file: 'drill' },
  { f: '102.5', name: 'LO-FI LATE', file: 'lofi' },
  { f: '106.9', name: 'RETRO WAVE', file: 'synthwave' },
  { f: '89.5', name: 'MIDNIGHT JAZZ', file: 'jazz' },
  { f: '96.3', name: 'ROCK 96', file: 'rock' },
  { f: '100.7', name: 'HIGHWAY COUNTRY', file: 'country' },
  { f: '104.1', name: 'GOLDEN OLDIES', file: 'oldies' },
].filter(c => c.news || (window.RADIO_EL || []).includes(c.file)).sort((a, b) => parseFloat(a.f) - parseFloat(b.f));
// one of the two lobby tracks, picked each time the game is opened
const MENU_TRACK = (window.RADIO_EL || []).includes('menu2') && Math.random() < 0.5 ? 'menu2' : 'menu';
function setRadioVol(v) { radioVol = Math.max(0, Math.min(1.5, v)); const el = $('optRadio'); if (el) el.value = radioVol; toast(`Radio volume ${Math.round(radioVol * 100)}%`, 1.5); drawRadio(); }
function drawRadio() {
  const { c, t } = world.radioLcd, g = c.getContext('2d');
  g.fillStyle = world.radioOn && world.power ? '#1c2a12' : '#0a0c08'; g.fillRect(0, 0, 128, 32);
  if (world.radioOn && world.power) { const ch = RADIO[world.radioCh]; g.fillStyle = '#9adf6a'; g.font = 'bold 15px monospace'; g.fillText(ch.f + ' FM', 6, 14); g.font = '9px monospace'; g.fillText(ch.name.slice(0, 22), 6, 27); for (let i = 0; i < 6; i++) if (radioVol > i / 4) g.fillRect(96 + i * 5, 12 - i * 2, 3, 3 + i * 2); }
  t.needsUpdate = true;
  world.radioLed.material.color.setHex(world.radioOn && world.power ? 0xff3010 : 0x201010);
}

// ------------------------------------------------------------------ thermal camera
const thermBg = new THREE.MeshBasicMaterial({ color: 0x0b1438 });
const thermScene = new THREE.Scene();
const THERM = [[0, 0x14205a], [0.3, 0x5a1e8a], [0.55, 0xc0283a], [0.8, 0xf08a1e], [1, 0xfff4b0]].map(([t, c]) => [t, new THREE.Color(c)]);
const thermMats = new Map();
function thermMat(t) {
  t = clamp(Math.round(t * 20) / 20, 0, 1.1);
  if (thermMats.has(t)) return thermMats.get(t);
  let c = THERM[THERM.length - 1][1].clone();
  for (let i = 1; i < THERM.length; i++) if (t <= THERM[i][0]) { const [t0, c0] = THERM[i - 1], [t1, c1] = THERM[i]; c = c0.clone().lerp(c1, (t - t0) / (t1 - t0)); break; }
  const m = new THREE.MeshBasicMaterial({ color: c }); thermMats.set(t, m); return m;
}
const _wp = new THREE.Vector3();
function renderThermal(camera) {
  const vis = V && V.model.root;
  scene.overrideMaterial = thermBg;
  if (vis) vis.visible = false;
  world.puffs.forEach(p => p.s.visible = false);
  renderer.setRenderTarget(camRT); renderer.render(scene, camera);
  scene.overrideMaterial = null;
  if (vis) {
    vis.visible = true;
    const saved = [];
    vis.traverse(o => { if (o.isMesh) { saved.push([o, o.material]); o.getWorldPosition(_wp); o.material = thermMat(V.temp * (0.82 + (_wp.y > 1.3 ? 0.18 : 0.05)) + (V.temp > 0.6 && o.material.color && o.material.color.r > 0.4 ? 0.06 : 0)); } });
    const par = vis.parent; thermScene.add(vis);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(thermScene, camera); renderer.autoClear = true;
    par.add(vis); saved.forEach(([o, m]) => o.material = m);
  }
  world.puffs.forEach(p => p.s.visible = p.life > 0);
}

// ------------------------------------------------------------------ boot
await loadModels();
setPortraitRenderer(renderer);
buildWorld();
INTER = interactables();
drawRadio();
resize();
window.addEventListener('resize', resize);
toMenu();
$('loading').classList.add('hidden');
fadeTarget = 0;
frame();
// preload some voices after first interaction
window.addEventListener('pointerdown', () => { audio.init(); if (mode === 'menu') audio.menuMusic(true, MENU_TRACK); }, { once: true });
if (DEBUG) window.__nd = { get G() { return G; }, get V() { return V; }, get night() { return night; }, action, toggleShutter, decide, ask, setCam, switchCam, openLedger,
  secCams, cam, scene, world, THREE, powerCut, hitBreaker, phoneCall, drawPortrait, randomParams, makeVisitor,
  sim(s) { for (let i = 0; i < s * 20; i++) tick(0.05, false); tick(0.001, true); }, look(x, y) { mouse.set(x, y); ndc.set(x, y); } };
