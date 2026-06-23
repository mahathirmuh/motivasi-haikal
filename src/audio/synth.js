// Procedural audio — synthesizes small WAV clips as data URIs so the game ships
// with sound and zero external audio files. Howler then plays these URIs.
// (Drop real .mp3/.ogg into /public/assets/audio and wire them in AudioManager
//  if you prefer authored sound later.)

const SR = 44100;

function bufToBase64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function encodeWav(samples, sampleRate = SR) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return 'data:audio/wav;base64,' + bufToBase64(buffer);
}

function wave(type, phase) {
  switch (type) {
    case 'sine':
      return Math.sin(phase);
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'saw':
      return (((phase / (2 * Math.PI)) % 1) * 2) - 1;
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    default:
      return Math.sin(phase);
  }
}

function env(t, dur, a = 0.01, d = 0.05, s = 0.7, r = 0.08) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

/** Render a set of notes into a mono Float32 buffer. */
function render(notes, duration) {
  const n = Math.ceil(duration * SR);
  const out = new Float32Array(n);
  for (const note of notes) {
    const {
      freq,
      start = 0,
      dur,
      gain = 0.3,
      type = 'sine',
      a = 0.01,
      d = 0.06,
      s = 0.7,
      r = 0.1,
      vibrato = 0,
    } = note;
    const i0 = Math.floor(start * SR);
    const i1 = Math.min(n, Math.floor((start + dur) * SR));
    let phase = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const f = freq * (1 + (vibrato ? Math.sin(t * 2 * Math.PI * 5) * vibrato : 0));
      phase += (2 * Math.PI * f) / SR;
      out[i] += wave(type, phase) * env(t, dur, a, d, s, r) * gain;
    }
  }
  return out;
}

function renderNoise(duration, shape) {
  const n = Math.ceil(duration * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (Math.random() * 2 - 1) * shape(t);
  }
  return out;
}

function mix(...buffers) {
  const n = Math.max(...buffers.map((b) => b.length));
  const out = new Float32Array(n);
  for (const b of buffers) for (let i = 0; i < b.length; i++) out[i] += b[i];
  return out;
}

// ---------------- SFX ----------------

export function sfxClick() {
  return encodeWav(
    render([{ freq: 720, start: 0, dur: 0.08, type: 'sine', gain: 0.35, a: 0.002, d: 0.02, s: 0.3, r: 0.05 }], 0.1)
  );
}

export function sfxStep() {
  const thud = render([{ freq: 120, dur: 0.1, type: 'sine', gain: 0.4, a: 0.002, d: 0.04, s: 0.2, r: 0.05 }], 0.12);
  const dirt = renderNoise(0.07, (t) => Math.max(0, 0.18 * (1 - t / 0.07)));
  return encodeWav(mix(thud, dirt));
}

export function sfxWater() {
  // splashy filtered noise with a soft swell
  const splash = renderNoise(0.4, (t) => 0.25 * Math.sin(Math.min(Math.PI, (t / 0.4) * Math.PI)));
  const drops = render(
    [
      { freq: 900, start: 0.05, dur: 0.12, type: 'sine', gain: 0.12, a: 0.005, d: 0.05, s: 0.2, r: 0.06, vibrato: 0.05 },
      { freq: 1200, start: 0.18, dur: 0.12, type: 'sine', gain: 0.1, a: 0.005, d: 0.05, s: 0.2, r: 0.06, vibrato: 0.05 },
    ],
    0.42
  );
  return encodeWav(mix(splash, drops));
}

export function sfxDing() {
  return encodeWav(
    render(
      [
        { freq: 988, dur: 0.5, type: 'sine', gain: 0.3, a: 0.002, d: 0.1, s: 0.4, r: 0.35 },
        { freq: 1319, start: 0.04, dur: 0.5, type: 'sine', gain: 0.2, a: 0.002, d: 0.1, s: 0.3, r: 0.35 },
        { freq: 1976, start: 0.04, dur: 0.4, type: 'sine', gain: 0.08, a: 0.002, d: 0.1, s: 0.2, r: 0.28 },
      ],
      0.6
    )
  );
}

export function sfxThunder() {
  const dur = 1.0;
  const n = Math.ceil(dur * SR);
  const out = new Float32Array(n);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    lp += (w - lp) * 0.04;
    lp2 += (lp - lp2) * 0.06; // deep low-passed rumble
    const env = Math.min(1, t / 0.015) * Math.exp(-t * 3.0);
    const crack = Math.sin(2 * Math.PI * 60 * t) * 0.12 * Math.exp(-t * 6);
    out[i] = (lp2 * 0.9 + crack) * env;
  }
  return encodeWav(out);
}

export function sfxRoar() {
  // a low, descending monster growl: integrated falling pitch + harmonics, a
  // growly amplitude flutter, and a layer of low-passed noise for grit.
  const dur = 0.8;
  const n = Math.ceil(dur * SR);
  const out = new Float32Array(n);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 150 - 85 * (t / dur); // 150 -> ~65 Hz
    phase += (2 * Math.PI * f) / SR;
    const tone = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.28 * Math.sin(3 * phase);
    const w = Math.random() * 2 - 1;
    lp += (w - lp) * 0.05; // grit
    const growl = 1 + 0.45 * Math.sin(2 * Math.PI * 24 * t); // throaty flutter
    const envv = Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.22);
    out[i] = (tone * 0.17 + lp * 0.3) * growl * envv;
  }
  return encodeWav(out);
}

export function sfxJump() {
  // quick low->high "boing"
  return encodeWav(
    render(
      [
        { freq: 440, start: 0, dur: 0.07, type: 'triangle', gain: 0.32, a: 0.004, d: 0.03, s: 0.4, r: 0.04 },
        { freq: 720, start: 0.05, dur: 0.12, type: 'triangle', gain: 0.28, a: 0.004, d: 0.05, s: 0.3, r: 0.07, vibrato: 0.05 },
      ],
      0.2
    )
  );
}

export function sfxPop() {
  return encodeWav(
    render([{ freq: 420, dur: 0.14, type: 'triangle', gain: 0.32, a: 0.004, d: 0.05, s: 0.3, r: 0.08, vibrato: 0.2 }], 0.16)
  );
}

// ---------------- Ambiance ----------------
// Calming sea: slow wave swells (low-passed brown-ish noise shaped by sine
// envelopes) layered with a soft wind hiss. ~8s seamless-ish loop.

export function ambianceLoop() {
  const dur = 8;
  const n = Math.ceil(dur * SR);
  const out = new Float32Array(n);
  let lpWind = 0;
  let lpWave = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const white = Math.random() * 2 - 1;
    lpWind += (white - lpWind) * 0.06; // wind: gentle high-ish hiss
    lpWave += (white - lpWave) * 0.012; // waves: deeper rumble
    // two wave swells per loop (integer cycles => continuous across the seam)
    const sw1 = 0.5 + 0.5 * Math.sin((2 * Math.PI * 2 * t) / dur - 0.6);
    const sw2 = 0.5 + 0.5 * Math.sin((2 * Math.PI * 3 * t) / dur + 1.2);
    const waves = lpWave * (0.22 * sw1 + 0.13 * sw2);
    const wind = lpWind * 0.05;
    out[i] = waves + wind;
  }
  // tiny edge taper to soften the loop seam
  const fade = Math.floor(0.02 * SR);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[i] *= g;
    out[n - 1 - i] *= g;
  }
  return encodeWav(out);
}

// ---------------- Music ----------------
// A warm I–V–vi–IV tune in C major: soft pad + bass + a lead melody. ~16s loop.

const NOTE_SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function noteFreq(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  const midi = NOTE_SEMI[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function musicLoop() {
  const beat = 0.5;
  const bar = beat * 4;
  const bars = 8;
  const total = bar * bars;
  const F = noteFreq;
  const chords = [
    ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'],
    ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'],
  ];
  const bass = ['C3', 'G2', 'A2', 'F2', 'C3', 'G2', 'A2', 'F2'];
  const notes = [];
  for (let b = 0; b < bars; b++) {
    const start = b * bar;
    for (const c of chords[b]) {
      notes.push({ freq: F(c), start, dur: bar, type: 'triangle', gain: 0.045, a: 0.5, d: 0.3, s: 0.7, r: 0.5 });
    }
    notes.push({ freq: F(bass[b]), start, dur: bar * 0.5, type: 'sine', gain: 0.13, a: 0.01, d: 0.2, s: 0.5, r: 0.2 });
    notes.push({ freq: F(bass[b]), start: start + bar * 0.5, dur: bar * 0.5, type: 'sine', gain: 0.11, a: 0.01, d: 0.2, s: 0.5, r: 0.2 });
  }
  // lead melody as [note, beats]
  const mel = [
    ['E4', 1], ['G4', 1], ['C5', 1], ['G4', 1],
    ['D4', 1], ['G4', 1], ['B4', 2],
    ['C5', 1], ['A4', 1], ['E4', 2],
    ['F4', 1], ['A4', 1], ['C5', 2],
    ['G4', 1], ['E4', 1], ['C4', 1], ['E4', 1],
    ['D4', 2], ['G4', 2],
    ['E4', 1], ['A4', 1], ['C5', 1], ['B4', 1],
    ['A4', 1], ['G4', 1], ['E4', 2],
  ];
  let t = 0;
  for (const [nm, d] of mel) {
    const dur = d * beat;
    notes.push({ freq: F(nm), start: t, dur: dur * 0.92, type: 'sine', gain: 0.12, a: 0.01, d: 0.12, s: 0.3, r: 0.18, vibrato: 0.004 });
    t += dur;
  }
  const buf = render(notes, total);
  const fade = Math.floor(0.012 * SR);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
  return encodeWav(buf);
}
