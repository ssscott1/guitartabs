/* fretboard.js — a clickable fretboard laid out the same way as a tab:
 * high e string on top, low E on the bottom. Click any position to hear it. */

class Fretboard {
  /* opts: frets (default 5), showNamesToggle (default true), onPlay(s, f) */
  constructor(container, opts = {}) {
    this.el = typeof container === 'string' ? document.querySelector(container) : container;
    this.frets = opts.frets || 5;
    this.opts = opts;
    this.cells = [];
    this.render();
  }

  render() {
    this.el.classList.add('fretboard-wrap');
    this.el.innerHTML = '';

    const board = document.createElement('div');
    board.className = 'fretboard';

    // header row: fret numbers
    const head = document.createElement('div');
    head.className = 'fb-row fb-head';
    head.appendChild(this._div('fb-label', ''));
    for (let f = 0; f <= this.frets; f++) {
      const c = this._div('fb-fretnum', f === 0 ? 'open' : String(f));
      if (f === 3 || f === 5 || f === 7 || f === 9) c.classList.add('fb-dot');
      head.appendChild(c);
    }
    board.appendChild(head);

    for (let s = 0; s < 6; s++) {
      const row = document.createElement('div');
      row.className = 'fb-row';
      row.appendChild(this._div('fb-label', GuitarAudio.STRING_NAMES[s]));
      this.cells[s] = [];
      for (let f = 0; f <= this.frets; f++) {
        const cell = this._div('fb-cell' + (f === 0 ? ' fb-open' : ''), '');
        cell.style.setProperty('--string-weight', `${1 + s * 0.6}px`);
        const btn = document.createElement('button');
        btn.className = 'fb-btn';
        btn.setAttribute('aria-label', `string ${GuitarAudio.STRING_NAMES[s]}, fret ${f}`);
        btn.dataset.note = GuitarAudio.noteName(s, f);
        btn.addEventListener('click', () => {
          GuitarAudio.pluck(s, f);
          btn.classList.remove('ring');
          void btn.offsetWidth; // restart the ripple animation
          btn.classList.add('ring');
          if (this.opts.onPlay) this.opts.onPlay(s, f);
        });
        cell.appendChild(btn);
        row.appendChild(cell);
        this.cells[s][f] = btn;
      }
      board.appendChild(row);
    }
    this.el.appendChild(board);

    if (this.opts.showNamesToggle !== false) {
      const label = document.createElement('label');
      label.className = 'tp-toggle fb-names-toggle';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.addEventListener('change', () => board.classList.toggle('show-names', box.checked));
      label.appendChild(box);
      label.appendChild(document.createTextNode(' 🏷️ Show note names'));
      this.el.appendChild(label);
    }
  }

  _div(cls, text) {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    return d;
  }

  /* Briefly highlight a position (used to reveal quiz answers). */
  flash(s, f, cls = 'reveal') {
    const btn = this.cells[s] && this.cells[s][f];
    if (!btn) return;
    btn.classList.add(cls);
    setTimeout(() => btn.classList.remove(cls), 1200);
  }
}
