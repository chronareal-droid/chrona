import type { ShortVideoProps } from '../ShortVideo';

// Day 1 of the build-in-public series. 25 s, scene boundaries at 3 / 7 / 11 / 15 / 21 s.
// "\n" in a caption forces the line break; otherwise the caption balances itself over ≤ 2 lines.
export const day1: ShortVideoProps = {
  scenes: [
    {
      seconds: 3,
      scene: 'desk',
      // The hook: fully visible on frame 0 (that frame is also the cover).
      props: { caption: 'YouTube is switching off faceless channels', captionTiming: { instant: true } },
    },
    {
      seconds: 4,
      scene: 'screens',
      // The screens go dark over ~2 s; "Gone." lands as the last one does.
      props: { caption: '16 channels.\n35M subscribers. Gone.', darkTo: 0.6, captionTiming: { at: [6, 10, 24, 28, 72] } },
    },
    { seconds: 4, scene: 'doors', props: { caption: '3 kinds of videos\nYouTube won’t pay for' } },
    { seconds: 4, scene: 'cliff', props: { caption: 'Most creators don’t know\nwhich one they’re making' } },
    { seconds: 6, scene: 'scanner', props: { caption: 'I’m building a tool in 48 hours\nthat tells you first' } },
    { seconds: 4, scene: 'sunrise', props: { caption: 'Launches Friday.\nFollow to get it first.' } },
  ],
  voice: 'voice.mp3',
  music: 'music.mp3',
  musicVolume: 0.15,
};
