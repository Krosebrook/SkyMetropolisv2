/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useGame } from '../context/GameContext';
import { BuildingType } from '../types';
import { BUILDINGS } from '../constants';

const StatBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{label}</span>
        <span className={`text-xl font-mono font-black ${color} drop-shadow-md`}>{value}</span>
    </div>
);

const HUD = () => {
    const { state, dispatch, actions } = useGame();
    const { stats, selectedTool, currentGoal, aiEnabled, newsFeed } = state;

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 font-sans">
            
            {/* --- TOP BAR --- */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-gray-900/90 p-3 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-xl flex gap-6">
                    <StatBox label="Funds" value={`$${stats.money}`} color="text-green-400" />
                    <div className="w-px bg-gray-700"></div>
                    <StatBox label="Pop" value={`${stats.population}`} color="text-blue-300" />
                    <div className="w-px bg-gray-700"></div>
                    <StatBox label="Happy" value={`${stats.happiness}%`} color="text-pink-300" />
                    <div className="w-px bg-gray-700"></div>
                    <StatBox label="Day" value={`${stats.day}`} color="text-white" />
                </div>

                {aiEnabled && (
                    <div className="bg-indigo-900/90 p-4 rounded-2xl border border-indigo-500/50 shadow-lg backdrop-blur-xl w-80 transition-all">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase text-indigo-300 tracking-wider">AI Objective</span>
                            {state.isGeneratingGoal && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></span>}
                        </div>
                        {currentGoal ? (
                            <>
                                <p className="text-sm text-white font-medium mb-3 italic">"{currentGoal.description}"</p>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="bg-indigo-800 px-2 py-1 rounded text-indigo-200">
                                        Goal: {currentGoal.targetType === 'money' ? '$' : ''}{currentGoal.targetValue} {currentGoal.targetType === 'building_count' ? 'Builds' : ''}
                                    </span>
                                    {currentGoal.completed ? (
                                        <button 
                                            onClick={actions.claimReward}
                                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded animate-bounce shadow-green-500/50 shadow-lg"
                                        >
                                            Claim ${currentGoal.reward}
                                        </button>
                                    ) : (
                                        <span className="text-yellow-400 font-mono">+${currentGoal.reward}</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-indigo-300/50 italic">Analyzing city metrics...</div>
                        )}
                    </div>
                )}
            </div>

            {/* --- BOTTOM BAR --- */}
            <div className="flex items-end justify-between pointer-events-auto">
                <div className="bg-gray-900/80 p-2 rounded-2xl border border-gray-600/50 backdrop-blur-xl flex gap-2 overflow-x-auto max-w-lg">
                    {Object.values(BUILDINGS).map((b) => (
                        <button
                            key={b.type}
                            onClick={() => dispatch({type: 'SELECT_TOOL', tool: b.type})}
                            disabled={stats.money < b.cost && b.type !== BuildingType.None}
                            className={`
                                relative w-14 h-14 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center
                                shadow-lg backdrop-blur-md
                                ${selectedTool === b.type ? 'border-white bg-white/20 scale-110 z-10' : 'border-gray-600 bg-gray-900/80 hover:bg-gray-800'}
                                ${stats.money < b.cost && b.type !== BuildingType.None ? 'opacity-50 grayscale' : ''}
                            `}
                        >
                            <div className="w-6 h-6 rounded bg-current mb-1 shadow-inner" style={{color: b.color}}></div>
                            <span className="text-[9px] font-bold text-white uppercase">{b.name}</span>
                            <span className="text-[9px] text-gray-300 font-mono">${b.cost}</span>
                        </button>
                    ))}
                </div>

                <div className="w-80 h-40 bg-black/80 rounded-xl border border-gray-800 overflow-hidden flex flex-col relative">
                    <div className="bg-gray-800 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase flex justify-between">
                        <span>City Feed</span>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs mask-image-b">
                        {newsFeed.slice().reverse().map((news) => (
                            <div key={news.id} className={`border-l-2 pl-2 ${news.type === 'positive' ? 'border-green-500 text-green-200' : news.type === 'negative' ? 'border-red-500 text-red-200' : 'border-blue-500 text-blue-200'}`}>
                                {news.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HUD;
