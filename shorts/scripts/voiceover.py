"""
Free, local voice-over for a short: synthesizes each line with Kokoro-82M (run scripts/setup-tts.sh once),
places it at its time in the video, loudness-normalizes the result to public/voice.mp3, and writes word timings
so captions can pop in with the voice.

    .tts/venv/bin/python scripts/voiceover.py voice/day1.json [--voice am_michael] [--output public/x.mp3]

Voice script (JSON):
    voice     Kokoro voice id, e.g. af_heart, af_bella, am_michael, am_fenrir, bf_emma, bm_george
    speed     1.0 = natural pace
    layout    "auto": lines run back to back (a `gap` breath between them) and the scene cuts follow the voice,
              snapped to a `grid` (s); the video length comes out of it (`tail` s held after the last line).
              Otherwise each line starts at its `at` and `duration` is the video length.
    lines     [{ scene, say, at? }]: `say` is the spoken text.
              Split `say` with "|" into one group per caption word ("Sixteen | channels. | Thirty-five million"),
              so a spoken phrase can stand for one caption word ("16"). Without "|", every spoken word is a group.

Word timings are estimates (Kokoro doesn't report them): a phoneme-count split of each line anchored on the sentence
pauses found in the audio, averaged with the spoken length of each prefix. Typically within 2–3 frames, which is
plenty for caption pops.
"""
import argparse
import json
import pathlib
import re
import sys

import numpy as np
import onnxruntime as ort
from kokoro_onnx.tokenizer import Tokenizer

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from audio_util import compress, encode_mp3, limit, measure, write_wav  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 24000
HOP = 240  # 10 ms analysis frames
PAUSE_WEIGHT = {".": 6, "!": 6, "?": 6, ",": 3, ";": 3, ":": 3}


class Voice:
    def __init__(self, model: pathlib.Path, voices: pathlib.Path, voice: str):
        self.sess = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
        all_voices = np.load(voices)
        if voice not in all_voices:
            sys.exit(f"Unknown voice {voice!r}. Available: {', '.join(sorted(all_voices.files))}")
        self.style = all_voices[voice]
        self.tok = Tokenizer()

    def phonemes(self, text: str) -> str:
        return self.tok.phonemize(text, lang="en-us")

    def synth(self, text: str, speed: float) -> np.ndarray:
        ids = self.tok.tokenize(self.phonemes(text))
        out = self.sess.run(
            None,
            {
                "input_ids": np.array([[0, *ids, 0]], dtype=np.int64),
                "style": self.style[len(ids)].astype(np.float32),
                "speed": np.array([speed], dtype=np.float32),
            },
        )[0]
        return np.asarray(out, dtype=np.float32).reshape(-1)


def envelope(x: np.ndarray) -> np.ndarray:
    n = len(x) // HOP
    return np.sqrt((x[: n * HOP].reshape(n, HOP) ** 2).mean(axis=1) + 1e-12)


def voiced_span(x: np.ndarray) -> tuple[float, float]:
    env = envelope(x)
    on = np.where(env > env.max() * 0.06)[0]
    return on[0] * HOP / SR, (on[-1] + 1) * HOP / SR


def pauses(x: np.ndarray, start: float, end: float, min_len=0.09) -> list[float]:
    """Centres of silent gaps inside the voiced span (sentence breaks)."""
    env = envelope(x)
    quiet = env < env.max() * 0.04
    out, run = [], 0
    for i, q in enumerate(quiet):
        t = i * HOP / SR
        if q and start < t < end:
            run += 1
        else:
            if run * HOP / SR >= min_len:
                out.append((i - run / 2) * HOP / SR)
            run = 0
    return out


def word_onsets(voice: Voice, groups: list[str], audio: np.ndarray) -> list[float]:
    """Estimated onset (s, relative to the clip) of each group."""
    start, end = voiced_span(audio)
    weights = []
    for g in groups:
        core = len(re.sub(r"[ˈˌː\s.,!?;:]", "", voice.phonemes(g))) or 1
        pause = PAUSE_WEIGHT.get(g.strip()[-1], 0) if g.strip() else 0
        weights.append((core, pause))
    # Sentence breaks inside the line (groups ending in . ! ? before the last group).
    breaks = [i for i, g in enumerate(groups[:-1]) if g.strip()[-1:] in ".!?"]
    gaps = pauses(audio, start, end)
    # Anchor each sentence to the audio when the pauses line up with the punctuation, else spread over the line.
    if breaks and len(gaps) >= len(breaks):
        chosen = gaps if len(gaps) == len(breaks) else pick_gaps(gaps, len(breaks), start, end)
        bounds = [start, *chosen, end]
        segments = [list(range(a + 1, b + 1)) for a, b in zip([-1, *breaks], [*breaks, len(groups) - 1])]
        onsets = [0.0] * len(groups)
        for seg, s0, s1 in zip(segments, bounds[:-1], bounds[1:]):
            total = sum(c for c, _ in (weights[i] for i in seg))
            t = s0
            for i in seg:
                onsets[i] = t
                t += (s1 - s0) * weights[i][0] / total
        return onsets
    total = sum(c + p for c, p in weights)
    onsets, t = [], start
    for c, p in weights:
        onsets.append(t)
        t += (end - start) * (c + p) / total
    return onsets


def pick_gaps(gaps: list[float], n: int, start: float, end: float) -> list[float]:
    """When there are more silent gaps than sentence breaks, keep the ones nearest the expected positions."""
    expected = [start + (end - start) * (k + 1) / (n + 1) for k in range(n)]
    chosen = []
    for e in expected:
        best = min((g for g in gaps if g not in chosen), key=lambda g: abs(g - e))
        chosen.append(best)
    return sorted(chosen)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("--voice")
    ap.add_argument("--speed", type=float)
    ap.add_argument("--output")
    ap.add_argument("--timings")
    ap.add_argument("--model", default=str(ROOT / ".tts/kokoro-q8.onnx"))
    ap.add_argument("--voices", default=str(ROOT / ".tts/voices.npz"))
    args = ap.parse_args()

    spec = json.loads(pathlib.Path(args.script).read_text())
    voice_id = args.voice or spec.get("voice", "af_heart")
    speed = args.speed or spec.get("speed", 1.0)
    output = ROOT / (args.output or spec["output"])
    timings_path = ROOT / (args.timings or spec["timings"])
    auto = spec.get("layout") == "auto"
    lines = spec["lines"] if auto else sorted(spec["lines"], key=lambda l: l["at"])

    if not pathlib.Path(args.model).exists():
        sys.exit("Model not found. Run scripts/setup-tts.sh first.")
    voice = Voice(pathlib.Path(args.model), pathlib.Path(args.voices), voice_id)

    # 1) Synthesize every line (and estimate its word onsets, relative to the start of speech).
    takes = []
    for n, line in enumerate(lines):
        groups = [g.strip() for g in line["say"].split("|")] if "|" in line["say"] else line["say"].split()
        text = " ".join(groups)
        slot = None if auto else (lines[n + 1]["at"] if n + 1 < len(lines) else float(spec["duration"])) - line["at"] - 0.08
        s = speed
        audio = voice.synth(text, s)
        lead, tail = voiced_span(audio)
        # Fixed layout only: too long for its slot → speed up a little (up to +20%) rather than overlap the next line.
        while slot is not None and tail - lead > slot and s < speed * 1.2:
            s = round(s + 0.04, 2)
            audio = voice.synth(text, s)
            lead, tail = voiced_span(audio)
        if slot is not None and tail - lead > slot:
            print(f"warning: line {n} runs {tail - lead - slot:.2f}s over its slot: {text!r}", file=sys.stderr)
        onsets = word_onsets(voice, groups, audio)
        # Second opinion: the length of each spoken prefix ("Sixteen channels.") marks where the next group starts.
        # It runs a little late (a prefix ends on a stretched final word), the phoneme estimate a little early,
        # so take the average.
        for k in range(1, len(groups)):
            p_audio = voice.synth(" ".join(groups[:k]), s)
            p_lead, p_tail = voiced_span(p_audio)
            onsets[k] = (onsets[k] + lead + (p_tail - p_lead)) / 2
        takes.append({"line": line, "groups": groups, "text": text, "speed": s,
                      "audio": audio[int(lead * SR) :],  # trimmed: speech starts at sample 0
                      "length": tail - lead, "onsets": [o - lead for o in onsets]})

    # 2) Place the lines. Fixed: at each line's `at`. Auto: back to back with a short breath between them, each
    #    scene cut just before its line (snapped to the music's beat grid), so there's no dead air.
    if auto:
        gap, lead_in, tail_out = spec.get("gap", 0.4), spec.get("lead", 0.12), spec.get("tail", 1.4)
        grid = spec.get("grid", 0.25)
        snap = lambda t: round(t / grid) * grid  # noqa: E731
        cuts, t = [], 0.0
        for k, take in enumerate(takes):
            cut = 0.0 if k == 0 else max(cuts[-1] + 1.0, snap(t - lead_in))
            cuts.append(cut)
            take["at"] = cut + lead_in if k else spec.get("first", 0.1)
            t = take["at"] + take["length"] + gap
        duration = snap(takes[-1]["at"] + takes[-1]["length"] + tail_out)
        scenes = [{"start": c, "end": (cuts[k + 1] if k + 1 < len(cuts) else duration)} for k, c in enumerate(cuts)]
    else:
        duration = float(spec["duration"])
        for take in takes:
            take["at"] = take["line"]["at"]
        scenes = None

    track = np.zeros(int(duration * SR) + SR, dtype=np.float32)
    out_lines = []
    for n, take in enumerate(takes):
        at = int(take["at"] * SR)
        seg = take["audio"][: max(0, len(track) - at)]
        track[at : at + len(seg)] += seg
        out_lines.append(
            {
                "scene": take["line"]["scene"],
                "start": round(take["at"], 3),
                "end": round(take["at"] + take["length"], 3),
                "speed": take["speed"],
                "words": [round(take["at"] + o, 3) for o in take["onsets"]],
                "text": take["groups"],
            }
        )
        print(f"line {n}: {take['at']:5.2f}s → {take['at'] + take['length']:5.2f}s  speed {take['speed']}  {take['text']}")

    track = track[: int(duration * SR)].astype(np.float64)
    # Voice chain for phone speakers: gentle compression, gain to −14 LUFS (the level Reels/Shorts are mastered
    # to; platforms turn loud videos down, never quiet ones up), then a peak limiter so nothing clips.
    tmp = ROOT / "out" / "voice-raw.wav"
    track = compress(track, SR)
    for _ in range(2):  # limiting costs a little loudness, so measure and top up once more
        write_wav(tmp, track, SR)
        loudness, _ = measure(tmp)
        track = limit(track * 10 ** ((-14.0 - loudness) / 20), SR, ceiling_db=-2.0)
    write_wav(tmp, track, SR)
    encode_mp3(tmp, output)
    tmp.unlink()
    final, peak = measure(output)
    print(f"voice: {final:.1f} LUFS, true peak {peak:.1f} dBTP")
    timings_path.parent.mkdir(parents=True, exist_ok=True)
    timings = {"voice": voice_id, "duration": duration, "lines": out_lines}
    if scenes:
        timings["scenes"] = scenes  # auto layout: the video's scene cuts follow the voice
    timings_path.write_text(json.dumps(timings, indent=2) + "\n")
    if scenes:
        print("scenes: " + ", ".join(f"{sc['start']:.2f}–{sc['end']:.2f}" for sc in scenes) + f"  (video {duration:.2f}s)")
    print(f"wrote {output.relative_to(ROOT)} and {timings_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
