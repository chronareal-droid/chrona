# Packs Kokoro raw voice style files (float32, 510×256) into the .npz kokoro-onnx loads.
import sys, pathlib, numpy as np
src, out = pathlib.Path(sys.argv[1]), sys.argv[2]
voices = {}
for f in sorted(src.glob('*.bin')):
    a = np.fromfile(f, dtype='<f4')
    assert a.size == 510 * 256, (f, a.size)
    voices[f.stem] = a.reshape(510, 1, 256)
np.savez(out, **voices)
print(len(voices), 'voices ->', out)
