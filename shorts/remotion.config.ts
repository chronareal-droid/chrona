import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
// Lower CRF = higher quality. 18 keeps the grain and soft gradients from banding after platform re-encoding.
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
// Standard-range BT.709, what Instagram and YouTube expect (the default tags full-range BT.601).
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);
