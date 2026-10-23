// Remotion CLI config. https://www.remotion.dev/docs/config
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setConcurrency(null); // null = Remotion picks (half the CPU threads)
// Chromium flags that keep CSS filters/blur deterministic and fast on CPU-only machines:
Config.setChromiumOpenGlRenderer('angle');
