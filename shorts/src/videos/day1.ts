import { sceneFrame, type VoiceTimings, withVoiceTimings } from '../components/voiceSync';
import type { ShortVideoProps } from '../ShortVideo';
import voiceTimings from './day1.voice.json';
import maleVoiceTimings from './day1.voice.am_michael.json';

// Day 1 of the build-in-public series. 25 s, scene boundaries at 3 / 7 / 11 / 15 / 21 s.
// "\n" in a caption forces the line break; otherwise the caption balances itself over ≤ 2 lines.
// Voice-over: voice/day1.json → `npm run voice:day1` regenerates public/voice.mp3 and ./day1.voice.json,
// and the captions below pop in with the spoken words automatically.
const script: ShortVideoProps = {
  scenes: [
    {
      seconds: 3,
      scene: 'desk',
      // The hook: fully visible on frame 0 (that frame is also the cover).
      props: { caption: 'YouTube is switching off faceless channels', captionTiming: { instant: true } },
    },
    { seconds: 4, scene: 'screens', props: { caption: '16 channels.\n35M subscribers. Gone.' } },
    { seconds: 4, scene: 'doors', props: { caption: '3 kinds of videos\nYouTube won’t pay for' } },
    { seconds: 4, scene: 'cliff', props: { caption: 'Most creators don’t know\nwhich one they’re making' } },
    { seconds: 6, scene: 'scanner', props: { caption: 'I’m building a tool in 48 hours\nthat tells you first' } },
    { seconds: 4, scene: 'sunrise', props: { caption: 'Launches Friday.\nFollow to get it first.' } },
  ],
  voice: 'voice.mp3',
  music: 'music.mp3',
  musicVolume: 0.15,
};

const SCREENS_FADE = 8;

/** The Day 1 script voiced by a given take: captions follow its word timings. */
function voiced(timings: VoiceTimings, voiceFile: string): ShortVideoProps {
  const props: ShortVideoProps = { ...script, voice: voiceFile, scenes: script.scenes.map((s) => ({ ...s, props: { ...s.props } }) as typeof s) };
  // The last screen finishes going dark just as "Gone." (word 4 of scene 1) is spoken.
  const gone = sceneFrame(props, timings, 1, 4);
  const screens = props.scenes[1];
  if (gone !== null && screens.scene === 'screens') {
    const sceneFrames = 4 * 30 + 6; // 4 s plus the crossfade overlap on both sides
    screens.props.darkTo = Math.min(0.95, (gone + SCREENS_FADE / 2) / sceneFrames);
  }
  return withVoiceTimings(props, timings);
}

/** Voice: af_heart (Kokoro). Regenerate with `npm run voice:day1`. */
export const day1: ShortVideoProps = voiced(voiceTimings as VoiceTimings, 'voice.mp3');

/** The same video with a male voice (am_michael), for A/B testing. */
export const day1MaleVoice: ShortVideoProps = voiced(maleVoiceTimings as VoiceTimings, 'voice-am_michael.mp3');
