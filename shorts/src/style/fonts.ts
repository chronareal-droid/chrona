import { loadFont } from '@remotion/google-fonts/Inter';
import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender } from 'remotion';

export const { fontFamily: INTER, waitUntilDone } = loadFont('normal', { weights: ['800'], subsets: ['latin'] });
export const CAPTION_WEIGHT = 800;

/** True once Inter is loaded; holds the frame until then so captions are measured with the real font. */
export function useFontReady(): boolean {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading Inter'));
  useEffect(() => {
    waitUntilDone()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}
