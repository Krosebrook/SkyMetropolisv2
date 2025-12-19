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
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white font-sans p-6 bg-black/70 backdrop-blur-md">
      <div className="max-w-md w-full bg-slate-900/95 p-8 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
        
        <div className="relative z-10">
            <div className="mb-8">
                <h1 className="text-5xl font-black mb-2 bg-gradient-to-br from-white via-cyan-100 to-blue-400 bg-clip-text text-transparent tracking-tighter">
                SkyMetropolis
                </h1>
                <div className="h-1 w-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                <p className="text-slate-400 mt-4 text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">
                AI-Enhanced City Simulation
                </p>
            </div>

            <div className="space-y-4 mb-10">
                {/* AI Toggle - Enhanced Visuals */}
                <div className={`p-[1px] rounded-2xl transition-all duration-700 ${aiEnabled ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_30px_rgba(6,182,212,0.2)]' : 'bg-slate-800'}`}>
                    <div className={`bg-slate-900/95 p-5 rounded-2xl transition-all duration-500 ${aiEnabled ? 'shadow-inner shadow-cyan-500/10' : ''}`}>
                        <label className="flex items-center justify-between cursor-pointer group/toggle">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${aiEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}>
                                        <svg className={`w-5 h-5 ${aiEnabled ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-black text-sm uppercase tracking-wider transition-colors duration-500 ${aiEnabled ? 'text-cyan-400' : 'text-slate-500'}`}>
                                            AI ADVISOR {aiEnabled ? 'INITIALIZED' : 'OFFLINE'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {aiEnabled ? (
                                                <span className="flex h-1.5 w-1.5 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                                                </span>
                                            ) : (
                                                <span className="h-1.5 w-1.5 rounded-full bg-slate-700"></span>
                                            )}
                                            <span className="text-[10px] text-slate-500 group-hover/toggle:text-slate-400 transition-colors">
                                                {aiEnabled ? 'Gemini 3 Flash Strategic Engine Active' : 'Manual oversight enabled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative flex-shrink-0 ml-4">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={aiEnabled}
                                    onChange={(e) => setAiEnabled(e.target.checked)}
                                />
                                <div className={`
                                    w-14 h-7 rounded-full transition-all duration-500 relative
                                    ${aiEnabled ? 'bg-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.5)]' : 'bg-slate-800'}
                                    after:content-[''] after:absolute after:top-[4px] after:left-[4px] 
                                    after:bg-white after:rounded-full after:h-[20px] after:w-[20px] 
                                    after:transition-all after:duration-500 after:shadow-md
                                    peer-checked:after:translate-x-7
                                `}></div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Sandbox Toggle */}
                <div className={`p-1 rounded-2xl transition-all duration-500 ${sandboxMode ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'bg-slate-800/50'}`}>
                    <div className="bg-slate-900/80 p-4 rounded-[calc(1rem-1px)] border border-slate-700/50 hover:border-slate-600 transition-colors shadow-inner">
                        <label className="flex items-center justify-between cursor-pointer group/toggle">
                            <div className="flex flex-col gap-1">
                                <span className={`font-bold text-sm transition-colors ${sandboxMode ? 'text-amber-400' : 'text-slate-400'}`}>
                                    Sandbox Mode
                                </span>
                                <span className="text-[10px] text-slate-500 group-hover/toggle:text-slate-400 transition-colors max-w-[180px]">
                                    Unlimited funds and zero construction costs
                                </span>
                            </div>
                            
                            <div className="relative flex-shrink-0 ml-4">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={sandboxMode}
                                    onChange={(e) => setSandboxMode(e.target.checked)}
                                />
                                <div className={`
                                    w-12 h-6 rounded-full transition-all duration-300 relative
                                    ${sandboxMode ? 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'bg-slate-700'}
                                    after:content-[''] after:absolute after:top-[3px] after:left-[3px] 
                                    after:bg-white after:rounded-full after:h-[18px] after:w-[18px] 
                                    after:transition-all after:duration-300
                                    peer-checked:after:translate-x-6
                                `}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => onStart(aiEnabled, sandboxMode)}
                className="group/btn relative w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-2xl shadow-xl shadow-cyan-900/40 transform transition-all hover:scale-[1.02] active:scale-[0.98] text-lg tracking-widest overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
                
                <span className="relative z-10 flex items-center justify-center gap-2">
                    INITIALIZE CITY
                    <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </span>
            </button>
            
            <p className="text-center mt-6 text-[10px] text-slate-500 font-mono tracking-tight uppercase">
                System Status: Ready • v2.5-Native
            </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default StartScreen;
