
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface StartScreenProps {
  onStart: (aiEnabled: boolean, sandboxMode: boolean) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-6 bg-slate-950 overflow-hidden">
      {/* Background Grid Decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#2dd4bf 1px, transparent 1px), linear-gradient(90deg, #2dd4bf 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="relative max-w-lg w-full glass-panel p-16 rounded-[2rem] text-center animate-in fade-in zoom-in duration-700">
        
        <div className="mb-16">
            <h1 className="text-7xl font-bold tracking-tighter text-white">
                METROPOLIS <span className="text-cyber-teal">2.5</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">
                Urban Infrastructure Simulation
            </p>
        </div>

        <div className="space-y-4 mb-16">
            <ToggleOption 
                active={aiEnabled} 
                onClick={() => setAiEnabled(!aiEnabled)}
                label="Nexus AI Interface"
                sub="Heuristic support and strategy analytics."
                color="border-cyber-purple"
                activeColor="bg-cyber-purple"
            />
            <ToggleOption 
                active={sandboxMode} 
                onClick={() => setSandboxMode(!sandboxMode)}
                label="Infinite Credits"
                sub="Bypass economic constraints for open design."
                color="border-cyber-lime"
                activeColor="bg-cyber-lime"
            />
        </div>

        <button 
            onClick={() => onStart(aiEnabled, sandboxMode)}
            className="w-full py-8 bg-white text-black font-black rounded-xl shadow-2xl text-xl uppercase tracking-widest hover:bg-cyber-teal transition-colors neon-btn"
        >
            Initialize Grid
        </button>
      </div>
      
      <div className="mt-16 text-slate-700 font-mono text-[10px] uppercase tracking-widest flex gap-12">
         <span>System v2.5.0</span>
         <span>Connection: Secure</span>
         <span>Latency: 24ms</span>
      </div>
    </div>
  );
};

const ToggleOption = ({ active, onClick, label, sub, color, activeColor }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-6 rounded-xl border transition-all flex items-center justify-between glass-panel neon-btn ${active ? color : 'border-glass-border'}`}
    >
       <div className="text-left">
            <span className={`block font-bold text-lg ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{sub}</span>
       </div>
       <div className={`w-12 h-6 rounded-full relative transition-colors ${active ? activeColor : 'bg-slate-800'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`} />
       </div>
    </button>
);

export default StartScreen;
