import React from 'react';
import { Composition, Folder } from 'remotion';
import { ShortVideo, type ShortVideoProps, totalFrames } from './ShortVideo';
import { VIDEO } from './style/theme';
import { day1 } from './videos/day1';

const short = (id: string, props: ShortVideoProps) => (
  <Composition
    key={id}
    id={id}
    component={ShortVideo}
    width={VIDEO.width}
    height={VIDEO.height}
    fps={VIDEO.fps}
    durationInFrames={totalFrames(props.scenes, VIDEO.fps)}
    defaultProps={props}
    calculateMetadata={({ props: p }) => ({ durationInFrames: totalFrames(p.scenes, VIDEO.fps) })}
  />
);

// One preview per scene, for building new videos in this style.
const sceneDemo = (scene: ShortVideoProps['scenes'][number]): ShortVideoProps => ({ scenes: [scene], voice: null, music: null });

export const RemotionRoot: React.FC = () => (
  <>
    {short('Day1', day1)}
    <Folder name="Scenes">
      {short('SceneDesk', sceneDemo({ seconds: 4, scene: 'desk', props: { caption: 'A lone desk, late at night' } }))}
      {short('SceneScreens', sceneDemo({ seconds: 4, scene: 'screens', props: { caption: 'The screens go dark' } }))}
      {short('SceneDoors', sceneDemo({ seconds: 4, scene: 'doors', props: { caption: 'Three doors' } }))}
      {short('SceneCliff', sceneDemo({ seconds: 4, scene: 'cliff', props: { caption: 'Walking to the edge' } }))}
      {short('SceneScanner', sceneDemo({ seconds: 6, scene: 'scanner', props: { caption: 'Checking every thumbnail' } }))}
      {short('SceneSunrise', sceneDemo({ seconds: 4, scene: 'sunrise', props: { caption: 'Something new is coming' } }))}
    </Folder>
  </>
);
