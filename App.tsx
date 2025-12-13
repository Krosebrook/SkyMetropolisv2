/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import IsoMap from './components/IsoMap';
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';
import { resumeAudioContext, useAudio } from './hooks/useAudio';

const GameAudio = () => {
  const { state } = useGame();
  const { play, stop } = useAudio();

  // Background Music
  useEffect(() => {
    if (state.gameStarted) {
      // Fade in BGM over 2 seconds
      play('bgm', { fade: 2000 });
    } else {
      // Fade out BGM over 1 second
      stop('bgm', { fade: 1000 });
    }
    return () => stop('bgm', { fade: 500 });
  }, [state.gameStarted, play, stop]);

  // Sound Effects
  useEffect(() => {
    if (state.lastSound) {
      const { key } = state.lastSound;
      
      // Randomized pitch for repetitive actions
      if (key === 'place' || key === 'bulldoze') {
        const pitch = 0.9 + Math.random() * 0.2;
        play(key as any, { rate: pitch });
      } 
      else if (key === 'error') {
        play('error', { rate: 0.8 });
      } 
      else if (key === 'reward') {
        play('reward', { volume: 0.6 });
      }
      else {
        play(key as any);
      }
    }
  }, [state.lastSound, play]);

  return null;
};

const GameContainer = () => {
  const { state, dispatch } = useGame();
  const { play } = useAudio();

  const handleStart = (aiEnabled: boolean) => {
    resumeAudioContext();
    play('uiClick', { rate: 1.1 }); // Slightly higher pitch for start button
    dispatch({ type: 'START_GAME', aiEnabled });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent bg-sky-900">
      <GameAudio />
      <IsoMap />
      {state.gameStarted ? <HUD /> : <StartScreen onStart={handleStart} />}
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
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
