# Shorts

Vertical shorts (1080×1920, 30 fps) in one visual style: flat doodle silhouettes drawn with SVG shapes only, a muted dark
palette with a single amber accent, paper grain, slow push-ins and parallax, and bold captions that pop in word by word.

```bash
npm install
npm run studio         # preview in Remotion Studio (http://localhost:3000)
npm run render:day1    # → out/day1.mp4 (voice: af_heart)
npm run render:day1-male  # → out/day1-male-voice.mp4 (same video, voice: am_michael, for A/B tests)
npm run cover:day1     # → out/day1-cover.png (frame 0, the hook)
```

## Make the next video

A video is a plain-data script, so a new one is a new file plus one line in `src/Root.tsx`:

```ts
// src/videos/day2.ts
import type { ShortVideoProps } from '../ShortVideo';

export const day2: ShortVideoProps = {
  scenes: [
    { seconds: 3, scene: 'desk', props: { caption: 'Day 2: the scanner works', captionTiming: { instant: true } } },
    { seconds: 4, scene: 'scanner', props: { caption: 'It flagged 4 of my\nown thumbnails', flagged: [0, 5, 10, 15] } },
    { seconds: 4, scene: 'sunrise', props: { caption: 'Launches Friday.\nFollow to get it first.' }, transition: 'cut' },
  ],
  voice: 'day2-voice.mp3', // files in public/; missing files are skipped
};
```

```tsx
// src/Root.tsx
{short('Day2', day2)}
```

The length is computed from the scenes. Every scene comes in with a 6-frame crossfade centred on the cut unless it says
`transition: 'cut'`. Then `npx remotion render Day2 out/day2.mp4`. The same script can also be passed at render time with
`--props=day2.json`.

### Scenes

All scenes take `caption` and optional `captionTiming`; the rest is per scene.

| Scene     | What it shows | Options |
|-----------|---------------|---------|
| `desk`    | Lone silhouette at a desk, monitor glow, slow push-in | `typing` (0–1.5), `pushAmount` |
| `screens` | Wall of small TVs going dark one by one, a figure watching | `count`, `columns`, `darkFrom`, `darkTo`, `seed` |
| `doors`   | Dark hallway, tall doors with a small red light above each, tiny figure | `count` |
| `cliff`   | A line of silhouettes walking slowly toward a cliff edge | `walkers`, `edgeX`, `speed` |
| `scanner` | Typing figure; amber magnifier sweeps a thumbnail grid, flagged ones turn amber | `columns`, `rows`, `flagged`, `typing` |
| `sunrise` | Amber sunrise rising behind a skyline made of screens | `riseFraction` |

Each scene also has a 4–6 s preview under **Scenes** in the Studio.

### Captions

- Max 2 lines, centred in the middle third, auto-sized as large as fits (`src/components/captionLayout.ts`).
- Put `\n` in the text to choose the line break; otherwise the caption balances itself.
- `captionTiming`: `{ instant: true }` shows the whole caption on the first frame (use it for the hook, so frame 0
  works as the cover); `start` / `stagger` set when words pop in; `at: [6, 10, 24, ...]` gives each word its own frame
  (for landing a word on a beat or syncing to a voice-over).

### Style rules

Colours, safe zones and caption sizes live in `src/style/theme.ts`. Text stays out of the top 150 px and bottom 350 px.
Motion is slow and eased (`src/components/motion.ts`); shapes move and fade but never morph. The grain is static.

## Voice-over and music (free, local)

```bash
npm run setup:tts      # once: local Kokoro-82M text-to-speech (Apache-2.0), fetched from npm into .tts/
npm run voice:day1     # voice/day1.json → public/voice.mp3 + src/videos/day1.voice.json (word timings)
npm run music:day1     # an original ambient bed synthesized with numpy → public/music.mp3
```

- `voice/day1.json` holds what's said, when, and in which voice. Use `|` to group spoken words per caption word
  (`"Sixteen | channels. | Thirty-five million | ..."` lines up with the caption `16 channels. 35M ...`).
- Change the voice with `"voice"` or `--voice` (e.g. `af_heart`, `af_bella`, `am_michael`, `am_fenrir`, `bf_emma`,
  `bm_george`). The captions follow the new timings automatically (`withVoiceTimings` in `src/videos/day1.ts`).
- A line that's too long for its slot is sped up by up to 20%; if it still doesn't fit you get a warning.
- The voice is compressed, limited and set to −14 LUFS (the level Reels and Shorts are mastered to); the video
  plays the music at 15% underneath it.
- `scripts/music.py` follows a plan of chords on the scene cuts (see `PLANS` in the script, or pass a JSON plan).

## Tools

- `npm run stills -- Day1 0 90 300`: render chosen frames to `out/stills/` (one bundle, fast)
- `npm run contact-sheet -- Day1 out/contact.png`: tile those stills with the safe-zone lines drawn in
