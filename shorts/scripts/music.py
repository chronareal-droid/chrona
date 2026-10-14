"""
An original ambient music bed, synthesized from scratch with numpy (no samples, no licences to worry about).

    python3 scripts/music.py --plan day1 --out public/music.mp3
    python3 scripts/music.py --plan my-plan.json --out public/music.mp3

A plan is a list of sections; chords change on the video's scene cuts:

    { "duration": 25, "sections": [
        { "at": 0,  "chord": ["D2", "A2", "D3", "F3", "A3", "E4"] },
        { "at": 15, "chord": [...], "tick": 0.5 },          # soft clock tick every 0.5 s ("48 hours")
        { "at": 21, "chord": [...], "bells": ["F5", "A5", "C6"], "bright": 1.0 } ] }

Sound: warm detuned additive pads (two voices per note, panned apart), a sine sub on the root, a whisper of
filtered air, long crossfades between chords, and a convolution reverb. Loudness-normalised so the video's
15% music volume sits well under the voice.
"""
import argparse
import json
import pathlib
import re
import sys
import wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from audio_util import normalize_to_mp3  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
rng = np.random.default_rng(7)

PLANS = {
    # Dark and still → a cold turn → tension → a pulse while building → a warm lift at the sunrise.
    "day1": {
        "duration": 25,
        "sections": [
            {"at": 0, "chord": ["D2", "A2", "D3", "F3", "A3", "E4"], "bright": 0.25},
            {"at": 7, "chord": ["Bb1", "F2", "D3", "F3", "A3", "D4"], "bright": 0.3},
            {"at": 11, "chord": ["G1", "D2", "Bb2", "D3", "G3", "A3"], "bright": 0.3},
            {"at": 15, "chord": ["D2", "A2", "D3", "F3", "A3", "E4"], "bright": 0.45, "tick": 0.5},
            {"at": 18, "chord": ["C2", "G2", "C3", "E3", "G3", "D4"], "bright": 0.55, "tick": 0.5},
            {"at": 21, "chord": ["F1", "C2", "F2", "A2", "C3", "G3", "A3"], "bright": 0.9, "bells": ["F5", "A5", "C6", "E6"]},
        ],
    }
}

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def freq(name: str) -> float:
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", name)
    if not m:
        raise ValueError(f"bad note {name!r}")
    semis = NOTE[m[1]] + {"#": 1, "b": -1, "": 0}[m[2]] + 12 * (int(m[3]) + 1)
    return 440.0 * 2 ** ((semis - 69) / 12)


def envelope(n: int, attack: int, release: int) -> np.ndarray:
    env = np.ones(n)
    a = min(attack, n // 2)
    r = min(release, n - a)
    env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    env[n - r :] = np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return env


def pad_note(f: float, n: int, bright: float, attack: int, release: int) -> np.ndarray:
    """Stereo (2, n) additive pad note: 6 partials, two voices ±6 cents, slow independent drift."""
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for side, cents in ((0, -6.0), (1, 6.0)):
        fv = f * 2 ** (cents / 1200)
        drift = 1 + 0.0015 * np.sin(2 * np.pi * (0.07 + 0.03 * side) * t + rng.uniform(0, 6.28))
        phase = 2 * np.pi * np.cumsum(fv * drift) / SR
        voice = np.zeros(n)
        for k in range(1, 7):
            # brighter sections let more upper partials through; very high partials always stay soft
            amp = (1 / k**1.6) * (1 if k == 1 else bright ** (0.5 * (k - 1)))
            if fv * k > 6000:
                break
            voice += amp * np.sin(k * phase + rng.uniform(0, 6.28))
        out[side] = voice
    # slow breathing tremolo so a held chord doesn't sound static
    trem = 1 + 0.08 * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6.28))
    return out * envelope(n, attack, release) * trem


def bell(f: float, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    # inharmonic partials with fast decay on the top ones: a soft glassy bell
    tone = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 1.6), (2.01, 0.35, 3.0), (3.98, 0.12, 5.5)))
    return tone * envelope(n, int(0.004 * SR), int(0.4 * SR))


def tick(n: int) -> np.ndarray:
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1900 * t) * 0.6 + np.sin(2 * np.pi * 3100 * t) * 0.25) * np.exp(-t * 90)


def lowpass_noise(n: int, cutoff: float) -> np.ndarray:
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, n)


def reverb_ir(seconds=3.2) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for ch in range(2):
        noise = lowpass_noise(n, 5200)
        ir[ch] = noise * np.exp(-t * (6.9 / seconds))  # −60 dB at `seconds`
    ir[:, : int(0.018 * SR)] = 0  # pre-delay
    return ir / np.abs(ir).max()


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    n = x.shape[1] + ir.shape[1]
    size = 1 << (n - 1).bit_length()
    out = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:, : x.shape[1]]
    return out


def render(plan: dict) -> np.ndarray:
    total = int(plan["duration"] * SR)
    mix = np.zeros((2, total))
    sections = plan["sections"]
    xfade = int(1.4 * SR)
    for i, sec in enumerate(sections):
        start = int(sec["at"] * SR)
        end = int(sections[i + 1]["at"] * SR) if i + 1 < len(sections) else total
        s0 = max(0, start - xfade // 2)
        s1 = min(total, end + xfade // 2) if i + 1 < len(sections) else total
        n = s1 - s0
        bright = sec.get("bright", 0.4)
        chord = sec["chord"]
        for j, name in enumerate(chord):
            f = freq(name)
            gain = 0.55 if j == 0 else 0.32 / (1 + 0.15 * j)  # root a bit stronger, upper voices softer
            attack = xfade if i else int(0.25 * SR)  # the hook starts almost at once
            release = xfade if i + 1 < len(sections) else int(2.5 * SR)
            mix[:, s0:s1] += gain * pad_note(f, n, bright, attack, release)
        # sine sub an octave under the root
        t = np.arange(n) / SR
        sub = 0.35 * np.sin(2 * np.pi * freq(chord[0]) / 2 * t) * envelope(n, xfade if i else int(0.25 * SR), xfade)
        mix[:, s0:s1] += sub
        if "tick" in sec:
            every = int(sec["tick"] * SR)
            for k, pos in enumerate(range(start, end, every)):
                tk = tick(int(0.06 * SR)) * (0.18 if k % 2 == 0 else 0.11)
                seg = tk[: total - pos]
                pan = 0.6 if k % 2 == 0 else 0.4
                mix[0, pos : pos + len(seg)] += seg * (1 - pan) * 2
                mix[1, pos : pos + len(seg)] += seg * pan * 2
        for k, name in enumerate(sec.get("bells", [])):
            pos = start + int((0.35 + 0.55 * k) * SR)
            if pos >= total:
                break
            b = bell(freq(name), min(int(3.5 * SR), total - pos)) * 0.22
            pan = 0.35 + 0.1 * k
            mix[0, pos : pos + len(b)] += b * (1 - pan) * 2
            mix[1, pos : pos + len(b)] += b * pan * 2
    # a whisper of air, swelling slightly toward the end
    air = np.stack([lowpass_noise(total, 900), lowpass_noise(total, 900)])
    air *= 0.02 * np.linspace(0.6, 1.0, total)
    mix += air / np.abs(air).max() * 0.03
    wet = convolve(mix, reverb_ir())
    out = 0.62 * mix + 0.38 * wet / np.abs(wet).max() * np.abs(mix).max()
    out *= envelope(total, int(0.2 * SR), int(1.8 * SR))
    out -= out.mean(axis=1, keepdims=True)
    return out / np.abs(out).max() * 0.9


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", default="day1", help="built-in plan name or a JSON file")
    ap.add_argument("--out", default="public/music.mp3")
    args = ap.parse_args()
    plan = PLANS[args.plan] if args.plan in PLANS else json.loads(pathlib.Path(args.plan).read_text())

    audio = render(plan)
    tmp = ROOT / "out" / "music-raw.wav"
    tmp.parent.mkdir(exist_ok=True)
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((audio.T * 32767).astype("<i2").tobytes())
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    # The video plays music at 15%, so a full-level file here becomes a quiet bed (≈ 20 dB under the voice).
    normalize_to_mp3(tmp, out, -14)
    tmp.unlink()
    print(f"wrote {out.relative_to(ROOT)} ({plan['duration']} s)")


if __name__ == "__main__":
    main()
