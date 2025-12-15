/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
// @ts-ignore
import { Howl, Howler } from 'howler';

const SOUNDS = {
  place: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  bulldoze: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  reward: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
  uiClick: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  bgm: 'https://assets.mixkit.co/active_storage/sfx/1202/1202-preview.mp3'
};

export type SoundKey = keyof typeof SOUNDS;

// Singleton cache
const sfxCache: Partial<Record<SoundKey, Howl>> = {};

const getSound = (key: SoundKey): Howl => {
  if (!sfxCache[key]) {
    sfxCache[key] = new Howl({
      src: [SOUNDS[key]],
      volume: key === 'bgm' ? 0.0 : (key === 'error' ? 0.3 : 0.4), // Start BGM at 0 for fade-in
      loop: key === 'bgm',
      html5: key === 'bgm',
      onloaderror: (_id: number, error: unknown) => console.warn(`Failed to load sound: ${key}`, error),
    });
  }
  return sfxCache[key]!;
};

export const useAudio = () => {
  const play = (sound: SoundKey, options?: { rate?: number, volume?: number, fade?: number }) => {
    try {
      const s = getSound(sound);
      
      // Apply options
      // Always set rate to default 1.0 if not specified to avoid state sticking from previous plays
      s.rate(options?.rate ?? 1.0);
      
      if (options?.volume) s.volume(options.volume);

      if (sound === 'bgm') {
        if (!s.playing()) {
          s.play();
          if (options?.fade) {
            s.fade(0, 0.15, options.fade); // Fade in to 0.15 volume
          } else {
            s.volume(0.15);
          }
        }
      } else {
        // One-shots can overlap
        s.play();
      }
    } catch (e) {
      console.warn("Audio play error", e);
    }
  };

  const stop = (sound: SoundKey, options?: { fade?: number }) => {
    try {
      const s = getSound(sound);
      if (options?.fade && s.playing()) {
        s.fade(s.volume(), 0, options.fade);
        setTimeout(() => s.stop(), options.fade);
      } else {
        s.stop();
      }
    } catch (e) {
       console.warn("Audio stop error", e);
    }
  };

  return { play, stop };
};

export const resumeAudioContext = () => {
  try {
    if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
  } catch (e) {
    console.error("Audio Context Resume Failed", e);
  }
};