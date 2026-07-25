/* chords.js — beginner chord shapes, a strum helper, and the clickable
 * chord-chart component used in the Chords track. */

const GuitarChords = (() => {
  /* frets[s]: fret for string s (0 = high e … 5 = low E); null = don't play.
   * fingers[s]: which fretting finger (1 = index … 4 = pinky). */
  const CHORDS = {
    Em: { frets: [0, 0, 0, 2, 2, 0],       fingers: [null, null, null, 3, 2, null] },
    E:  { frets: [0, 0, 1, 2, 2, 0],       fingers: [null, null, 1, 3, 2, null] },
    Am: { frets: [0, 1, 2, 2, 0, null],    fingers: [null, 1, 3, 2, null, null] },
    A:  { frets: [0, 2, 2, 2, 0, null],    fingers: [null, 3, 2, 1, null, null] },
    D:  { frets: [2, 3, 2, 0, null, null], fingers: [2, 3, 1, null, null, null] },
    Dm: { frets: [1, 3, 2, 0, null, null], fingers: [1, 3, 2, null, null, null] },
    C:  { frets: [0, 1, 0, 2, 3, null],    fingers: [null, 1, null, 2, 3, null] },
    G:  { frets: [3, 0, 0, 0, 2, 3],       fingers: [3, null, null, null, 1, 2] },
    E7: { frets: [0, 0, 1, 0, 2, 0],       fingers: [null, null, 1, null, 2, null] },
    A7: { frets: [0, 2, 0, 2, 0, null],    fingers: [null, 3, null, 2, null, null] },
  };
  const NAMES = Object.keys(CHORDS);

  /* Strum a chord: pluck each sounding string low-to-high with a small
   * stagger, like a real downstrum. */
  function strum(name, when = 0, dest = null, vel = 0.9) {
    const shape = CHORDS[name];
    const ctx = GuitarAudio.ensure();
    const base = Math.max(when, ctx.currentTime);
    let i = 0;
    for (let s = 5; s >= 0; s--) {
      if (shape.frets[s] == null) continue;
      GuitarAudio.pluck(s, shape.frets[s], base + i * 0.014, Math.max(0.3, vel - i * 0.03), dest);
      i++;
    }
  }

  /* A standard vertical chord chart (nut at the top, low E on the left —
   * the orientation every chord book uses). Click it to strum. */
  class ChordDiagram {
    constructor(container, name, opts = {}) {
      this.el = typeof container === 'string' ? document.querySelector(container) : container;
      this.opts = opts;
      this.setChord(name);
    }

    setChord(name) {
      this.name = name;
      this.render();
    }

    render() {
      const showName = this.opts.showName !== false;
      const chord = CHORDS[this.name];
      const nutY = showName ? 46 : 26;
      const rowH = 30;
      const bottomY = nutY + 4 * rowH;
      const xFor = s => 24 + (5 - s) * 24; // low E leftmost

      let svg = `<svg class="cd" viewBox="0 0 168 ${bottomY + 10}" role="img" aria-label="${this.name} chord chart">`;
      if (showName) svg += `<text class="cd-name" x="84" y="20" text-anchor="middle">${this.name}</text>`;

      // open / muted markers above the nut
      for (let s = 0; s < 6; s++) {
        const f = chord.frets[s];
        if (f === 0) svg += `<text class="cd-marker" x="${xFor(s)}" y="${nutY - 10}" text-anchor="middle">○</text>`;
        if (f === null) svg += `<text class="cd-marker cd-mute" x="${xFor(s)}" y="${nutY - 10}" text-anchor="middle">✕</text>`;
      }

      // nut, frets, strings
      svg += `<rect class="cd-nut" x="22" y="${nutY - 4}" width="124" height="5" rx="2"/>`;
      for (let i = 1; i <= 4; i++) {
        svg += `<line class="cd-fret" x1="24" y1="${nutY + i * rowH}" x2="144" y2="${nutY + i * rowH}"/>`;
      }
      for (let s = 0; s < 6; s++) {
        svg += `<line class="cd-string" x1="${xFor(s)}" y1="${nutY}" x2="${xFor(s)}" y2="${bottomY}" stroke-width="${1 + (s * 0.35)}"/>`;
      }

      // finger dots
      for (let s = 0; s < 6; s++) {
        const f = chord.frets[s];
        if (!f) continue;
        const cy = nutY + (f - 0.5) * rowH;
        svg += `<circle class="cd-dot" cx="${xFor(s)}" cy="${cy}" r="10.5"/>`;
        const finger = chord.fingers[s];
        if (finger) svg += `<text class="cd-finger" x="${xFor(s)}" y="${cy + 4.5}" text-anchor="middle">${finger}</text>`;
      }
      svg += '</svg>';

      this.el.classList.add('chord-card');
      this.el.innerHTML = svg + (this.opts.hint === false ? '' : '<div class="cd-hint">🔊 tap to strum</div>');
      this.el.onclick = () => {
        strum(this.name);
        this.el.classList.remove('strummed');
        void this.el.offsetWidth;
        this.el.classList.add('strummed');
        if (this.opts.onStrum) this.opts.onStrum(this.name);
      };
    }
  }

  return { CHORDS, NAMES, strum, ChordDiagram };
})();
