/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { memo } from 'react';
import { useGame } from '../context/GameContext';
import { BuildingType, CityStats, AIGoal, NewsItem } from '../types';
import { BUILDINGS } from '../constants';

// --- Sub-Components ---

const StatBox = memo(({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="flex flex-col" role="group" aria-label={`${label} Statistic`}>
        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{label}</span>
        <span className={`text-xl font-mono font-black ${color} drop-shadow-md`}>{value}</span>
    </div>
));

const MissionPanel = memo(({ goal, isGenerating, onClaim }: { goal: AIGoal | null, isGenerating: boolean, onClaim: () => void }) => {
    return (
        <div className="bg-indigo-900/90 p-4 rounded-2xl border border-indigo-500/50 shadow-lg backdrop-blur-xl w-80 transition-all pointer-events-auto" role="status" aria-live="polite">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-indigo-300 tracking-wider">AI Objective</span>
                {isGenerating && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" aria-label="Processing"></span>}
            </div>
            {goal ? (
                <>
                    <p className="text-sm text-white font-medium mb-3 italic">"{goal.description}"</p>
                    <div className="flex justify-between items-center text-xs">
                        <span className="bg-indigo-800 px-2 py-1 rounded text-indigo-200">
                            Goal: {goal.targetType === 'money' ? '$' : ''}{goal.targetValue} {goal.targetType === 'building_count' ? 'Builds' : ''}
                        </span>
                        {goal.completed ? (
                            <button 
                                onClick={onClaim}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded animate-bounce shadow-green-500/50 shadow-lg cursor-pointer"
                                aria-label={`Claim reward of ${goal.reward} dollars`}
                            >
                                Claim ${goal.reward}
                            </button>
                        ) : (
                            <span className="text-yellow-400 font-mono">+${goal.reward}</span>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-xs text-indigo-300/50 italic">Analyzing city metrics...</div>
            )}
        </div>
    );
});

const Toolbar = memo(({ 
    money, 
    selectedTool, 
    onSelect 
}: { 
    money: number, 
    selectedTool: BuildingType, 
    onSelect: (t: BuildingType) => void 
}) => (
    <div className="bg-gray-900/80 p-2 rounded-2xl border border-gray-600/50 backdrop-blur-xl flex gap-2 overflow-x-auto max-w-lg pointer-events-auto" role="toolbar" aria-label="Building Tools">
        {Object.values(BUILDINGS).map((b) => {
            const isDisabled = money < b.cost && b.type !== BuildingType.None;
            const isSelected = selectedTool === b.type;
            
            return (
                <button
                    key={b.type}
                    onClick={() => onSelect(b.type)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    aria-label={`Select ${b.name} tool, Cost ${b.cost}`}
                    className={`
                        relative w-14 h-14 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center
                        shadow-lg backdrop-blur-md cursor-pointer
                        ${isSelected ? 'border-white bg-white/20 scale-110 z-10' : 'border-gray-600 bg-gray-900/80 hover:bg-gray-800'}
                        ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    `}
                >
                    <div className="w-6 h-6 rounded bg-current mb-1 shadow-inner" style={{color: b.color}}></div>
                    <span className="text-[9px] font-bold text-white uppercase">{b.name}</span>
                    <span className="text-[9px] text-gray-300 font-mono">${b.cost}</span>
                </button>
            );
        })}
    </div>
));

const NewsTicker = memo(({ news }: { news: NewsItem[] }) => (
    <div className="w-80 h-40 bg-black/80 rounded-xl border border-gray-800 overflow-hidden flex flex-col relative pointer-events-auto" role="log" aria-label="News Feed">
        <div className="bg-gray-800 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase flex justify-between">
            <span>City Feed</span>
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" aria-hidden="true"></span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs mask-image-b">
            {news.slice().reverse().map((item) => (
                <div key={item.id} className={`border-l-2 pl-2 ${item.type === 'positive' ? 'border-green-500 text-green-200' : item.type === 'negative' ? 'border-red-500 text-red-200' : 'border-blue-500 text-blue-200'}`}>
                    {item.text}
                </div>
            ))}
        </div>
    </div>
));

// --- Main Layout ---

const HUD = () => {
    const { state, dispatch, actions } = useGame();
    const { stats, selectedTool, currentGoal, aiEnabled, newsFeed, isGeneratingGoal } = state;

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 font-sans">
            
            {/* Header */}
            <header className="flex justify-between items-start">
                <div className="bg-gray-900/90 p-3 rounded-2xl border border-gray-700 shadow-2xl backdrop-blur-xl flex gap-6 pointer-events-auto">
                    <StatBox label="Funds" value={`$${stats.money}`} color="text-green-400" />
                    <div className="w-px bg-gray-700" aria-hidden="true"></div>
                    <StatBox label="Pop" value={`${stats.population}`} color="text-blue-300" />
                    <div className="w-px bg-gray-700" aria-hidden="true"></div>
                    <StatBox label="Happy" value={`${stats.happiness}%`} color="text-pink-300" />
                    <div className="w-px bg-gray-700" aria-hidden="true"></div>
                    <StatBox label="Day" value={`${stats.day}`} color="text-white" />
                </div>

                {aiEnabled && (
                    <MissionPanel 
                        goal={currentGoal} 
                        isGenerating={isGeneratingGoal} 
                        onClaim={actions.claimReward} 
                    />
                )}
            </header>

            {/* Footer */}
            <footer className="flex items-end justify-between">
                <Toolbar 
                    money={stats.money} 
                    selectedTool={selectedTool} 
                    onSelect={(t) => dispatch({type: 'SELECT_TOOL', tool: t})} 
                />
                <NewsTicker news={newsFeed} />
            </footer>
        </div>
    );
};

export default HUD;
