/* audio.js — tiny guitar synth built on the Web Audio API.
 * Uses the Karplus-Strong plucked-string algorithm, so the whole site
 * makes real guitar-ish sound with zero audio files. */

const GuitarAudio = (() => {
  // Open-string frequencies, index 0 = high e (top tab line) … 5 = low E.
  const OPEN_FREQS = [329.63, 246.94, 196.0, 146.83, 110.0, 82.41];
  const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

  let ctx = null;
  let master = null;
  const bufferCache = new Map();

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function freqOf(string, fret) {
    return OPEN_FREQS[string] * Math.pow(2, fret / 12);
  }

  function noteName(string, fret) {
    return NOTE_NAMES[(OPEN_MIDI[string] + fret) % 12];
  }

  // Karplus-Strong: a burst of noise fed through a short averaging delay
  // line turns into a surprisingly convincing plucked string.
  function pluckBuffer(freq) {
    const key = Math.round(freq * 10);
    if (bufferCache.has(key)) return bufferCache.get(key);

    const sr = ctx.sampleRate;
    const N = Math.max(2, Math.round(sr / freq));
    const seconds = 1.8;
    const length = Math.floor(sr * seconds);
    const buffer = ctx.createBuffer(1, length, sr);
    const out = buffer.getChannelData(0);

    const delay = new Float32Array(N);
    for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;
    // soften the initial burst a touch for a warmer attack
    for (let i = 1; i < N; i++) delay[i] = (delay[i] + delay[i - 1]) * 0.5;

    let ptr = 0;
    for (let i = 0; i < length; i++) {
      const cur = delay[ptr];
      const next = delay[(ptr + 1) % N];
      out[i] = cur;
      delay[ptr] = 0.996 * 0.5 * (cur + next);
      ptr = (ptr + 1) % N;
    }
    // short fade-out so loops never click
    const fade = Math.floor(sr * 0.05);
    for (let i = 0; i < fade; i++) out[length - 1 - i] *= i / fade;

    bufferCache.set(key, buffer);
    return buffer;
  }

  /* Play one plucked note.
   * when: absolute AudioContext time (0 / past = now)
   * dest: optional node to route through (lets a player mute/stop itself) */
  function pluck(string, fret, when = 0, velocity = 0.9, dest = null) {
    ensure();
    const src = ctx.createBufferSource();
    src.buffer = pluckBuffer(freqOf(string, fret));
    const g = ctx.createGain();
    g.gain.value = velocity;
    src.connect(g);
    g.connect(dest || master);
    src.start(Math.max(when, ctx.currentTime));
    return src;
  }

  /* Short metronome tick. accent=true gives the higher "ONE" beep. */
  function tick(when = 0, accent = false, dest = null) {
    ensure();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1568 : 1046;
    const t = Math.max(when, ctx.currentTime);
    g.gain.setValueAtTime(accent ? 0.28 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(dest || master);
    osc.start(t);
    osc.stop(t + 0.08);
    return osc;
  }

  return {
    ensure,
    pluck,
    tick,
    freqOf,
    noteName,
    get ctx() { return ctx; },
    get master() { return master; },
    STRING_NAMES,
  };
})();
