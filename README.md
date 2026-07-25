# 🎸 TabHero — Learn Guitar Tabs the Fun Way

An interactive, beginner-friendly website that teaches you to **read guitar
tablature**, **link riffs together**, and **play real songs in time** — with a
built-in tap-along rhythm game to test your timing.

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

## The five lessons

1. **Read Tabs** — what the six lines and the numbers mean, with a clickable
   virtual fretboard and playable example tabs.
2. **Note Quiz** — a 10-question game: see a note in tab, find it on the
   fretboard. Score 8/10 to pass.
3. **First Riffs** — three short riffs (one-string rock, E-minor pentatonic,
   blues boogie) with looping playback and a tempo slider.
4. **Link It Up** — practice joining riff A to riff B without dropping the
   beat, plus a **Speed Trainer** that nudges the tempo up 5% every loop.
5. **Play Songs** — five traditional/public-domain songs with scrolling tab
   playback, a metronome, and **Play-Along Mode**: tap Space (or the big pad)
   in time with the notes and earn up to three stars per song.

Progress (completed lessons, quiz best, song stars) is saved in
`localStorage`.

## Code layout

| File | What it does |
| --- | --- |
| `index.html` | All five lesson pages (single-page app) |
| `css/style.css` | The whole look |
| `js/audio.js` | Guitar synth + metronome (Web Audio API) |
| `js/data.js` | Every riff and song, written as tab data |
| `js/tabplayer.js` | Tab renderer, playback engine, play-along scoring |
| `js/fretboard.js` | The clickable fretboard component |
| `js/main.js` | Lesson navigation, quiz, trainer, game wiring, progress |

## Adding a song

Songs live in `js/data.js`. A song is a list of notes
`{s, f, t, d}` — string (0 = high e … 5 = low E), fret, start time in beats,
duration in beats — plus a tempo and beats-per-bar. The `seq()` and `mel()`
helpers let you write melodies compactly. Add your song to the `songs` array
and it appears in Lesson 5 automatically.
