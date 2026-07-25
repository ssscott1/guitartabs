/* main.js — wires up lessons, navigation, quiz, speed trainer,
 * play-along game, and progress saved to localStorage. */

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
  progress.lessons = progress.lessons || {};
  progress.songStars = progress.songStars || {};
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }

  function completeLesson(n) {
    if (!progress.lessons[n]) {
      progress.lessons[n] = true;
      save();
      renderPips();
    }
  }

  /* ── navigation ────────────────────────────────────────────── */
  const nav = document.getElementById('lesson-nav');
  const navBtns = [...nav.querySelectorAll('button')];
  const sections = navBtns.map(b => document.getElementById('lesson-' + b.dataset.lesson));

  function showLesson(n) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.lesson === String(n)));
    sections.forEach((sec, i) => { sec.hidden = (i !== n - 1); });
    for (const p of allPlayers) p.stop();
    window.scrollTo({ top: 0 });
  }
  nav.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) showLesson(+btn.dataset.lesson);
  });

  function renderPips() {
    const wrap = document.getElementById('progress-pips');
    wrap.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip' + (progress.lessons[i] ? ' done' : '');
      pip.textContent = progress.lessons[i] ? '✓' : i;
      wrap.appendChild(pip);
    }
    navBtns.forEach(b => b.classList.toggle('done', !!progress.lessons[b.dataset.lesson]));
  }

  document.querySelectorAll('[data-complete]').forEach(btn => {
    btn.addEventListener('click', () => {
      completeLesson(+btn.dataset.complete);
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

  /* ── lesson 1 ──────────────────────────────────────────────── */
  new Fretboard('#fretboard-intro');
  makePlayer('#player-demo1', TabData.demos.demo1, { showLoop: false, showMetronome: false });
  makePlayer('#player-demo2', TabData.demos.demo2, { showLoop: false, showMetronome: false, showTempo: false });

  /* ── lesson 2 : quiz ───────────────────────────────────────── */
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
    if (passed) completeLesson(2);
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
  const trainerBox = document.getElementById('speed-trainer');
  const linkPlayer = makePlayer('#player-linkAB', TabData.links.linkAB, {
    loop: true, metronome: true,
    onLoopRepeat: (p) => {
      if (trainerBox.checked && p.tempoPct < 120) {
        p.setTempoPct(p.tempoPct + 5);
      }
    },
  });
  trainerBox.addEventListener('change', () => {
    if (trainerBox.checked) linkPlayer.setTempoPct(70);
  });

  /* ── lesson 5 : songs + play-along ─────────────────────────── */
  const songPicker = document.getElementById('song-picker');
  const songTitle = document.getElementById('song-title');
  const songBlurb = document.getElementById('song-blurb');
  const songStars = document.getElementById('song-stars');
  const paToggle = document.getElementById('playalong-toggle');
  const paUI = document.getElementById('playalong-ui');
  const paResults = document.getElementById('pa-results');
  const paCombo = document.getElementById('pa-combo');
  const paScore = document.getElementById('pa-score');
  const paMsg = document.getElementById('pa-msg');
  const tapPad = document.getElementById('tap-pad');

  let currentSong = TabData.songs[0];

  function starsFor(pct) { return pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 45 ? 1 : 0; }
  function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

  function renderSongPicker() {
    songPicker.innerHTML = '';
    for (const song of TabData.songs) {
      const btn = document.createElement('button');
      btn.className = 'song-chip' + (song.id === currentSong.id ? ' active' : '');
      const stars = progress.songStars[song.id] || 0;
      btn.innerHTML = `<strong>${song.title}</strong>
        <span class="song-meta">${'●'.repeat(song.difficulty)}${'○'.repeat(3 - song.difficulty)} · ${starStr(stars)}</span>`;
      btn.addEventListener('click', () => selectSong(song));
      songPicker.appendChild(btn);
    }
  }

  const songPlayer = makePlayer('#player-song', currentSong, {
    metronome: false,
    onPlayAlongEnd: showResults,
    onPlayStateChange: (playing) => {
      if (playing && songPlayer.playAlong) {
        paResults.hidden = true;
        paCombo.textContent = '0';
        paScore.textContent = '0';
        paMsg.textContent = 'Count-in… get ready!';
      }
    },
    onMiss: (st) => { paCombo.textContent = st.combo; paMsg.textContent = '💨 missed one…'; },
  });

  function selectSong(song) {
    currentSong = song;
    songPlayer.setSong(song);
    songTitle.textContent = song.title;
    songBlurb.textContent = song.blurb;
    paResults.hidden = true;
    renderSongPicker();
    renderSongStars();
  }

  function renderSongStars() {
    songStars.textContent = starStr(progress.songStars[currentSong.id] || 0);
  }

  paToggle.addEventListener('change', () => {
    songPlayer.setPlayAlong(paToggle.checked);
    paUI.hidden = !paToggle.checked;
    paResults.hidden = true;
  });

  const GRADE_MSG = {
    perfect: ['💥 PERFECT!', '🎯 Dead on!', '⚡ Right in the pocket!'],
    good: ['👍 Good!', '✅ Close!', '🙂 Nearly!'],
    miss: ['😅 Off the beat…', '🫠 Too far out…'],
    again: ['🎵'],
  };

  function doTap() {
    const result = songPlayer.tap();
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
    if (e.code === 'Space' && songPlayer.playing && songPlayer.playAlong) {
      e.preventDefault();
      doTap();
    }
  });

  function showResults(stats) {
    const pct = Math.round(100 * stats.points / Math.max(1, stats.max));
    const stars = starsFor(pct);
    const prev = progress.songStars[currentSong.id] || 0;
    if (stars > prev) { progress.songStars[currentSong.id] = stars; }
    if (stars >= 1) completeLesson(5);
    save();
    renderSongPicker();
    renderSongStars();
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

  selectSong(currentSong);
  renderPips();
  showLesson(1);

  // handy for debugging / automated tests
  window.EasyGuitarTabs = { players: allPlayers, songPlayer, progress };
})();
