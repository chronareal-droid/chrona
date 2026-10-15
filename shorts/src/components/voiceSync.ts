// Ties caption word pops to a generated voice-over (scripts/voiceover.py writes the timings JSON).
import { sceneLayout, type ShortVideoProps } from '../ShortVideo';

export interface VoiceTimings {
  voice: string;
  duration?: number;
  lines: { scene: number; start: number; end: number; words: number[]; text: string[] }[];
  /** Present when the voice script used "layout": "auto": the scene cuts follow the voice. */
  scenes?: { start: number; end: number }[];
}

/** Words pop this many frames before they're spoken: text that leads the voice slightly reads as "in sync". */
const LEAD_FRAMES = 2;

/** Scene-relative frame of a moment in the video (seconds), for a given scene. */
export function sceneFrame(props: ShortVideoProps, timings: VoiceTimings, scene: number, word: number, fps = 30): number | null {
  const line = timings.lines.find((l) => l.scene === scene);
  if (!line || word >= line.words.length) return null;
  return Math.round(line.words[word] * fps) - sceneLayout(props.scenes, fps)[scene].from;
}

/**
 * Returns the script with each scene's caption words popping in as they're spoken.
 * Scenes whose caption is `instant` (the hook) keep it; a line whose word groups don't match the caption's word
 * count is left alone with a warning (fix the "|" groups in the voice script).
 */
export function withVoiceTimings(props: ShortVideoProps, timings: VoiceTimings, fps = 30): ShortVideoProps {
  props = withVoiceLayout(props, timings);
  const layout = sceneLayout(props.scenes, fps);
  const scenes = props.scenes.map((s, i) => {
    const line = timings.lines.find((l) => l.scene === i);
    if (!line || s.props.captionTiming?.instant) return s;
    const captionWords = s.props.caption.split(/\s+/).filter(Boolean).length;
    if (captionWords !== line.words.length) {
      console.warn(`voiceSync: scene ${i} caption has ${captionWords} words but the voice line has ${line.words.length} groups`);
      return s;
    }
    const at = line.words.map((t) => Math.max(0, Math.round(t * fps) - layout[i].from - LEAD_FRAMES));
    return { ...s, props: { ...s.props, captionTiming: { ...s.props.captionTiming, at } } } as typeof s;
  });
  // The music ducks under every spoken line.
  return { ...props, scenes, duck: timings.lines.map((l) => [l.start, l.end] as [number, number]) };
}

/** Scene lengths from the voice-over (when it was laid out automatically), so cuts follow the lines. */
export function withVoiceLayout(props: ShortVideoProps, timings: VoiceTimings): ShortVideoProps {
  if (!timings.scenes || timings.scenes.length !== props.scenes.length) return props;
  return {
    ...props,
    scenes: props.scenes.map((s, i) => ({ ...s, seconds: timings.scenes![i].end - timings.scenes![i].start })),
  };
}
