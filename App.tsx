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

  useEffect(() => {
    if (state.gameStarted) {
      play('bgm');
    } else {
      stop('bgm');
    }
    return () => stop('bgm');
  }, [state.gameStarted]);

  return null;
};

const GameContainer = () => {
  const { state, dispatch } = useGame();
  const { play } = useAudio();

  const handleStart = (aiEnabled: boolean) => {
    resumeAudioContext();
    play('uiClick');
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
