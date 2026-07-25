# 🎸 Easy Guitar Tabs/Chords — Learn Guitar the Fun Way

An interactive, beginner-friendly website with **two learning tracks** —
switch between them right in the title:

- **Tabs**: read guitar tablature, link riffs together, and play melodies in time
- **Chords**: read chord charts, master chord changes, and strum real songs

Both tracks follow the same five-lesson arc and end in a tap-along rhythm
game that scores your timing.

No frameworks, no build step, no audio files: every note is synthesized live
in the browser with the Web Audio API (Karplus–Strong plucked-string synthesis),
so the whole site is just static HTML/CSS/JS.

## Running it

Any static file server works:

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or enable **GitHub Pages** on this repo (Settings → Pages → deploy from branch)
and it works as-is.

## The five lessons (× two tracks)

| # | Tabs track | Chords track |
| --- | --- | --- |
| 1 | **Read Tabs** — the six lines and numbers, clickable fretboard, playable examples | **Read Chords** — chord-chart anatomy plus all 10 beginner chords as tap-to-strum cards, grouped in families |
| 2 | **Note Quiz** — see a note in tab, find it on the fretboard (8/10 to pass) | **Chord Quiz** — see a chart, name the chord from the Lesson 1 toolbox (8/10 to pass) |
| 3 | **First Riffs** — three looping riffs with tempo control | **First Changes** — Em↔Am, Am↔C, G↔D drills with anchor-finger tips |
| 4 | **Link It Up** — join riff A to riff B + Speed Trainer (+5%/loop) | **Progressions** — build G–Em–C–D + Speed Trainer |
| 5 | **Play Songs** — five melodies with tap-along scoring and stars | **Strum Songs** — five chord songs, names above the tab, strum-along scoring |

All playback runs through the same engine: scrolling highlight, tempo
slider, loop, metronome, count-in, and **Play-Along Mode** (tap Space or the
big pad in time; graded perfect/good/miss; up to three stars per song).
Chords are strummed with a low-to-high stagger so they sound real.

Progress (completed lessons per track, quiz bests, song stars) is saved in
`localStorage`. The site has light and dark modes — it follows your system
preference on first visit, and the ☀️/🌙 button in the header (also
remembered in `localStorage`) overrides it.

## Code layout

| File | What it does |
| --- | --- |
| `index.html` | All ten lesson pages, both tracks (single-page app) |
| `css/style.css` | The whole look |
| `js/audio.js` | Guitar synth + metronome (Web Audio API) |
| `js/chords.js` | Chord shapes, strum helper, clickable chord-chart component |
| `js/data.js` | Every riff, song, and chord progression, written as tab data |
| `js/tabplayer.js` | Tab renderer, playback engine, play-along scoring |
| `js/fretboard.js` | The clickable fretboard component |
| `js/main.js` | Track/lesson navigation, quizzes, trainers, game wiring, progress |

## Adding a song

Songs live in `js/data.js`. A song is a list of notes
`{s, f, t, d}` — string (0 = high e … 5 = low E), fret, start time in beats,
duration in beats — plus a tempo and beats-per-bar. The `seq()` and `mel()`
helpers let you write melodies compactly. Add your song to the `songs` array
and it appears in Lesson 5 automatically.
