/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useCallback, useRef } from 'react';
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

const sfxCache: Partial<Record<SoundKey, Howl>> = {};

const getSound = (key: SoundKey): Howl => {
  if (!sfxCache[key]) {
    sfxCache[key] = new Howl({
      src: [SOUNDS[key]],
      volume: key === 'bgm' ? 0.0 : 0.4,
      loop: key === 'bgm',
      html5: key === 'bgm',
    });
  }
  return sfxCache[key]!;
};

export const useAudio = () => {
  const play = useCallback((sound: SoundKey, options?: { rate?: number, volume?: number, fade?: number }) => {
    try {
      const s = getSound(sound);
      s.rate(options?.rate ?? 1.0);
      if (options?.volume !== undefined) s.volume(options.volume);

      if (sound === 'bgm') {
        if (!s.playing()) {
          s.play();
          if (options?.fade) s.fade(0, 0.15, options.fade);
          else s.volume(0.15);
        }
      } else {
        s.play();
      }
    } catch (e) {
      console.warn("Audio Context Error:", e);
    }
  }, []);

  const stop = useCallback((sound: SoundKey, options?: { fade?: number }) => {
    try {
      const s = getSound(sound);
      if (options?.fade && s.playing()) {
        s.fade(s.volume(), 0, options.fade);
        setTimeout(() => s.stop(), options.fade);
      } else {
        s.stop();
      }
    } catch (e) {}
  }, []);

  return { play, stop };
};

export const resumeAudioContext = () => {
  if (Howler && Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume();
  }
};
