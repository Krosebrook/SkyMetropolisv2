/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { memo, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { BuildingType, CityStats, AIGoal, NewsItem } from '../types';
import { BUILDINGS } from '../constants';

const StatBox = memo(({ label, value, color, id }: { label: string, value: string, color: string, id: string }) => (
    <div className="flex flex-col items-center sm:items-start p-2" role="status" aria-labelledby={id}>
        <span id={id} className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{label}</span>
        <span className={`text-xl sm:text-2xl font-mono font-black ${color} drop-shadow-sm transition-all duration-300`}>
            {value}
        </span>
    </div>
));

const MissionPanel = memo(({ goal, isGenerating, onClaim }: { goal: AIGoal | null, isGenerating: boolean, onClaim: () => void }) => {
    if (!goal && !isGenerating) return null;

    return (
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl w-full sm:w-80 transition-all pointer-events-auto ring-1 ring-white/10" 
             role="complementary" aria-label="Current Objective">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                    AI ADVISOR
                </span>
                {isGenerating && <div className="text-[10px] text-cyan-400 animate-pulse font-bold">ANALYZING...</div>}
            </div>
            {goal ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <p className="text-sm text-slate-100 font-medium mb-4 leading-relaxed italic">"{goal.description}"</p>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Progress</span>
                            <span className="text-xs text-cyan-300 font-mono">
                                {goal.targetType === 'money' ? '$' : ''}{goal.targetValue.toLocaleString()} {goal.targetType === 'building_count' ? 'Structures' : ''}
                            </span>
                        </div>
                        {goal.completed ? (
                            <button 
                                onClick={onClaim}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/40"
                                aria-label={`Claim reward of ${goal.reward} dollars`}
                            >
                                CLAIM ${goal.reward}
                            </button>
                        ) : (
                            <span className="text-amber-400 font-mono text-sm font-bold">+${goal.reward}</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-[10px] text-slate-500 italic py-4 text-center">Identifying expansion opportunities...</div>
            )}
        </div>
    );
});

const Toolbar = memo(({ money, selectedTool, sandboxMode, onSelect }: any) => {
    const tools = Object.values(BUILDINGS);
    
    return (
        <nav className="bg-slate-900/90 p-2 rounded-3xl border border-slate-700/50 backdrop-blur-xl flex gap-1.5 overflow-x-auto max-w-full sm:max-w-lg pointer-events-auto shadow-2xl" 
             role="menubar" aria-label="Building construction tools">
            {tools.map((b, idx) => {
                const isDisabled = !sandboxMode && money < b.cost && b.type !== BuildingType.None;
                const isSelected = selectedTool === b.type;
                return (
                    <button
                        key={b.type}
                        onClick={() => onSelect(b.type)}
                        disabled={isDisabled}
                        role="menuitem"
                        aria-label={`Tool ${idx + 1}: ${b.name}. Cost: ${b.cost}. ${b.description}`}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`
                            relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center
                            cursor-pointer group overflow-hidden
                            ${isSelected ? 'border-cyan-400 bg-cyan-950/40 scale-105 shadow-cyan-500/20 shadow-lg' : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800 hover:border-slate-700'}
                            ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                        `}
                    >
                        <div className="w-4 h-4 sm:w-6 sm:h-6 rounded bg-current mb-1 transition-transform group-hover:scale-110" style={{color: b.color}}></div>
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase">{b.name}</span>
                        <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono">{sandboxMode && b.type !== BuildingType.None ? 'Free' : `$${b.cost}`}</span>
                        {/* Keyboard shortcut hint */}
                        <div className="absolute top-1 right-1.5 text-[8px] text-slate-600 font-bold">{idx + 1}</div>
                    </button>
                );
            })}
        </nav>
    );
});

const NewsTicker = memo(({ news }: { news: readonly NewsItem[] }) => (
    <section className="hidden sm:flex w-80 h-44 bg-slate-950/90 rounded-3xl border border-slate-800/50 overflow-hidden flex-col shadow-2xl pointer-events-auto" 
             aria-label="City News Feed">
        <div className="bg-slate-900/80 px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50 flex justify-between items-center">
            <span>METRO BROADCAST</span>
            <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> LIVE
            </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px] scroll-smooth mask-image-b">
            {news.map((item) => (
                <article key={item.id} className={`border-l-2 pl-3 py-1 animate-in slide-in-from-left-2 duration-300 ${
                    item.type === 'positive' ? 'border-emerald-500 text-emerald-100' : 
                    item.type === 'negative' ? 'border-rose-500 text-rose-100' : 
                    'border-cyan-500 text-cyan-100'
                }`}>
                    <p>{item.text}</p>
                    <time className="text-[8px] text-slate-600 block mt-1">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                </article>
            ))}
            {news.length === 0 && <div className="text-slate-600 text-center mt-8 text-[10px]">No recent broadcasts...</div>}
        </div>
    </section>
));

const HUD = () => {
    const { state, dispatch } = useGame();
    const { stats, selectedTool, currentGoal, aiEnabled, newsFeed, isGeneratingGoal, sandboxMode } = state;

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = parseInt(e.key);
            if (key >= 1 && key <= 6) {
                const tools = Object.values(BuildingType);
                const tool = tools[key - 1];
                if (tool) dispatch({ type: 'SELECT_TOOL', tool: tool as BuildingType });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch]);

    const handleSelectTool = useCallback((tool: BuildingType) => {
        dispatch({ type: 'SELECT_TOOL', tool });
    }, [dispatch]);

    const handleClaim = useCallback(() => {
        dispatch({ type: 'CLAIM_REWARD' });
    }, [dispatch]);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-8 z-20 font-sans select-none overflow-hidden">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-6 animate-in fade-in slide-in-from-top duration-700">
                <div className="bg-slate-950/90 p-4 rounded-[2rem] border border-slate-700/50 shadow-2xl backdrop-blur-2xl flex items-center gap-6 sm:gap-12 pointer-events-auto ring-1 ring-white/10">
                    <StatBox id="stat-funds" label="Funds" value={sandboxMode ? '∞' : `$${stats.money.toLocaleString()}`} color="text-emerald-400" />
                    <div className="w-px h-8 bg-slate-800" aria-hidden="true"></div>
                    <StatBox id="stat-pop" label="Population" value={stats.population.toLocaleString()} color="text-cyan-400" />
                    <div className="hidden xs:block w-px h-8 bg-slate-800" aria-hidden="true"></div>
                    <StatBox id="stat-happy" label="Happiness" value={`${Math.round(stats.happiness)}%`} color="text-rose-400" />
                    <div className="hidden sm:block w-px h-8 bg-slate-800" aria-hidden="true"></div>
                    <StatBox id="stat-day" label="Day" value={String(stats.day)} color="text-white/90" />
                </div>

                {aiEnabled && (
                    <MissionPanel 
                        goal={currentGoal} 
                        isGenerating={isGeneratingGoal} 
                        onClaim={handleClaim} 
                    />
                )}
            </header>

            <footer className="flex items-end justify-between gap-6 animate-in fade-in slide-in-from-bottom duration-700">
                <Toolbar 
                    money={stats.money} 
                    selectedTool={selectedTool} 
                    onSelect={handleSelectTool}
                    sandboxMode={sandboxMode}
                />
                <NewsTicker news={newsFeed} />
            </footer>
        </div>
    );
};

export default HUD;
