/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useMemo } from 'react';
// @ts-ignore
import { Howl } from 'howler';

const SOUNDS = {
  place: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  bulldoze: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  reward: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
  bgm: 'https://assets.mixkit.co/active_storage/sfx/1202/1202-preview.mp3' // Ambient city hum
};

export const useAudio = () => {
  const sfx = useMemo(() => ({
    place: new Howl({ src: [SOUNDS.place], volume: 0.4 }),
    bulldoze: new Howl({ src: [SOUNDS.bulldoze], volume: 0.4 }),
    reward: new Howl({ src: [SOUNDS.reward], volume: 0.5 }),
    error: new Howl({ src: [SOUNDS.error], volume: 0.3 }),
    bgm: new Howl({ src: [SOUNDS.bgm], volume: 0.15, loop: true, html5: true }),
  }), []);

  const play = (sound: keyof typeof sfx) => {
    try {
      // If BGM is already playing, don't restart it
      if (sound === 'bgm' && sfx.bgm.playing()) return;
      sfx[sound].play();
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  const stop = (sound: keyof typeof sfx) => {
    try {
      sfx[sound].stop();
    } catch (e) {
       console.warn("Audio stop failed", e);
    }
  }

  return { play, stop };
};