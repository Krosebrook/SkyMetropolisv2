/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import IsoMap from './components/IsoMap';
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';

const GameContainer = () => {
  const { state, dispatch } = useGame();

  const handleStart = (aiEnabled: boolean) => {
    dispatch({ type: 'START_GAME', aiEnabled });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent bg-sky-900">
      {/* 3D World - Always rendered for background effect */}
      <IsoMap />

      {/* Interface Layer */}
      {state.gameStarted ? (
        <HUD />
      ) : (
        <StartScreen onStart={handleStart} />
      )}
      
      {/* Global CSS injections */}
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