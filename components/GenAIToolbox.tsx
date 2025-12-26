
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import * as aiService from '../services/geminiService';

// (Helper functions remain same)
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const GenAIToolbox: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state } = useGame();
  const [tab, setTab] = useState<'vision' | 'insights' | 'spatial'>('vision');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<{ text?: string, image?: string, video?: string, sources?: any[] } | null>(null);
  const [prompt, setPrompt] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleAction = async (action: string) => {
    setLoading(true);
    setOutput(null);
    try {
      if (action === 'generate-image') {
        const url = await aiService.generateProImage(prompt, '1K');
        if (url) setOutput({ image: url });
      } else if (action === 'generate-video') {
        const url = await aiService.generateVeoVideo(prompt, output?.image);
        if (url) setOutput({ ...output, video: url });
      } else if (action === 'council-meeting') {
        const base64Audio = await aiService.generateCouncilMeeting(prompt || "Let's talk about city progress!");
        if (base64Audio) {
            if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
            const buffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            setOutput({ text: "Listen! Your council is meeting! 🔊" });
        }
      } else if (action === 'thinking-audit') {
        const text = await aiService.getThinkingAdvisorResponse(prompt || "How can I improve city efficiency?", state.stats);
        setOutput({ text });
      } else if (action === 'spatial-search') {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          const result = await aiService.searchLocalPlaces(prompt || "What interesting architectural features are near me?", latitude, longitude);
          setOutput(result);
          setLoading(false);
        }, (err) => {
          setOutput({ text: "Location access denied. Please enable GPS for spatial analysis." });
          setLoading(false);
        });
        return; // handle inner async
      }
    } catch (e) {
      setOutput({ text: "The magic box encountered a connection error. Please try again." });
    } finally {
      if (action !== 'spatial-search') setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl pointer-events-auto">
      <div className="relative w-full max-w-2xl glass-panel border border-glass-border rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="p-8 border-b border-glass-border flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tighter">Nexus Toolbox</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Experimental AI Interfaces</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 glass-panel border border-glass-border rounded-full flex items-center justify-center text-xl font-bold text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="flex px-8 pt-4 gap-8">
          <TabButton active={tab === 'vision'} onClick={() => setTab('vision')} label="Visuals" color="border-pink-500" textColor="text-pink-500" />
          <TabButton active={tab === 'insights'} onClick={() => setTab('insights')} label="Strategic" color="border-blue-500" textColor="text-blue-500" />
          <TabButton active={tab === 'spatial'} onClick={() => setTab('spatial')} label="Spatial" color="border-cyber-teal" textColor="text-cyber-teal" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <textarea 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter parameters for the Nexus AI..."
            className="w-full bg-slate-900/50 border border-glass-border rounded-2xl p-6 text-slate-200 font-medium outline-none min-h-[120px] resize-none focus:border-cyber-teal transition-colors"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tab === 'vision' && (
              <>
                <ActionButton onClick={() => handleAction('generate-image')} label="Synthesize Visualization" icon="🎨" color="from-pink-600 to-rose-600" />
                <ActionButton onClick={() => handleAction('generate-video')} label="Render Cinematic" icon="🎬" color="from-purple-600 to-indigo-600" />
              </>
            )}
            {tab === 'insights' && (
              <>
                <ActionButton onClick={() => handleAction('thinking-audit')} label="Logic Assessment" icon="💡" color="from-blue-600 to-cyan-600" />
                <ActionButton onClick={() => handleAction('council-meeting')} label="Citizen Forum" icon="🗣️" color="from-green-600 to-emerald-600" />
              </>
            )}
            {tab === 'spatial' && (
              <>
                <ActionButton onClick={() => handleAction('spatial-search')} label="Local Area Audit" icon="📍" color="from-cyber-teal to-emerald-500" />
                <div className="p-4 glass-panel rounded-2xl flex items-center justify-center border border-glass-border">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center font-bold">Spatial Analysis uses real-time GPS coordinates for grounding.</p>
                </div>
              </>
            )}
          </div>

          {(loading || output) && (
            <div className="p-8 glass-panel rounded-3xl border border-glass-border animate-in fade-in zoom-in duration-300">
              {loading && <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-cyber-teal border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Processing Request...</p>
              </div>}
              {output?.image && <img src={output.image} className="rounded-2xl w-full border border-glass-border shadow-2xl mb-4" />}
              {output?.video && <video src={output.video} controls autoPlay loop className="rounded-2xl w-full border border-glass-border shadow-2xl mb-4" />}
              {output?.text && (
                  <div className="text-left">
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">{output.text}</p>
                    {output.sources && output.sources.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-glass-border">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Data References:</span>
                            {output.sources.map((s, i) => (
                                <a key={i} href={s.maps?.uri || s.web?.uri} target="_blank" rel="noreferrer" className="block text-cyber-teal text-xs hover:underline truncate">
                                    • {s.maps?.title || s.web?.title || "Reference Link"}
                                </a>
                            ))}
                        </div>
                    )}
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, color, textColor }: any) => (
    <button onClick={onClick} className={`pb-3 text-xs font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${active ? `${color} ${textColor}` : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
        {label}
    </button>
);

const ActionButton = ({ onClick, label, icon, color }: any) => (
    <button onClick={onClick} className={`bg-gradient-to-r ${color} p-6 rounded-2xl text-white font-bold flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all shadow-xl group`}>
        <span className="text-sm tracking-tighter">{label}</span>
        <span className="text-2xl group-hover:rotate-12 transition-transform">{icon}</span>
    </button>
);

export default GenAIToolbox;
