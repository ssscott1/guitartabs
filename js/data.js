/* data.js — every riff and song on the site, written as tab data.
 *
 * A note is {s, f, t, d}:
 *   s = string index (0 = high e … 5 = low E, same order as tab lines)
 *   f = fret number (0 = open)
 *   t = start time in beats
 *   d = duration in beats
 */

const TabData = (() => {

  /* Build a note list from a sequence of steps, accumulating time.
   * Step shapes:
   *   [s, f, d]              single note
   *   [[[s,f],[s,f]…], d]    chord (notes played together)
   *   ['r', d]               rest */
  function seq(steps) {
    const notes = [];
    let t = 0;
    for (const step of steps) {
      if (step[0] === 'r') { t += step[1]; continue; }
      if (Array.isArray(step[0])) {
        const d = step[1];
        for (const [s, f] of step[0]) notes.push({ s, f, t, d });
        t += d;
      } else {
        const [s, f, d] = step;
        notes.push({ s, f, t, d });
        t += d;
      }
    }
    return notes;
  }

  // First-position fingerings for melody pitches (string, fret).
  const P = {
    B2: [4, 2], C3: [4, 3], Cs3: [4, 4], D3: [3, 0], Ds3: [3, 1], E3: [3, 2],
    Fs3: [3, 4], G3: [2, 0], A3: [2, 2], B3: [1, 0], C4: [1, 1], Cs4: [1, 2],
    D4: [1, 3], E4: [0, 0], F4: [0, 1], G4: [0, 3], A4: [0, 5],
  };

  // Melody helper: steps of [pitchName, dur] or ['r', dur].
  function mel(steps) {
    return seq(steps.map(st => st[0] === 'r' ? st : [...P[st[0]], st[1]]));
  }

  /* ── Lesson 1 demos ─────────────────────────────────────────── */

  const demo1 = {
    id: 'demo1', title: 'Mini melody', tempo: 80, beatsPerBar: 4, res: 1,
    notes: seq([[0, 0, 1], [0, 2, 1], [0, 3, 2], [0, 3, 1], [0, 2, 1], [0, 0, 2]]),
  };

  const demo2 = {
    id: 'demo2', title: 'Notes, then a chord', tempo: 70, beatsPerBar: 4, res: 1,
    notes: seq([
      [4, 3, 1], [3, 2, 1],
      [[[0, 0], [1, 1], [2, 0], [3, 2], [4, 3]], 2],
    ]),
  };

  /* ── Lesson 3 riffs ─────────────────────────────────────────── */

  const riff1 = {
    id: 'riff1', title: 'Thunder Steps', tempo: 90, beatsPerBar: 4, res: 0.5,
    notes: seq([
      [5, 0, 1], [5, 0, 0.5], [5, 3, 0.5], [5, 0, 1], [5, 5, 0.5], [5, 3, 0.5],
      [5, 0, 1], [5, 0, 0.5], [5, 3, 0.5], [5, 5, 1], [5, 3, 0.5], [5, 0, 0.5],
    ]),
  };

  const riff2 = {
    id: 'riff2', title: 'The Staircase', tempo: 90, beatsPerBar: 4, res: 0.5,
    notes: seq([
      [5, 0, 0.5], [5, 3, 0.5], [4, 0, 0.5], [4, 2, 0.5],
      [3, 0, 0.5], [3, 2, 0.5], [2, 0, 0.5], [2, 2, 0.5],
      [2, 2, 0.5], [2, 0, 0.5], [3, 2, 0.5], [3, 0, 0.5],
      [4, 2, 0.5], [4, 0, 0.5], [5, 3, 0.5], [5, 0, 1],
    ]),
  };

  function boogieBar(root) {
    const five = { E: [[5, 0], [4, 2]], A: [[4, 0], [3, 2]], B: [[4, 2], [3, 4]] }[root];
    const six = { E: [[5, 0], [4, 4]], A: [[4, 0], [3, 4]], B: [[4, 2], [3, 6]] }[root];
    return [
      [five, 0.5], [five, 0.5], [six, 0.5], [six, 0.5],
      [five, 0.5], [five, 0.5], [six, 0.5], [six, 0.5],
    ];
  }

  const riff3 = {
    id: 'riff3', title: 'Boogie Bar', tempo: 85, beatsPerBar: 4, res: 0.5,
    notes: seq(boogieBar('E')),
  };

  /* ── Lesson 4 linking riffs ─────────────────────────────────── */

  const linkA = {
    id: 'linkA', title: 'Riff A', tempo: 85, beatsPerBar: 4, res: 0.5,
    notes: seq([[5, 0, 1], [5, 0, 0.5], [5, 3, 0.5], [5, 0, 1], [5, 5, 0.5], [5, 3, 0.5]]),
  };

  const linkB = {
    id: 'linkB', title: 'Riff B', tempo: 85, beatsPerBar: 4, res: 0.5,
    notes: seq([[4, 0, 1], [4, 0, 0.5], [4, 3, 0.5], [4, 0, 1], [4, 5, 0.5], [4, 3, 0.5]]),
  };

  const linkAB = {
    id: 'linkAB', title: 'Riff A + Riff B', tempo: 85, beatsPerBar: 4, res: 0.5,
    notes: seq([
      [5, 0, 1], [5, 0, 0.5], [5, 3, 0.5], [5, 0, 1], [5, 5, 0.5], [5, 3, 0.5],
      [4, 0, 1], [4, 0, 0.5], [4, 3, 0.5], [4, 0, 1], [4, 5, 0.5], [4, 3, 0.5],
    ]),
  };

  /* ── Lesson 5 songs (traditional / public-domain, simplified) ── */

  const twinkle = {
    id: 'twinkle', title: 'Twinkle Twinkle Little Star', tempo: 90,
    beatsPerBar: 4, res: 1, difficulty: 1,
    blurb: 'The classic first song. Steady quarter notes, all in easy reach — perfect for locking in your timing.',
    notes: mel([
      ['G3', 1], ['G3', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
      ['C4', 1], ['C4', 1], ['B3', 1], ['B3', 1], ['A3', 1], ['A3', 1], ['G3', 2],
      ['D4', 1], ['D4', 1], ['C4', 1], ['C4', 1], ['B3', 1], ['B3', 1], ['A3', 2],
      ['D4', 1], ['D4', 1], ['C4', 1], ['C4', 1], ['B3', 1], ['B3', 1], ['A3', 2],
      ['G3', 1], ['G3', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
      ['C4', 1], ['C4', 1], ['B3', 1], ['B3', 1], ['A3', 1], ['A3', 1], ['G3', 2],
    ]),
  };

  const odeToJoy = {
    id: 'ode', title: 'Ode to Joy (Beethoven)', tempo: 100,
    beatsPerBar: 4, res: 0.5, difficulty: 2,
    blurb: 'Beethoven wrote it, you get to shred it. Watch the dotted rhythm at the end of each line.',
    notes: mel([
      ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
      ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['E4', 1.5], ['D4', 0.5], ['D4', 2],
      ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
      ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['D4', 1.5], ['C4', 0.5], ['C4', 2],
      ['D4', 1], ['D4', 1], ['E4', 1], ['C4', 1],
      ['D4', 1], ['E4', 0.5], ['F4', 0.5], ['E4', 1], ['C4', 1],
      ['D4', 1], ['E4', 0.5], ['F4', 0.5], ['E4', 1], ['D4', 1],
      ['C4', 1], ['D4', 1], ['G3', 2],
      ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
      ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['D4', 1.5], ['C4', 0.5], ['C4', 2],
    ]),
  };

  const saints = {
    id: 'saints', title: 'When the Saints Go Marching In', tempo: 110,
    beatsPerBar: 4, res: 0.5, difficulty: 2,
    blurb: 'A New Orleans classic (simplified). Mind the rests — silence is part of the groove!',
    notes: mel([
      ['r', 1], ['C4', 1], ['E4', 1], ['F4', 1], ['G4', 4],
      ['r', 1], ['C4', 1], ['E4', 1], ['F4', 1], ['G4', 4],
      ['r', 1], ['C4', 1], ['E4', 1], ['F4', 1],
      ['G4', 2], ['E4', 2], ['C4', 2], ['E4', 2], ['D4', 4],
      ['E4', 2], ['E4', 1], ['D4', 1], ['C4', 2], ['C4', 1], ['E4', 1],
      ['G4', 1], ['G4', 1], ['F4', 2], ['E4', 1], ['F4', 1], ['G4', 1], ['E4', 1],
      ['C4', 1], ['D4', 1], ['C4', 2],
    ]),
  };

  const blues = {
    id: 'blues', title: '12-Bar Blues Boogie in E', tempo: 100,
    beatsPerBar: 4, res: 0.5, difficulty: 3,
    blurb: 'The riff from Lesson 3 grown into a full 12-bar blues — the exact form behind thousands of rock and blues songs.',
    notes: seq([
      ...boogieBar('E'), ...boogieBar('E'), ...boogieBar('E'), ...boogieBar('E'),
      ...boogieBar('A'), ...boogieBar('A'), ...boogieBar('E'), ...boogieBar('E'),
      ...boogieBar('B'), ...boogieBar('A'), ...boogieBar('E'), ...boogieBar('B'),
    ]),
  };

  const greensleeves = {
    id: 'greensleeves', title: 'Greensleeves', tempo: 100,
    beatsPerBar: 3, res: 0.5, difficulty: 3,
    blurb: 'A beautiful 500-year-old melody in 3/4 time (simplified) — count “1-2-3, 1-2-3” instead of “1-2-3-4”.',
    notes: mel([
      ['E3', 1],
      ['G3', 2], ['A3', 1], ['B3', 1.5], ['C4', 0.5], ['B3', 1], ['A3', 2], ['Fs3', 1],
      ['D3', 1.5], ['E3', 0.5], ['Fs3', 1], ['G3', 2], ['E3', 1],
      ['E3', 1.5], ['Ds3', 0.5], ['E3', 1], ['Fs3', 2], ['Ds3', 1], ['B2', 2], ['E3', 1],
      ['G3', 2], ['A3', 1], ['B3', 1.5], ['C4', 0.5], ['B3', 1], ['A3', 2], ['Fs3', 1],
      ['D3', 1.5], ['E3', 0.5], ['Fs3', 1], ['G3', 1.5], ['Fs3', 0.5], ['E3', 1],
      ['Ds3', 1.5], ['Cs3', 0.5], ['Ds3', 1], ['E3', 3],
    ]),
  };

  return {
    demos: { demo1, demo2 },
    riffs: { riff1, riff2, riff3 },
    links: { linkA, linkB, linkAB },
    songs: [twinkle, odeToJoy, saints, blues, greensleeves],
  };
})();
