
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { BuildingType } from '../types';
import { BUILDINGS } from '../constants';
import GenAIToolbox from './GenAIToolbox';
import * as aiService from '../services/geminiService';

const NexusButton = () => {
    const [active, setActive] = useState(false);
    const sessionRef = useRef<any>(null);

    const toggleSession = async () => {
        if (active) {
            sessionRef.current?.close();
            setActive(false);
            return;
        }
        setActive(true);
        sessionRef.current = await aiService.createLiveSession({
            onopen: () => console.log("Nexus Link Established"),
            onclose: () => setActive(false),
            onerror: () => setActive(false),
        });
    };

    return (
        <button 
            onClick={toggleSession}
            className={`fixed top-8 right-8 w-20 h-20 rounded-2xl border transition-all flex items-center justify-center z-[50] pointer-events-auto glass-panel neon-btn ${active ? 'border-cyber-teal ring-4 ring-cyber-teal/20' : 'border-glass-border'}`}
        >
            <div className={`w-3 h-3 rounded-full ${active ? 'bg-cyber-teal animate-pulse shadow-[0_0_10px_#2dd4bf]' : 'bg-gray-500'}`} />
            <span className="ml-2 text-xs font-bold tracking-tighter uppercase">Nexus</span>
        </button>
    );
};

const HUD = () => {
    const { state, dispatch } = useGame();
    const { stats, selectedTool, currentGoal, newsFeed } = state;
    const [toolboxOpen, setToolboxOpen] = useState(false);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-10 z-20 select-none">
            <NexusButton />
            
            <header className="flex flex-col sm:flex-row justify-between items-start gap-8">
                <div className="glass-panel px-10 py-6 rounded-2xl flex items-center gap-12 pointer-events-auto">
                    <StatDisplay label="Capital" value={`$${stats.money.toLocaleString()}`} color="text-cyber-lime" />
                    <StatDisplay label="Residents" value={stats.population.toLocaleString()} color="text-cyber-teal" />
                    <StatDisplay label="Stability" value={`${Math.round(stats.happiness)}%`} color="text-cyber-purple" />
                </div>

                {currentGoal && (
                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-cyber-purple pointer-events-auto max-w-sm animate-in fade-in slide-in-from-top duration-500">
                        <span className="text-[10px] font-bold text-cyber-purple uppercase tracking-widest mb-1 block">Active Objective</span>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed mb-4">
                            {currentGoal.description}
                        </p>
                        {currentGoal.completed && (
                            <button 
                                onClick={() => dispatch({type: 'CLAIM_REWARD'})}
                                className="w-full py-3 bg-cyber-purple text-white rounded-lg font-bold text-xs uppercase tracking-widest neon-btn"
                            >
                                Process Reward
                            </button>
                        )}
                    </div>
                )}
            </header>

            <footer className="flex items-end justify-between gap-10">
                <nav className="glass-panel p-3 rounded-3xl flex gap-3 pointer-events-auto items-center">
                    {Object.values(BUILDINGS).map(b => (
                        <button 
                            key={b.type} 
                            onClick={() => dispatch({type:'SELECT_TOOL', tool:b.type})} 
                            className={`group relative w-16 h-16 rounded-xl flex items-center justify-center border transition-all neon-btn ${selectedTool === b.type ? 'bg-cyber-teal/10 border-cyber-teal' : 'bg-transparent border-transparent'}`}
                            title={b.name}
                        >
                            <span className="text-2xl">{getIcon(b.type)}</span>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-1 rounded text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {b.name} (${b.cost})
                            </div>
                        </button>
                    ))}
                    
                    <div className="w-px h-10 bg-glass-border mx-2" />

                    <button 
                        onClick={() => setToolboxOpen(true)} 
                        className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyber-purple to-indigo-600 flex items-center justify-center neon-btn"
                    >
                        <span className="text-xl">⚡</span>
                    </button>
                </nav>

                <div className="hidden lg:flex w-96 h-52 glass-panel rounded-2xl p-6 flex-col shadow-2xl pointer-events-auto">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Feed</span>
                        <div className="w-2 h-2 rounded-full bg-cyber-teal animate-pulse" />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {newsFeed.map(item => (
                            <div key={item.id} className="text-[13px] border-l border-glass-border pl-3 py-1 hover:border-cyber-teal transition-colors">
                                <span className={`font-bold mr-2 ${item.type === 'positive' ? 'text-cyber-teal' : item.type === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>
                                    [{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]
                                </span>
                                <span className="text-slate-300">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </footer>

            {toolboxOpen && <GenAIToolbox onClose={() => setToolboxOpen(false)} />}
        </div>
    );
};

const StatDisplay = ({ label, value, color }: any) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mb-1">{label}</span>
        <span className={`text-2xl font-bold stat-glow ${color}`}>{value}</span>
    </div>
);

const getIcon = (type: BuildingType) => {
    switch(type) {
        case BuildingType.Residential: return '🏢';
        case BuildingType.Commercial: return '🧪';
        case BuildingType.Industrial: return '🛰️';
        case BuildingType.Park: return '🍃';
        case BuildingType.Water: return '💧';
        case BuildingType.Road: return '🛣️';
        default: return '🧹';
    }
};

export default HUD;
