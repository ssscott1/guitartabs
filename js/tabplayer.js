/* tabplayer.js — renders a song as an interactive tab and plays it back.
 *
 * Features: play/pause, tempo slider, loop, metronome, count-in,
 * speed-trainer hook, and a play-along mode where the *user* supplies
 * the notes by tapping in time.
 */

class TabPlayer {
  /* opts:
   *   loop, metronome   — initial toggle states
   *   showLoop, showMetronome, showTempo — hide controls if false
   *   playAlong         — start in play-along mode (toggleable via setPlayAlong)
   *   onLoopRepeat(player) — called each time a loop wraps (speed trainer)
   *   onPlayAlongEnd(results) — called with {points,max,perfect,good,miss}
   *   onPlayStateChange(isPlaying)
   */
  constructor(container, song, opts = {}) {
    this.el = typeof container === 'string' ? document.querySelector(container) : container;
    this.opts = opts;
    this.tempoPct = 100;
    this.playing = false;
    this.playAlong = !!opts.playAlong;
    this._raf = null;
    this._sources = [];
    this._curCol = -1;
    this.setSong(song);
  }

  setSong(song) {
    this.stop();
    this.song = song;
    this.totalBeats = 0;
    for (const n of song.notes) this.totalBeats = Math.max(this.totalBeats, n.t + n.d);
    // round total up to a whole bar so loops feel natural
    const bpb = song.beatsPerBar;
    this.totalBeats = Math.ceil(this.totalBeats / bpb) * bpb;
    // group notes that start together (chords count as one tap target)
    const byTime = new Map();
    for (const n of song.notes) {
      const key = Math.round(n.t * 1000);
      if (!byTime.has(key)) byTime.set(key, { t: n.t, notes: [] });
      byTime.get(key).notes.push(n);
    }
    this.groups = [...byTime.values()].sort((a, b) => a.t - b.t);
    this.render();
  }

  bpm() { return Math.round(this.song.tempo * this.tempoPct / 100); }

  /* ── rendering ─────────────────────────────────────────────── */

  render() {
    this.el.classList.add('tabplayer');
    this.el.innerHTML = '';
    this.el.appendChild(this._buildControls());
    if (this.opts.view === 'chords' && this.song.labels && this.song.labels.length) {
      this._renderChordView();
    } else {
      this._renderTabView();
    }
  }

  /* Chord-chart view (Chords track): one chart per chord change with a
   * strum dot for every beat, instead of the six-line tab grid. */
  _renderChordView() {
    const scroller = document.createElement('div');
    scroller.className = 'tab-scroll chord-strip';
    const strip = document.createElement('div');
    strip.className = 'cs-row';
    scroller.appendChild(strip);
    this.el.appendChild(scroller);
    this.scroller = scroller;

    const res = this.song.res || 1;
    const bpb = this.song.beatsPerBar;
    const labels = this.song.labels;
    this.cols = [];

    for (let i = 0; i < labels.length; i++) {
      const start = labels[i].t;
      const end = i + 1 < labels.length ? labels[i + 1].t : this.totalBeats;

      const block = document.createElement('div');
      block.className = 'cs-block';
      const holder = document.createElement('div');
      block.appendChild(holder);
      new GuitarChords.ChordDiagram(holder, labels[i].name, { hint: false });

      const dots = document.createElement('div');
      dots.className = 'cs-dots';
      for (const g of this.groups) {
        if (g.t < start || g.t >= end) continue;
        const dot = document.createElement('span');
        dot.className = 'cs-dot';
        dot.textContent = String(Math.floor(g.t) % bpb + 1);
        dot._block = block;
        dots.appendChild(dot);
        this.cols[Math.round(g.t / res)] = dot;
      }
      block.appendChild(dots);
      strip.appendChild(block);
    }
  }

  _renderTabView() {
    const scroller = document.createElement('div');
    scroller.className = 'tab-scroll';
    const grid = document.createElement('div');
    grid.className = 'tab-grid';
    scroller.appendChild(grid);
    this.el.appendChild(scroller);
    this.scroller = scroller;

    const res = this.song.res || 0.5;
    const bpb = this.song.beatsPerBar;
    const nCols = Math.round(this.totalBeats / res);

    // optional chord-name labels row (used by the Chords track)
    this.hasLabels = !!(this.song.labels && this.song.labels.length);
    const labelAt = new Map();
    if (this.hasLabels) {
      for (const l of this.song.labels) labelAt.set(Math.round(l.t / res), l.name);
    }

    // legend column: beat header + string names
    const legend = document.createElement('div');
    legend.className = 'tab-col tab-legend';
    if (this.hasLabels) legend.appendChild(this._cell('tab-chordname', ''));
    legend.appendChild(this._cell('tab-beat', ''));
    for (const name of GuitarAudio.STRING_NAMES) legend.appendChild(this._cell('tab-cell tab-name', name));
    grid.appendChild(legend);
    grid.appendChild(this._barline());

    // map: column index -> notes starting there
    const colNotes = new Map();
    for (const n of this.song.notes) {
      const c = Math.round(n.t / res);
      if (!colNotes.has(c)) colNotes.set(c, []);
      colNotes.get(c).push(n);
    }

    this.cols = [];
    for (let c = 0; c < nCols; c++) {
      const beat = c * res;
      const col = document.createElement('div');
      col.className = 'tab-col';
      if (this.hasLabels) col.appendChild(this._cell('tab-chordname', labelAt.get(c) || ''));
      const beatCell = this._cell('tab-beat', Number.isInteger(beat) ? String((beat % bpb) + 1) : '');
      if (beat % bpb === 0) beatCell.classList.add('tab-beat-one');
      col.appendChild(beatCell);

      const here = colNotes.get(c) || [];
      for (let s = 0; s < 6; s++) {
        const note = here.find(n => n.s === s);
        const cell = this._cell('tab-cell', note ? String(note.f) : '—');
        if (note) {
          cell.classList.add('tab-note');
          cell.addEventListener('click', () => {
            GuitarAudio.pluck(note.s, note.f);
            cell.classList.add('plucked');
            setTimeout(() => cell.classList.remove('plucked'), 300);
          });
        }
        col.appendChild(cell);
      }
      grid.appendChild(col);
      this.cols.push(col);
      if ((beat + res) % bpb === 0) grid.appendChild(this._barline());
    }
  }

  _cell(cls, text) {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    return d;
  }

  _barline() {
    const col = document.createElement('div');
    col.className = 'tab-col tab-bar';
    if (this.hasLabels) col.appendChild(this._cell('tab-chordname', ''));
    col.appendChild(this._cell('tab-beat', ''));
    for (let s = 0; s < 6; s++) col.appendChild(this._cell('tab-cell', '|'));
    return col;
  }

  _buildControls() {
    const o = this.opts;
    const bar = document.createElement('div');
    bar.className = 'tp-controls';

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn btn-play';
    this.playBtn.innerHTML = '▶ <span>Play</span>';
    this.playBtn.addEventListener('click', () => this.playing ? this.stop() : this.play());
    bar.appendChild(this.playBtn);

    this.status = document.createElement('span');
    this.status.className = 'tp-status';
    bar.appendChild(this.status);

    if (o.showTempo !== false) {
      const wrap = document.createElement('label');
      wrap.className = 'tp-tempo';
      const label = document.createElement('span');
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 50; slider.max = 120; slider.value = 100; slider.step = 5;
      const update = () => { label.textContent = `🐢 ${this.bpm()} bpm 🐇`; };
      slider.addEventListener('input', () => {
        this.tempoPct = +slider.value;
        update();
        if (this.playing) { this.stop(); this.play(); }
      });
      this.tempoSlider = slider;
      update();
      wrap.appendChild(slider);
      wrap.appendChild(label);
      bar.appendChild(wrap);
    }

    if (o.showLoop !== false) {
      this.loopBox = this._toggle(bar, '🔁 Loop', !!o.loop);
    }
    if (o.showMetronome !== false) {
      this.metroBox = this._toggle(bar, '🥁 Beat', !!o.metronome);
    }
    return bar;
  }

  _toggle(bar, text, checked) {
    const label = document.createElement('label');
    label.className = 'tp-toggle';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = checked;
    label.appendChild(box);
    label.appendChild(document.createTextNode(' ' + text));
    bar.appendChild(label);
    return box;
  }

  setTempoPct(pct) {
    this.tempoPct = Math.max(50, Math.min(120, pct));
    if (this.tempoSlider) {
      this.tempoSlider.value = this.tempoPct;
      this.tempoSlider.dispatchEvent(new Event('input'));
    }
  }

  setPlayAlong(on) {
    this.stop();
    this.playAlong = on;
  }

  /* ── playback ──────────────────────────────────────────────── */

  play() {
    this.stop();
    const ctx = GuitarAudio.ensure();
    this.bus = ctx.createGain();
    this.bus.connect(GuitarAudio.master);

    const spb = 60 / this.bpm();
    const bpb = this.song.beatsPerBar;
    const countIn = this.playAlong ? bpb : 0;
    const start = ctx.currentTime + 0.15;
    this.noteStart = start + countIn * spb;
    this.spb = spb;
    this.countIn = countIn;

    // count-in ticks (play-along only)
    for (let b = 0; b < countIn; b++) {
      this._sources.push(GuitarAudio.tick(start + b * spb, b === 0, this.bus));
    }
    // metronome through the piece
    if ((this.metroBox && this.metroBox.checked) || this.playAlong) {
      for (let b = 0; b < this.totalBeats; b++) {
        this._sources.push(GuitarAudio.tick(this.noteStart + b * spb, b % bpb === 0, this.bus));
      }
    }
    // the notes themselves (listen mode only — in play-along, YOU play them)
    if (!this.playAlong) {
      for (const g of this.groups) {
        const accent = Number.isInteger(g.t / bpb) ? 1 : 0.85;
        this._strumGroup(g, this.noteStart + g.t * spb, accent);
      }
    } else {
      // reset scoring state
      for (const g of this.groups) { g.hit = false; g.judged = false; }
      this.paStats = { points: 0, max: this.groups.length * 2, perfect: 0, good: 0, miss: 0, combo: 0 };
      this._missPtr = 0;
    }

    this.playing = true;
    this.playBtn.classList.add('playing');
    this.playBtn.innerHTML = '⏸ <span>Stop</span>';
    if (this.opts.onPlayStateChange) this.opts.onPlayStateChange(true);
    this._tickFrame();
  }

  _tickFrame() {
    const ctx = GuitarAudio.ctx;
    const beat = (ctx.currentTime - this.noteStart) / this.spb;

    if (beat < 0) {
      this.status.textContent = `count-in… ${Math.ceil(-beat)}`;
      this._setCol(-1);
    } else if (beat < this.totalBeats) {
      this.status.textContent = '';
      const res = this.song.res || 0.5;
      this._setCol(Math.floor(beat / res));
      if (this.playAlong) this._judgeMisses(beat);
    } else {
      // reached the end
      if (this.playAlong) {
        this._judgeMisses(this.totalBeats + 1);
        const stats = this.paStats;
        this.stop();
        if (this.opts.onPlayAlongEnd) this.opts.onPlayAlongEnd(stats);
        return;
      }
      if (this.loopBox && this.loopBox.checked) {
        this.stop();
        if (this.opts.onLoopRepeat) this.opts.onLoopRepeat(this);
        this.play();
        return;
      }
      this.stop();
      return;
    }
    this._raf = requestAnimationFrame(() => this._tickFrame());
  }

  _setCol(c) {
    if (c === this._curCol) return;
    const prev = this._curCol >= 0 ? this.cols[this._curCol] : null;
    if (prev) {
      prev.classList.remove('playing');
      if (prev._block) prev._block.classList.remove('playing');
    }
    this._curCol = c;
    const cur = c >= 0 ? this.cols[c] : null;
    if (cur) {
      cur.classList.add('playing');
      if (cur._block) cur._block.classList.add('playing');
      const anchor = cur._block || cur;
      const target = anchor.offsetLeft - this.scroller.clientWidth / 2 + anchor.clientWidth / 2;
      this.scroller.scrollLeft = Math.max(0, target);
    }
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    for (const s of this._sources) { try { s.stop(); } catch (e) { /* already stopped */ } }
    this._sources = [];
    if (this.bus) { try { this.bus.disconnect(); } catch (e) {} this.bus = null; }
    this.playing = false;
    this._setCol(-1);
    if (this.playBtn) {
      this.playBtn.classList.remove('playing');
      this.playBtn.innerHTML = '▶ <span>Play</span>';
    }
    if (this.status) this.status.textContent = '';
    if (this.opts.onPlayStateChange) this.opts.onPlayStateChange(false);
  }

  /* ── play-along scoring ────────────────────────────────────── */

  /* User tapped (spacebar / tap pad). Find the nearest note group,
   * sound it, and judge the timing. */
  tap() {
    if (!this.playing || !this.playAlong) return;
    const ctx = GuitarAudio.ctx;
    const beat = (ctx.currentTime - this.noteStart) / this.spb;
    if (beat < -0.25) return; // still counting in

    let best = null, bestDist = Infinity;
    for (const g of this.groups) {
      const dist = Math.abs(g.t - beat);
      if (dist < bestDist) { bestDist = dist; best = g; }
    }
    if (!best) return;

    // always make sound — tapping should feel musical even when late
    this._strumGroup(best, 0, 0.9);

    if (best.judged) return { grade: 'again' };
    const deltaSec = Math.abs(best.t - beat) * this.spb;
    let grade;
    if (deltaSec <= 0.1) grade = 'perfect';
    else if (deltaSec <= 0.22) grade = 'good';
    else grade = 'miss';

    best.judged = true;
    best.hit = grade !== 'miss';
    const st = this.paStats;
    if (grade === 'perfect') { st.points += 2; st.perfect++; st.combo++; }
    else if (grade === 'good') { st.points += 1; st.good++; st.combo++; }
    else { st.miss++; st.combo = 0; }
    this._markGroup(best, grade);
    return { grade, stats: st };
  }

  /* Sweep past groups whose window has closed without a tap. */
  _judgeMisses(beat) {
    while (this._missPtr < this.groups.length) {
      const g = this.groups[this._missPtr];
      if (g.t + 0.45 > beat) break;
      if (!g.judged) {
        g.judged = true;
        g.hit = false;
        this.paStats.miss++;
        this.paStats.combo = 0;
        this._markGroup(g, 'miss');
        if (this.opts.onMiss) this.opts.onMiss(this.paStats);
      }
      this._missPtr++;
    }
  }

  /* Play a note group. Single notes pluck; chords get a low-to-high
   * strum stagger so they sound like a real downstrum. */
  _strumGroup(group, when, vel) {
    const base = Math.max(when, GuitarAudio.ctx.currentTime);
    const sorted = [...group.notes].sort((a, b) => b.s - a.s);
    sorted.forEach((n, i) => {
      this._sources.push(
        GuitarAudio.pluck(n.s, n.f, base + i * 0.014, Math.max(0.3, vel - i * 0.03), this.bus));
    });
  }

  _markGroup(group, grade) {
    const res = this.song.res || 0.5;
    const col = this.cols[Math.round(group.t / res)];
    if (!col) return;
    col.classList.remove('hit-perfect', 'hit-good', 'hit-miss');
    col.classList.add('hit-' + grade);
  }
}
