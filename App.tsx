
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import IsoMap from './components/IsoMap';
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';
import { resumeAudioContext, useAudio, SoundKey } from './hooks/useAudio';

const GameAudio = () => {
  const { state } = useGame();
  const { play, stop } = useAudio();
  const lastSoundId = useRef<number>(0);

  useEffect(() => {
    if (state.gameStarted) {
      play('bgm', { fade: 2000 });
    } else {
      stop('bgm', { fade: 1000 });
    }
    return () => stop('bgm', { fade: 500 });
  }, [state.gameStarted, play, stop]);

  useEffect(() => {
    if (state.lastSound && state.lastSound.id !== lastSoundId.current) {
      lastSoundId.current = state.lastSound.id;
      const { key } = state.lastSound;
      
      if (key === 'place' || key === 'bulldoze') {
        play(key as SoundKey, { rate: 0.8 + Math.random() * 0.4 });
      } 
      else if (key === 'error') {
        play('error', { rate: 0.8 });
      } 
      else if (key === 'reward') {
        play('reward', { volume: 0.6 });
      }
      else {
        play(key as SoundKey);
      }
    }
  }, [state.lastSound, play]);

  return null;
};

const GameContainer = () => {
  const { state, dispatch } = useGame();
  const { play } = useAudio();

  // Edge Case: Global listener to unlock audio if start screen was bypassed or on late user interaction
  useEffect(() => {
    const handleInteraction = () => {
      resumeAudioContext();
    };
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const handleStart = (aiEnabled: boolean, sandboxMode: boolean) => {
    resumeAudioContext();
    play('uiClick', { rate: 1.1 });
    dispatch({ type: 'START_GAME', aiEnabled, sandboxMode });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent bg-slate-950">
      <GameAudio />
      <IsoMap />
      {state.gameStarted ? <HUD /> : <StartScreen onStart={handleStart} />}
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
        * { user-select: none; }
      `}</style>
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}

export default App;
