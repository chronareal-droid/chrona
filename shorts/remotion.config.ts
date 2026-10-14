import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
// CRF isn't set here: h264's default (18) already keeps the grain and gradients clean, and an explicit CRF
// would make other codecs (ProRes, GIF, WAV) refuse to render.
Config.setPixelFormat('yuv420p');
// Standard-range BT.709, what Instagram and YouTube expect (the default tags full-range BT.601).
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);
