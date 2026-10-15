import { sceneFrame, type VoiceTimings, withVoiceLayout, withVoiceTimings } from '../components/voiceSync';
import { sceneLayout, type ShortVideoProps } from '../ShortVideo';
import voiceTimings from './day1.voice.json';

// Day 1 of the build-in-public series. Voice: am_michael (Kokoro), from voice/day1.json.
// The lines run back to back and each scene lasts as long as its line ("layout": "auto"), so there's no dead air:
// `npm run voice:day1` regenerates public/voice.mp3 + ./day1.voice.json, then `npm run music:day1` re-fits the music.
// The `seconds` below are only fallbacks for when no voice timings exist.
// "\n" in a caption forces the line break; otherwise the caption balances itself over ≤ 2 lines.
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
  // Background music level between lines; it dips to 55% of this under the voice.
  musicVolume: 0.42,
  duckTo: 0.55,
};

const SCREENS_FADE = 8;

/** The Day 1 script voiced by a given take: scene lengths and caption pops follow its timings. */
function voiced(timings: VoiceTimings): ShortVideoProps {
  const props = withVoiceLayout(
    { ...script, scenes: script.scenes.map((s) => ({ ...s, props: { ...s.props } }) as typeof s) },
    timings,
  );
  // The last screen finishes going dark just as "Gone." (word 4 of scene 1) is spoken.
  const gone = sceneFrame(props, timings, 1, 4);
  const screens = props.scenes[1];
  if (gone !== null && screens.scene === 'screens') {
    const sceneFrames = sceneLayout(props.scenes, 30)[1].durationInFrames;
    screens.props.darkTo = Math.min(0.95, (gone + SCREENS_FADE / 2) / sceneFrames);
  }
  return withVoiceTimings(props, timings);
}

export const day1: ShortVideoProps = voiced(voiceTimings as VoiceTimings);
