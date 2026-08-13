/* main.js — wires up both learning tracks (Tabs and Chords): navigation,
 * quizzes, speed trainers, play-along games, themes, and progress
 * saved to localStorage. */

(() => {
  /* ── light / dark theme ────────────────────────────────────── */
  const THEME_KEY = 'easy-guitar-tabs-theme';
  const themeBtn = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === 'dark';
    themeBtn.textContent = dark ? '☀️' : '🌙';
    themeBtn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  const storedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(storedTheme
    || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  /* ── progress store ────────────────────────────────────────── */
  const STORE_KEY = 'easy-guitar-tabs-progress-v1';
  const progress = (() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  })();
  progress.lessons = progress.lessons || {};   // keys: '1'-'5' (tabs), 'c1'-'c5' (chords)
  progress.songStars = progress.songStars || {};
  progress.chordSongStars = progress.chordSongStars || {};
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }

  function completeLesson(id) {
    if (!progress.lessons[id]) {
      progress.lessons[id] = true;
      save();
      renderPips();
    }
  }

  /* ── track (Tabs / Chords) + lesson navigation ─────────────── */
  const MODE_KEY = 'easy-guitar-tabs-mode';
  const NAV_LABELS = {
    tabs: ['Read Tabs', 'Note Quiz', 'First Riffs', 'Link It Up', 'Play Songs'],
    chords: ['Read Chords', 'Chord Quiz', 'First Changes', 'Progressions', 'Strum Songs', 'Barre Chords'],
  };
  let currentMode = 'tabs';
  let currentLessonNum = 1;

  const nav = document.getElementById('lesson-nav');
  let navBtns = [];
  const sectionEls = [...document.querySelectorAll('.lesson')];
  const modeSwitch = document.getElementById('mode-switch');

  function buildNav(mode) {
    nav.innerHTML = '';
    nav.classList.toggle('compact', NAV_LABELS[mode].length > 5);
    NAV_LABELS[mode].forEach((label, i) => {
      const b = document.createElement('button');
      b.dataset.lesson = i + 1;
      const isBonus = mode === 'chords' && i === 5;
      b.innerHTML = `<span class="step">${isBonus ? '💪' : i + 1}</span> ${label}`;
      nav.appendChild(b);
    });
    navBtns = [...nav.querySelectorAll('button')];
  }

  const lessonKey = n => (currentMode === 'chords' ? 'c' : '') + n;

  function showLesson(n) {
    currentLessonNum = n;
    const targetId = 'lesson-' + lessonKey(n);
    sectionEls.forEach(sec => { sec.hidden = sec.id !== targetId; });
    navBtns.forEach(b => {
      b.classList.toggle('active', +b.dataset.lesson === n);
      b.classList.toggle('done', !!progress.lessons[lessonKey(b.dataset.lesson)]);
    });
    for (const p of allPlayers) p.stop();
    window.scrollTo({ top: 0 });
  }

  function setMode(mode) {
    currentMode = mode;
    localStorage.setItem(MODE_KEY, mode);
    modeSwitch.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === mode));
    buildNav(mode);
    if (currentLessonNum > NAV_LABELS[mode].length) currentLessonNum = 1;
    renderPips();
    showLesson(currentLessonNum);
  }

  nav.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) showLesson(+btn.dataset.lesson);
  });
  modeSwitch.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.mode !== currentMode) setMode(btn.dataset.mode);
  });

  function renderPips() {
    const wrap = document.getElementById('progress-pips');
    wrap.innerHTML = '';
    for (let i = 1; i <= NAV_LABELS[currentMode].length; i++) {
      const done = !!progress.lessons[lessonKey(i)];
      const pip = document.createElement('span');
      pip.className = 'pip' + (done ? ' done' : '');
      pip.textContent = done ? '✓' : i;
      wrap.appendChild(pip);
    }
    navBtns.forEach(b => b.classList.toggle('done', !!progress.lessons[lessonKey(b.dataset.lesson)]));
  }

  document.querySelectorAll('[data-complete]').forEach(btn => {
    btn.addEventListener('click', () => {
      completeLesson(btn.dataset.complete);
      btn.textContent = '✓ Done! Nice work';
      btn.classList.add('celebrate');
    });
  });

  const allPlayers = [];
  function makePlayer(sel, song, opts) {
    const p = new TabPlayer(document.querySelector(sel), song, opts);
    allPlayers.push(p);
    return p;
  }

  /* ══════════════════════ TABS TRACK ══════════════════════ */

  /* ── lesson 1 ──────────────────────────────────────────────── */
  new Fretboard('#fretboard-intro');
  makePlayer('#player-demo1', TabData.demos.demo1, { showLoop: false, showMetronome: false });
  makePlayer('#player-demo2', TabData.demos.demo2, { showLoop: false, showMetronome: false, showTempo: false });

  /* ── lesson 2 : note quiz ──────────────────────────────────── */
  const quiz = {
    active: false, round: 0, score: 0, target: null,
    TOTAL: 10, MAX_FRET: 5,
  };
  const quizTab = document.getElementById('quiz-tab');
  const quizFeedback = document.getElementById('quiz-feedback');
  const quizRound = document.getElementById('quiz-round');
  const quizScore = document.getElementById('quiz-score');
  const quizBest = document.getElementById('quiz-best');
  const quizStartBtn = document.getElementById('quiz-start');
  const quizInstruction = document.getElementById('quiz-instruction');

  function renderQuizBest() {
    quizBest.textContent = progress.quizBest != null ? `🏆 best: ${progress.quizBest}/10` : '';
  }
  renderQuizBest();

  const quizBoard = new Fretboard('#fretboard-quiz', {
    showNamesToggle: false,
    onPlay: (s, f) => {
      if (!quiz.active || !quiz.target) return;
      const { s: ts, f: tf } = quiz.target;
      if (s === ts && f === tf) {
        quiz.score++;
        quizFeedback.textContent = ['🎯 Nailed it!', '🔥 Yes!', '⭐ Perfect!', '💪 That’s the one!'][Math.floor(Math.random() * 4)];
        quizFeedback.className = 'quiz-feedback ok';
      } else {
        quizFeedback.textContent = `❌ Not quite — that was string ${GuitarAudio.STRING_NAMES[ts]}, fret ${tf}:`;
        quizFeedback.className = 'quiz-feedback bad';
        quizBoard.flash(ts, tf);
      }
      quiz.target = null;
      setTimeout(nextQuizRound, 1100);
    },
  });

  function miniTab(s, f) {
    let out = '';
    for (let i = 0; i < 6; i++) {
      const mark = i === s ? String(f) : '—'.repeat(String(f).length);
      out += GuitarAudio.STRING_NAMES[i].padEnd(2) + '|———' + mark + '———|\n';
    }
    return out.trimEnd();
  }

  function nextQuizRound() {
    if (!quiz.active) return;
    if (quiz.round >= quiz.TOTAL) return endQuiz();
    quiz.round++;
    quiz.target = {
      s: Math.floor(Math.random() * 6),
      f: Math.floor(Math.random() * (quiz.MAX_FRET + 1)),
    };
    quizTab.hidden = false;
    quizTab.textContent = miniTab(quiz.target.s, quiz.target.f);
    quizFeedback.textContent = '';
    quizFeedback.className = 'quiz-feedback';
    quizRound.textContent = `Question ${quiz.round} / ${quiz.TOTAL}`;
    quizScore.textContent = `score: ${quiz.score}`;
    quizInstruction.innerHTML = 'Find this note on the fretboard: 👇';
  }

  function endQuiz() {
    quiz.active = false;
    quizTab.hidden = true;
    quizRound.textContent = 'Done!';
    quizScore.textContent = `score: ${quiz.score}`;
    const passed = quiz.score >= 8;
    quizInstruction.innerHTML = passed
      ? `🎉 <strong>${quiz.score}/10 — you passed!</strong> You officially read tab. On to Lesson 3!`
      : `You got <strong>${quiz.score}/10</strong>. Almost! You need 8 to pass — give it another go.`;
    quizFeedback.textContent = '';
    if (progress.quizBest == null || quiz.score > progress.quizBest) {
      progress.quizBest = quiz.score;
    }
    if (passed) completeLesson('2');
    save();
    renderQuizBest();
    quizStartBtn.textContent = '↻ Play Again';
    quizStartBtn.hidden = false;
  }

  quizStartBtn.addEventListener('click', () => {
    GuitarAudio.ensure();
    quiz.active = true;
    quiz.round = 0;
    quiz.score = 0;
    quizStartBtn.hidden = true;
    nextQuizRound();
  });

  /* ── lesson 3 : riffs ──────────────────────────────────────── */
  makePlayer('#player-riff1', TabData.riffs.riff1, { loop: false, metronome: true });
  makePlayer('#player-riff2', TabData.riffs.riff2, { metronome: true });
  makePlayer('#player-riff3', TabData.riffs.riff3, { loop: true, metronome: true });

  /* ── lesson 4 : linking + speed trainer ────────────────────── */
  makePlayer('#player-linkA', TabData.links.linkA, { loop: true });
  makePlayer('#player-linkB', TabData.links.linkB, { loop: true });
  wireSpeedTrainer('#speed-trainer', makePlayer('#player-linkAB', TabData.links.linkAB, {
    loop: true, metronome: true,
  }));

  function wireSpeedTrainer(sel, player) {
    const box = document.querySelector(sel);
    player.opts.onLoopRepeat = (p) => {
      if (box.checked && p.tempoPct < 120) p.setTempoPct(p.tempoPct + 5);
    };
    box.addEventListener('change', () => {
      if (box.checked) player.setTempoPct(70);
    });
    return player;
  }

  /* ══════════════════════ CHORDS TRACK ══════════════════════ */

  /* ── chords lesson 1 : reading charts ──────────────────────── */
  const introEm = document.createElement('div');
  document.getElementById('chord-intro').appendChild(introEm);
  new GuitarChords.ChordDiagram(introEm, 'Em');

  function fillChordRow(containerId, names) {
    const row = document.getElementById(containerId);
    for (const name of names) {
      const holder = document.createElement('div');
      row.appendChild(holder);
      new GuitarChords.ChordDiagram(holder, name);
    }
  }
  fillChordRow('chord-first-three', ['Em', 'Am', 'D']);
  // the complete quiz pool, grouped as families
  fillChordRow('chord-family-twins', ['E', 'Em', 'A', 'Am', 'D', 'Dm']);
  fillChordRow('chord-family-camp', ['C', 'G']);
  fillChordRow('chord-family-seven', ['E7', 'A7']);
  makePlayer('#player-chord-demo', TabData.chordDemo, { showLoop: false, showMetronome: false });

  /* ── chords lesson 2 : name that chord ─────────────────────── */
  const cquiz = { active: false, round: 0, score: 0, answer: null, TOTAL: 10 };
  const cquizRound = document.getElementById('cquiz-round');
  const cquizScore = document.getElementById('cquiz-score');
  const cquizBest = document.getElementById('cquiz-best');
  const cquizStartBtn = document.getElementById('cquiz-start');
  const cquizInstruction = document.getElementById('cquiz-instruction');
  const cquizOptions = document.getElementById('cquiz-options');
  const cquizFeedback = document.getElementById('cquiz-feedback');
  const cquizDiagram = new GuitarChords.ChordDiagram('#cquiz-diagram', 'Em', { showName: false });

  function renderCQuizBest() {
    cquizBest.textContent = progress.chordQuizBest != null ? `🏆 best: ${progress.chordQuizBest}/10` : '';
  }
  renderCQuizBest();

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function nextCQuizRound() {
    if (!cquiz.active) return;
    if (cquiz.round >= cquiz.TOTAL) return endCQuiz();
    cquiz.round++;
    cquiz.answer = GuitarChords.NAMES[Math.floor(Math.random() * GuitarChords.NAMES.length)];
    cquizDiagram.setChord(cquiz.answer);
    const options = shuffle([
      cquiz.answer,
      ...shuffle(GuitarChords.NAMES.filter(n => n !== cquiz.answer)).slice(0, 3),
    ]);
    cquizOptions.innerHTML = '';
    for (const name of options) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.addEventListener('click', () => answerCQuiz(btn, name));
      cquizOptions.appendChild(btn);
    }
    cquizFeedback.textContent = '';
    cquizFeedback.className = 'quiz-feedback';
    cquizRound.textContent = `Question ${cquiz.round} / ${cquiz.TOTAL}`;
    cquizScore.textContent = `score: ${cquiz.score}`;
    cquizInstruction.innerHTML = 'Which chord is this? (tap the chart to hear it) 👇';
  }

  function answerCQuiz(btn, name) {
    if (!cquiz.active || !cquiz.answer) return;
    const answer = cquiz.answer;
    cquiz.answer = null;
    GuitarChords.strum(answer);
    [...cquizOptions.children].forEach(b => {
      b.disabled = true;
      if (b.textContent === answer) b.classList.add('correct');
    });
    if (name === answer) {
      cquiz.score++;
      cquizFeedback.textContent = ['🎯 Nailed it!', '🔥 Yes!', '⭐ Perfect!', '💪 That’s the one!'][Math.floor(Math.random() * 4)];
      cquizFeedback.className = 'quiz-feedback ok';
    } else {
      btn.classList.add('wrong');
      cquizFeedback.textContent = `❌ Not quite — that was ${answer}.`;
      cquizFeedback.className = 'quiz-feedback bad';
    }
    cquizScore.textContent = `score: ${cquiz.score}`;
    setTimeout(nextCQuizRound, 1200);
  }

  function endCQuiz() {
    cquiz.active = false;
    cquizOptions.innerHTML = '';
    cquizRound.textContent = 'Done!';
    cquizScore.textContent = `score: ${cquiz.score}`;
    const passed = cquiz.score >= 8;
    cquizInstruction.innerHTML = passed
      ? `🎉 <strong>${cquiz.score}/10 — you passed!</strong> You read chord charts now. On to Lesson 3!`
      : `You got <strong>${cquiz.score}/10</strong>. Almost! You need 8 to pass — give it another go.`;
    cquizFeedback.textContent = '';
    if (progress.chordQuizBest == null || cquiz.score > progress.chordQuizBest) {
      progress.chordQuizBest = cquiz.score;
    }
    if (passed) completeLesson('c2');
    save();
    renderCQuizBest();
    cquizStartBtn.textContent = '↻ Play Again';
    cquizStartBtn.hidden = false;
  }

  cquizStartBtn.addEventListener('click', () => {
    GuitarAudio.ensure();
    cquiz.active = true;
    cquiz.round = 0;
    cquiz.score = 0;
    cquizStartBtn.hidden = true;
    nextCQuizRound();
  });

  /* ── chords lesson 3 : first changes ───────────────────────── */
  const drills = [
    ['emAm', ['Em', 'Am']],
    ['amC', ['Am', 'C']],
    ['gD', ['G', 'D']],
  ];
  for (const [key, pair] of drills) {
    for (const name of pair) {
      const holder = document.createElement('div');
      document.getElementById('chords-' + key).appendChild(holder);
      new GuitarChords.ChordDiagram(holder, name);
    }
    makePlayer('#player-' + key, TabData.chordDrills[key], { loop: true, metronome: true });
  }

  /* ── chords lesson 4 : progressions + speed trainer ────────── */
  makePlayer('#player-gEm', TabData.chordDrills.gEm, { loop: true, view: 'chords' });
  makePlayer('#player-cD', TabData.chordDrills.cD, { loop: true, view: 'chords' });
  wireSpeedTrainer('#c-speed-trainer', makePlayer('#player-magic', TabData.chordDrills.magic, {
    loop: true, metronome: true, view: 'chords',
  }));

  /* ── chords lesson 6 : barre chords (bonus) ────────────────── */
  fillChordRow('barre-intro', ['F']);
  fillChordRow('barre-e-shape', ['F', 'G_barre', 'F#m']);
  fillChordRow('barre-a-shape', ['B', 'Bm', 'C#m']);
  makePlayer('#player-barre', TabData.barreDemo, { loop: true, metronome: true, view: 'chords' });

  /* ══════════════ SONG LESSONS (shared by both tracks) ══════════════ */

  function starsFor(pct) { return pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 45 ? 1 : 0; }
  function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

  const GRADE_MSG = {
    perfect: ['💥 PERFECT!', '🎯 Dead on!', '⚡ Right in the pocket!'],
    good: ['👍 Good!', '✅ Close!', '🙂 Nearly!'],
    miss: ['😅 Off the beat…', '🫠 Too far out…'],
    again: ['🎵'],
  };

  /* Wire up one full song lesson (picker, player, play-along game).
   * prefix: '' for the Tabs track, 'c-' for the Chords track. */
  function wireSongLesson(prefix, songs, starsKey, lessonId, playerOpts = {}) {
    const $id = name => document.getElementById(prefix + name);
    const picker = $id('song-picker');
    const titleEl = $id('song-title');
    const blurbEl = $id('song-blurb');
    const starsEl = $id('song-stars');
    const paToggle = $id('playalong-toggle');
    const paUI = $id('playalong-ui');
    const paResults = $id('pa-results');
    const paCombo = $id('pa-combo');
    const paScore = $id('pa-score');
    const paMsg = $id('pa-msg');
    const tapPad = $id('tap-pad');

    let current = songs[0];

    function renderPicker() {
      picker.innerHTML = '';
      for (const song of songs) {
        const btn = document.createElement('button');
        btn.className = 'song-chip' + (song.id === current.id ? ' active' : '');
        const stars = progress[starsKey][song.id] || 0;
        btn.innerHTML = `<strong>${song.title}</strong>
          <span class="song-meta">${'●'.repeat(song.difficulty)}${'○'.repeat(3 - song.difficulty)} · ${starStr(stars)}</span>`;
        btn.addEventListener('click', () => select(song));
        picker.appendChild(btn);
      }
    }

    const player = makePlayer('#' + prefix + 'player-song', current, {
      ...playerOpts,
      metronome: false,
      onPlayAlongEnd: showResults,
      onPlayStateChange: (playing) => {
        if (playing && player.playAlong) {
          paResults.hidden = true;
          paCombo.textContent = '0';
          paScore.textContent = '0';
          paMsg.textContent = 'Count-in… get ready!';
        }
      },
      onMiss: (st) => { paCombo.textContent = st.combo; paMsg.textContent = '💨 missed one…'; },
    });

    function select(song) {
      current = song;
      player.setSong(song);
      titleEl.textContent = song.title;
      blurbEl.textContent = song.blurb;
      paResults.hidden = true;
      renderPicker();
      starsEl.textContent = starStr(progress[starsKey][current.id] || 0);
    }

    paToggle.addEventListener('change', () => {
      player.setPlayAlong(paToggle.checked);
      paUI.hidden = !paToggle.checked;
      paResults.hidden = true;
    });

    function doTap() {
      const result = player.tap();
      if (!result) return;
      const msgs = GRADE_MSG[result.grade];
      paMsg.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      if (result.stats) {
        paCombo.textContent = result.stats.combo;
        paScore.textContent = result.stats.points;
      }
      tapPad.classList.remove('pop');
      void tapPad.offsetWidth;
      tapPad.classList.add('pop');
    }

    tapPad.addEventListener('pointerdown', e => { e.preventDefault(); doTap(); });
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && player.playing && player.playAlong) {
        e.preventDefault();
        doTap();
      }
    });

    function showResults(stats) {
      const pct = Math.round(100 * stats.points / Math.max(1, stats.max));
      const stars = starsFor(pct);
      const prev = progress[starsKey][current.id] || 0;
      if (stars > prev) { progress[starsKey][current.id] = stars; }
      if (stars >= 1) completeLesson(lessonId);
      save();
      renderPicker();
      starsEl.textContent = starStr(progress[starsKey][current.id] || 0);
      paResults.hidden = false;
      paResults.innerHTML = `
        <div class="pa-final-stars">${starStr(stars)}</div>
        <div class="pa-final-pct">${pct}% in time</div>
        <div class="pa-final-detail">💥 ${stats.perfect} perfect · 👍 ${stats.good} good · 💨 ${stats.miss} missed</div>
        <div class="pa-final-tip">${
          stars === 3 ? 'Flawless! Try a harder song — or crank the tempo past 100%. 🤘'
          : stars === 2 ? 'So close to 3 stars! Slow the tempo down 10% and lock in.'
          : stars === 1 ? 'Solid start! Tip: count “1-2-3-4” out loud with the beat.'
          : 'Keep at it — try 70% tempo and watch the moving highlight.'}</div>`;
      paMsg.textContent = 'Press play to try again!';
    }

    select(current);
    return player;
  }

  const songPlayer = wireSongLesson('', TabData.songs, 'songStars', '5');
  const chordSongPlayer = wireSongLesson('c-', TabData.chordSongs, 'chordSongStars', 'c5', { view: 'chords' });

  /* ── boot ──────────────────────────────────────────────────── */
  setMode(localStorage.getItem(MODE_KEY) === 'chords' ? 'chords' : 'tabs');

  // handy for debugging / automated tests
  window.EasyGuitarTabs = { players: allPlayers, songPlayer, chordSongPlayer, cquiz, progress };
})();
