"""Shared helpers for the audio scripts (stdlib only): ffmpeg via Remotion's bundled binary, loudness normalisation."""
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent


def ffmpeg(*args: str, capture=False) -> str:
    res = subprocess.run(
        ["npx", "remotion", "ffmpeg", "-hide_banner", "-y", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return res.stderr if capture else ""


def normalize_to_mp3(src: pathlib.Path, dst: pathlib.Path, lufs: float, channels: int = 2, peak_db: float = -1.0) -> None:
    """Measure EBU R128 loudness, then apply one plain gain to hit `lufs` (capped so true peak stays ≤ peak_db).
    (loudnorm's own linear mode silently falls back to dynamic compression on speech with pauses.)"""
    log = ffmpeg("-i", str(src), "-af", "loudnorm=print_format=json", "-f", "null", "-", capture=True)
    m = json.loads(re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", log)[-1])
    measured = float(m["input_i"])  # (ffmpeg's mono→stereo up-mix keeps loudness the same)
    gain = min(lufs - measured, peak_db - float(m["input_tp"]))
    print(f"{dst.name}: measured {measured:.1f} LUFS, peak {float(m['input_tp']):.1f} dBTP → gain {gain:+.1f} dB")
    dst.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg("-loglevel", "error", "-i", str(src), "-af", f"volume={gain:.2f}dB,aresample=44100", "-ac", str(channels),
           "-c:a", "libmp3lame", "-b:a", "192k", str(dst))


def measure(path: pathlib.Path) -> tuple[float, float]:
    """(integrated loudness LUFS, true peak dBTP) of an audio file."""
    log = ffmpeg("-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-", capture=True)
    m = json.loads(re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", log)[-1])
    return float(m["input_i"]), float(m["input_tp"])


def compress(x, sr: int, threshold_db=-26.0, ratio=3.0, attack_ms=5.0, release_ms=120.0):
    """Gentle feed-forward compressor on a mono float signal (evens out word-to-word level for small speakers)."""
    import numpy as np

    win = max(1, int(sr * 0.01))
    rms = np.sqrt(np.convolve(x * x, np.ones(win) / win, mode="same") + 1e-12)
    level = 20 * np.log10(rms)
    over = np.maximum(0.0, level - threshold_db)
    target = -over * (1 - 1 / ratio)  # dB of gain reduction wanted
    a = np.exp(-1 / (sr * attack_ms / 1000))
    r = np.exp(-1 / (sr * release_ms / 1000))
    g = np.empty_like(target)
    cur = 0.0
    for i, t in enumerate(target):  # one-pole smoothing: fast when reducing, slow when recovering
        coef = a if t < cur else r
        cur = coef * cur + (1 - coef) * t
        g[i] = cur
    return x * 10 ** (g / 20)


def limit(x, sr: int, ceiling_db=-2.0, lookahead_ms=4.0, release_ms=60.0):
    """Look-ahead peak limiter: no sample exceeds the ceiling; gain dips start just before each peak."""
    import numpy as np

    ceiling = 10 ** (ceiling_db / 20)
    need = np.minimum(1.0, ceiling / (np.abs(x) + 1e-12))
    la = max(1, int(sr * lookahead_ms / 1000))
    # minimum over the look-ahead window (so the gain is already down when the peak arrives)
    padded = np.concatenate([need, np.ones(la)])
    windowed = np.lib.stride_tricks.sliding_window_view(padded, la + 1).min(axis=1)[: len(x)]
    r = np.exp(-1 / (sr * release_ms / 1000))
    g = np.empty_like(windowed)
    cur = 1.0
    for i, w in enumerate(windowed):
        cur = w if w < cur else r * cur + (1 - r) * w
        g[i] = cur
    return np.clip(x * g, -ceiling, ceiling)


def write_wav(path: pathlib.Path, x, sr: int) -> None:
    import wave

    import numpy as np

    path.parent.mkdir(parents=True, exist_ok=True)
    data = np.atleast_2d(x)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(data.shape[0])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(data.T, -1, 1) * 32767).astype("<i2").tobytes())


def encode_mp3(src: pathlib.Path, dst: pathlib.Path, channels: int = 2) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg("-loglevel", "error", "-i", str(src), "-af", "aresample=44100", "-ac", str(channels), "-c:a", "libmp3lame", "-b:a", "192k", str(dst))
