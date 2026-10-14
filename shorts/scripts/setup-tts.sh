#!/usr/bin/env bash
# One-time setup for local, free text-to-speech (Kokoro-82M, Apache-2.0) used by scripts/voiceover.py.
# Everything lands in .tts/ (git-ignored). Needs python3 and npm; no accounts, no API keys.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .tts/pkgs
python3 -m venv .tts/venv
.tts/venv/bin/pip install -q kokoro-onnx==0.4.9 >/dev/null

# Model weights and voice styles, both re-published on npm (Hugging Face isn't needed).
(cd .tts/pkgs && npm pack -s kokoro-q8-shards@1.0.0 kokoro-local-runtime@0.1.0 >/dev/null)
rm -rf .tts/pkgs/shards .tts/pkgs/voices && mkdir -p .tts/pkgs/shards .tts/pkgs/voices
tar xzf .tts/pkgs/kokoro-q8-shards-1.0.0.tgz -C .tts/pkgs/shards
tar xzf .tts/pkgs/kokoro-local-runtime-0.1.0.tgz -C .tts/pkgs/voices package/voices
cat .tts/pkgs/shards/package/kokoro-q8.part{0,1,2,3,4,5}.bin > .tts/kokoro-q8.onnx
echo "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478  .tts/kokoro-q8.onnx" | sha256sum -c -
.tts/venv/bin/python -I scripts/pack_voices.py .tts/pkgs/voices/package/voices .tts/voices.npz
echo "Ready. Next: npm run voice:day1"
