// Night Desk — audio system: voice playback with monster distortion + procedural SFX
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.cache = new Map();
    this.revCache = new Map();
    this.current = null;
    this.volume = 0.8;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.voiceBus = ctx.createGain(); this.voiceBus.gain.value = 1.15; this.voiceBus.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.9; this.amb.connect(this.master);
    // reverb
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6, 2.2);
    this.revSend = ctx.createGain(); this.revSend.gain.value = 0.5;
    this.revSend.connect(this.reverb); this.reverb.connect(this.master);
    // noise
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256;
    this.anaData = new Uint8Array(this.analyser.fftSize);
    const z = ctx.createGain(); z.gain.value = 0; this.analyser.connect(z); z.connect(ctx.destination);
    this.sfxBufs = {};
    for (const n of (window.SFX_EL || [])) {
      fetch(`sfx/${n}.mp3`).then(r => r.arrayBuffer()).then(ab => ctx.decodeAudioData(ab)).then(b => { this.sfxBufs[n] = b; }).catch(() => {});
    }
  }

  // play an ElevenLabs sample if loaded; returns false so callers can fall back to synthesis
  sample(name, { gain = 1, rate = 1, rev = 0.25 } = {}) {
    const b = this.sfxBufs && this.sfxBufs[name];
    if (!b) return false;
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(this.sfx);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.revSend); }
    s.start(); return true;
  }
  jumpscare() { if (!this.ctx) return; if (!this.sample('jumpscare', { gain: 1.6 })) { this.scream(1.8, 0.9, 0.9); this.scream(1.7, 1.3, 0.6); } this.sample('scream1', { gain: 0.8, rate: 0.8 }); }
  distantScream() { if (!this.ctx) return; if (!this.sample('distant', { gain: 0.35, rev: 0.8 })) this.scream(1.4, 0.8, 0.07); }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  makeImpulse(sec, decay) {
    const ctx = this.ctx, len = ctx.sampleRate * sec;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = b.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  async loadBuffer(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const p = (async () => {
      const ext = (window.VOICE_EL || []).includes(key) ? 'mp3' : 'wav';
      const res = await fetch(`voices/${key}.${ext}`);
      if (!res.ok) throw new Error('missing voice ' + key);
      const ab = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(ab);
    })();
    this.cache.set(key, p);
    try { return await p; } catch (e) { this.cache.delete(key); throw e; }
  }

  reversed(key, buf) {
    if (this.revCache.has(key)) return this.revCache.get(key);
    const r = this.ctx.createBuffer(1, buf.length, buf.sampleRate);
    const s = buf.getChannelData(0), o = r.getChannelData(0);
    for (let i = 0; i < s.length; i++) o[i] = s[s.length - 1 - i];
    this.revCache.set(key, r);
    return r;
  }

  curve(amount) {
    const n = 1024, c = new Float32Array(n), k = amount * 100;
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }

  stopVoice() {
    if (this.current) { try { this.current.stop(); } catch (e) {} this.current = null; }
  }

  // distort: 0 = clean human, 0.3 = subtle glitch, 1 = full monster
  async playVoice(key, { rate = 1, distort = 0, gain = 1, onEnd } = {}) {
    if (!this.ctx) return 0;
    let buf;
    try { buf = await this.loadBuffer(key); } catch (e) { console.warn(e); onEnd && onEnd(); return 0; }
    this.stopVoice();
    const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = gain;
    out.connect(this.voiceBus); out.connect(this.analyser);
    // phone/intercom-ish band so it sounds like it's through glass
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200 - distort * 2200;
    hp.connect(lp); lp.connect(out);
    const send = ctx.createGain(); send.gain.value = 0.12 + distort * 0.6; lp.connect(send); send.connect(this.revSend);

    const r = rate * (1 - 0.22 * distort);
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = r;
    const srcs = [src];
    if (distort > 0) {
      // dry part
      const dry = ctx.createGain(); dry.gain.value = 1 - distort * 0.55; src.connect(dry);
      const shaper = ctx.createWaveShaper(); shaper.curve = this.curve(0.2 + distort * 0.9);
      dry.connect(shaper); shaper.connect(hp);
      // ring modulator
      const ring = ctx.createGain(); ring.gain.value = 0;
      const osc = ctx.createOscillator(); osc.frequency.value = 38 + Math.random() * 30;
      const oscG = ctx.createGain(); oscG.gain.value = 1; osc.connect(oscG); oscG.connect(ring.gain);
      src.connect(ring);
      const ringOut = ctx.createGain(); ringOut.gain.value = distort * 0.9; ring.connect(ringOut); ringOut.connect(shaper);
      osc.start(t); osc.stop(t + buf.duration / r + 0.5);
      // pitch-shift jitter (wobble)
      if (distort >= 0.25) {
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5 + distort * 9;
        const lg = ctx.createGain(); lg.gain.value = 0.05 * distort; lfo.connect(lg); lg.connect(src.playbackRate);
        lfo.start(t); lfo.stop(t + buf.duration / r + 0.5);
      }
      // octave-down demon double
      if (distort >= 0.5) {
        const low = ctx.createBufferSource(); low.buffer = buf; low.playbackRate.value = r * 0.5;
        const lowG = ctx.createGain(); lowG.gain.value = distort * 0.55; low.connect(lowG); lowG.connect(shaper);
        // trim the slow copy to the same length
        low.start(t); low.stop(t + buf.duration / r);
        srcs.push(low);
        const rev = ctx.createBufferSource(); rev.buffer = this.reversed(key, buf); rev.playbackRate.value = r * 0.8;
        const revG = ctx.createGain(); revG.gain.value = distort * 0.22; rev.connect(revG); revG.connect(hp);
        rev.start(t); rev.stop(t + buf.duration / r);
        srcs.push(rev);
      }
    } else {
      src.connect(hp);
    }
    src.onended = () => { if (this.current === src) this.current = null; onEnd && onEnd(); };
    src.start(t);
    this.current = { stop: () => srcs.forEach(s => { try { s.stop(); } catch (e) {} }) };
    return buf.duration / r;
  }

  level() {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.anaData);
    let s = 0;
    for (let i = 0; i < this.anaData.length; i++) { const v = (this.anaData[i] - 128) / 128; s += v * v; }
    return Math.min(1, Math.sqrt(s / this.anaData.length) * 5);
  }

  // ---------- procedural sound helpers ----------
  noise(dur, { type = 'lowpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, dest = this.sfx, at = 0 } = {}) {
    const ctx = this.ctx, t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return { f, g, s };
  }

  tone(freq, dur, { type = 'sine', gain = 0.3, attack = 0.005, endFreq = null, dest = this.sfx, at = 0 } = {}) {
    const ctx = this.ctx, t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }

  metal(gain = 0.25, dur = 0.9, at = 0) {
    [212, 347, 529, 811, 1187, 1730].forEach((f, i) =>
      this.tone(f * (0.97 + Math.random() * 0.06), dur * (1 - i * 0.1), { type: i % 2 ? 'triangle' : 'sine', gain: gain / (i + 1.5), at }));
  }

  shutterSlam() {
    if (!this.ctx) return;
    if (this.sample('slam', { gain: 1.2, rate: 0.95 + Math.random() * 0.1 })) { this.tone(70, 0.4, { gain: 0.5, endFreq: 35 }); return; }
    this.noise(0.5, { freq: 2400, gain: 0.9, type: 'lowpass' });
    this.tone(70, 0.5, { gain: 0.9, endFreq: 35 });
    this.metal(0.6, 1.2, 0.01);
    // rattle
    for (let i = 0; i < 6; i++) this.noise(0.05, { type: 'bandpass', freq: 3000 + Math.random() * 2000, q: 4, gain: 0.25 / (i + 1), at: 0.08 + i * 0.05 });
  }

  shutterOpen() {
    if (!this.ctx) return;
    for (let i = 0; i < 14; i++) this.noise(0.04, { type: 'bandpass', freq: 1800 + Math.random() * 1500, q: 3, gain: 0.18, at: i * 0.045 });
    this.tone(90, 0.6, { gain: 0.15, type: 'sawtooth', endFreq: 140 });
    this.metal(0.12, 0.5, 0.6);
  }

  bang(intensity = 1) {
    if (!this.ctx) return;
    if (this.sample(Math.random() < 0.5 ? 'bang1' : 'bang2', { gain: 1.3 * intensity, rate: 0.9 + Math.random() * 0.2 })) return;
    this.tone(85, 0.35, { gain: 0.9 * intensity, endFreq: 38 });
    this.noise(0.25, { freq: 900, gain: 0.7 * intensity });
    this.metal(0.35 * intensity, 0.7);
    for (let i = 0; i < 4; i++) this.noise(0.04, { type: 'bandpass', freq: 2500 + Math.random() * 3000, q: 5, gain: 0.2 * intensity, at: 0.04 + i * 0.04 });
  }

  knock() {
    if (!this.ctx) return;
    if (this.sample('knock', { gain: 0.9 })) return;
    for (let i = 0; i < 3; i++) { this.tone(180, 0.12, { gain: 0.4, endFreq: 90, at: i * 0.22 }); this.noise(0.06, { freq: 2000, gain: 0.25, at: i * 0.22 }); }
  }

  scream(dur = 1.6, pitch = 1, gain = 0.55) {
    if (!this.ctx) return;
    if (gain >= 0.2 && this.sample(Math.random() < 0.5 ? 'scream1' : 'scream2', { gain: gain * 2, rate: pitch })) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(gain, t + 0.08);
    out.gain.setValueAtTime(gain, t + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const sh = ctx.createWaveShaper(); sh.curve = this.curve(1);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1100 * pitch; f1.Q.value = 2;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2700 * pitch; f2.Q.value = 3;
    sh.connect(f1); sh.connect(f2); f1.connect(out); f2.connect(out);
    out.connect(this.sfx); out.connect(this.revSend);
    const base = 320 * pitch;
    [1, 1.013, 0.987, 1.5].forEach((m, i) => {
      const o = ctx.createOscillator(); o.type = i === 3 ? 'square' : 'sawtooth';
      o.frequency.setValueAtTime(base * m, t);
      o.frequency.exponentialRampToValueAtTime(base * m * 2.6, t + dur * 0.25);
      o.frequency.exponentialRampToValueAtTime(base * m * 1.7, t + dur);
      const vib = ctx.createOscillator(); vib.frequency.value = 7 + Math.random() * 6;
      const vg = ctx.createGain(); vg.gain.value = 40 * pitch; vib.connect(vg); vg.connect(o.frequency);
      const g = ctx.createGain(); g.gain.value = i === 3 ? 0.15 : 0.35;
      o.connect(g); g.connect(sh);
      o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
    });
    this.noise(dur, { type: 'bandpass', freq: 3000, q: 0.8, gain: 0.35 * gain, attack: 0.05, dest: out });
  }

  growl(dur = 1.5, gain = 0.4) {
    if (!this.ctx) return;
    if (this.sample('growl', { gain: gain * 2.4, rate: 0.85 + Math.random() * 0.2 })) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 62;
    const am = ctx.createOscillator(); am.frequency.value = 23;
    const amg = ctx.createGain(); amg.gain.value = 0.5; am.connect(amg);
    const g = ctx.createGain(); g.gain.value = 0;
    amg.connect(g.gain);
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(gain, t + 0.3); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.frequency.value = 500;
    const sh = ctx.createWaveShaper(); sh.curve = this.curve(0.8);
    o.connect(g); g.connect(sh); sh.connect(lp); lp.connect(env); env.connect(this.sfx); env.connect(this.revSend);
    o.start(t); am.start(t); o.stop(t + dur); am.stop(t + dur);
  }

  footstep(gain = 0.25) {
    if (!this.ctx) return;
    this.noise(0.12, { freq: 380 + Math.random() * 200, gain, attack: 0.002 });
    this.noise(0.05, { type: 'highpass', freq: 3000, gain: gain * 0.25, attack: 0.001 });
  }

  buzz() { if (!this.ctx) return; if (this.sample('buzzer', { gain: 0.6, rev: 0 })) return; this.tone(110, 0.7, { type: 'square', gain: 0.12 }); this.tone(220, 0.7, { type: 'square', gain: 0.05 }); }
  click() { if (!this.ctx) return; this.tone(1800, 0.04, { type: 'square', gain: 0.05 }); }
  paper() { if (!this.ctx) return; this.noise(0.25, { type: 'highpass', freq: 2500, gain: 0.18, attack: 0.05 }); }
  thud() { if (!this.ctx) return; this.tone(55, 0.6, { gain: 0.5, endFreq: 30 }); }
  static(dur = 0.4) { if (!this.ctx) return; this.noise(dur, { type: 'highpass', freq: 1500, gain: 0.15 }); }

  stinger() {
    if (!this.ctx) return;
    [110, 116.5, 155.6, 233, 246.9].forEach(f => this.tone(f, 3, { type: 'sawtooth', gain: 0.05, attack: 0.6 }));
    this.noise(2.5, { type: 'bandpass', freq: 600, gain: 0.1, attack: 1 });
  }

  // ---------- lobby music: the piano track slowed, muffled and drowned in reverb over a low drone
  async menuMusic(on, track = this.menuTrack || 'menu') {
    this.menuTrack = track;
    if (!this.ctx) return;
    this.initRadio();
    if (!this.menuOut) {
      const ctx = this.ctx;
      this.menuOut = ctx.createGain(); this.menuOut.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      this.menuIn = ctx.createGain(); this.menuIn.connect(lp); lp.connect(this.menuOut);
      const wet = ctx.createGain(); wet.gain.value = 0.9; lp.connect(wet); wet.connect(this.revSend);
      this.menuOut.connect(this.master);
      this.menuLp = lp; this.menuWet = wet; this.menuDrone = ctx.createGain(); this.menuDrone.connect(this.menuOut);
      [41.2, 61.7, 82.4].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.05 / (i + 1); o.connect(g); g.connect(this.menuDrone); o.start(); });
    }
    const happy = track === 'menu2';
    if (this.menuLp) { this.menuLp.frequency.value = happy ? 16000 : 1600; this.menuWet.gain.value = happy ? 0.15 : 0.9; this.menuDrone.gain.value = happy ? 0 : 1; }
    if (on && !this.menuSrc) {
      const b = (await this.radioBuf(track)) || (await this.radioBuf('menu')) || (await this.radioBuf('classical'));
      if (!b || this.menuSrc) return;
      const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = true; s.playbackRate.value = b === (await this.radioBuf('classical')) ? 0.8 : 1;
      s.connect(this.menuIn); s.start(); this.menuSrc = s;
    }
    this.menuOut.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, on ? 1.2 : 0.4);
    if (!on && this.menuSrc) { const s = this.menuSrc; this.menuSrc = null; setTimeout(() => { try { s.stop(); } catch (e) {} }, 2000); }
  }

  // ---------- booth radio
  initRadio() {
    if (this.radioOut || !this.ctx) return;
    const ctx = this.ctx;
    this.radioOut = ctx.createGain(); this.radioOut.gain.value = 0;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const sh = ctx.createWaveShaper(); sh.curve = this.curve(0.06);
    this.radioIn = ctx.createGain(); this.radioIn.connect(hp); hp.connect(lp); lp.connect(sh); sh.connect(this.radioOut);
    const send = ctx.createGain(); send.gain.value = 0.08; this.radioOut.connect(send); send.connect(this.revSend);
    this.radioOut.connect(this.master);
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2800;
    this.radioHiss = ctx.createGain(); this.radioHiss.gain.value = 0.01; n.connect(nf); nf.connect(this.radioHiss); this.radioHiss.connect(this.radioOut); n.start();
    this.radioBufs = new Map();
  }
  radioBuf(name) {
    if (!this.radioBufs.has(name)) this.radioBufs.set(name, fetch(`radio/${name}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => this.ctx.decodeAudioData(b)).catch(() => null));
    return this.radioBufs.get(name);
  }
  stopRadioSrc() { if (this.radioSrc) { try { this.radioSrc.stop(); } catch (e) {} this.radioSrc = null; } }
  async radioTune(ch, creepy = () => false) {
    if (!this.ctx) return;
    this.initRadio();
    const tok = this.radioToken = (this.radioToken || 0) + 1;
    this.stopRadioSrc();
    this.noise(0.4, { type: 'bandpass', freq: 2200, q: 0.6, gain: 0.5, dest: this.radioIn });
    if (!ch) return;
    if (ch.file) {
      const b = await this.radioBuf(ch.file);
      if (tok !== this.radioToken || !b) return;
      const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(this.radioIn);
      s.start(this.ctx.currentTime + 0.35, Math.random() * b.duration * 0.8); this.radioSrc = s;
    } else if (ch.news) {
      let i = 0;
      while (tok === this.radioToken) {
        const numbers = creepy() && i > 0 && Math.random() < 0.3;
        const b = i % 7 === 0 ? await this.radioBuf('jingle') : await this.loadBuffer(numbers ? 'radio_numbers' : `radio_news_${(i - 1) % 7 % 6}`).catch(() => null);
        if (tok !== this.radioToken) return;
        if (b) {
          const s = this.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = numbers ? 0.9 : 1;
          if (numbers) { const w = this.ctx.createWaveShaper(); w.curve = this.curve(0.6); s.connect(w); w.connect(this.radioIn); } else s.connect(this.radioIn);
          this.radioSrc = s; s.start();
          await new Promise(r => { s.onended = r; });
        }
        if (tok !== this.radioToken) return;
        await new Promise(r => setTimeout(r, 900 + Math.random() * 1500));
        i++;
      }
    }
  }
  radioLevel(v) { if (this.radioOut) this.radioOut.gain.setTargetAtTime(v, this.ctx.currentTime, 0.12); }

  thunder() {
    if (!this.ctx) return;
    this.noise(4.0, { type: 'lowpass', freq: 160, gain: 0.7, attack: 0.25, dest: this.amb });
    this.noise(1.4, { type: 'lowpass', freq: 700, gain: 0.25, attack: 0.03 });
    this.tone(42, 3.0, { gain: 0.35, endFreq: 28, attack: 0.3 });
    for (let i = 0; i < 5; i++) this.noise(0.3, { type: 'bandpass', freq: 300 + Math.random() * 400, q: 0.7, gain: 0.12, at: 0.1 + Math.random() * 1.5 });
  }

  heartbeat() {
    if (!this.ctx) return;
    this.tone(60, 0.18, { gain: 0.6, endFreq: 40 });
    this.tone(55, 0.2, { gain: 0.45, endFreq: 35, at: 0.22 });
  }

  startAmbience() {
    if (!this.ctx || this.ambOn) return;
    this.ambOn = true;
    const ctx = this.ctx, t = ctx.currentTime;
    const loopNoise = (type, freq, q, gain) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      s.connect(f); f.connect(g); g.connect(this.amb); s.start(t);
      return { f, g };
    };
    // rain on roof
    loopNoise('bandpass', 1400, 0.6, 0.07);
    loopNoise('highpass', 5000, 0.5, 0.025);
    // wind with slow LFO
    const w = loopNoise('lowpass', 420, 1.5, 0.08);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(w.f.frequency); lfo.start(t);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.05;
    const lg2 = ctx.createGain(); lg2.gain.value = 0.05; lfo2.connect(lg2); lg2.connect(w.g.gain); lfo2.start(t);
    // fluorescent hum
    this.hum = ctx.createGain(); this.hum.gain.value = 0.012; this.hum.connect(this.amb);
    [60, 120, 180].forEach((f, i) => { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 1 / (i + 1); o.connect(g); g.connect(this.hum); o.start(t); });
    // drone
    this.drone = ctx.createGain(); this.drone.gain.value = 0.035;
    const dl = ctx.createBiquadFilter(); dl.frequency.value = 180; dl.connect(this.drone); this.drone.connect(this.amb);
    [55, 55.4, 82.4].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(dl); o.start(t); });
  }

  setTension(x) { if (this.drone) this.drone.gain.setTargetAtTime(0.035 + x * 0.12, this.ctx.currentTime, 0.8); }
}
