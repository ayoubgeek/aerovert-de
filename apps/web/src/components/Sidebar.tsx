'use client';

import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wind, Map as MapIcon, Search, Layers, BarChart3, AlertTriangle, LightbulbOff, ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import { useObstacles } from '@/context/ObstacleContext';

const OBSTACLE_TYPES = [
  { id: 'WIND TURBINE', label: 'WIND', color: '#3B82F6' }, // Blue
  { id: 'CRANE', label: 'CRANE', color: '#8b5cf6' },       // Purple
  { id: 'MAST', label: 'MAST', color: '#F59E0B' },         // Amber
  { id: 'LIGHTS', label: 'LIGHTS', color: '#10B981' },     // Green
];

export default function Sidebar() {
  const { 
    filteredData, 
    avgCeiling, 
    minHeight, 
    setMinHeight, 
    maxHeight,         // <--- NEW
    setMaxHeight,      // <--- NEW
    activeTypes, 
    toggleType, 
    searchTerm, 
    setSearchTerm,
    stats,
    showUnlitOnly,
    setShowUnlitOnly
  } = useObstacles();

  const obstacleCount = filteredData?.features.length || 0;

  // Transform data for Recharts
  const verticalData = stats?.vertical ? [
    { name: '<500', count: stats.vertical['Low (<500ft)'] || 0 },
    { name: '500-2k', count: stats.vertical['Mid (500-2k ft)'] || 0 },
    { name: '>2k', count: stats.vertical['High (>2k ft)'] || 0 },
  ] : [];

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 text-white flex flex-col shadow-2xl z-[1000]">
      
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <MapIcon className="text-blue-500" />
          <span>AEROVERT</span>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">PRO</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 ml-8">Geospatial Hazard Intelligence</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Active Hazards</div>
            <div className="text-2xl font-mono font-bold text-white">{obstacleCount.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Avg. Ceiling</div>
            <div className="text-2xl font-mono font-bold text-blue-400">FL {Math.round(avgCeiling)}</div>
          </div>
        </div>

        {/* Search */}
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, City, or Type..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Hazard Types */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Classification</label>
          <div className="grid grid-cols-2 gap-2">
            {OBSTACLE_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 border flex items-center gap-2 justify-center ${
                  activeTypes.includes(type.id) 
                    ? 'bg-slate-700/50 border-slate-600 text-white' 
                    : 'bg-slate-800/20 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shadow-[0_0_8px]`} style={{ backgroundColor: type.color, boxShadow: `0 0 10px ${type.color}40` }}></span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hidden Risk (Unlit) Toggle */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <LightbulbOff size={16} className="text-red-400" />
                <span className="text-xs font-bold text-red-200 uppercase">Show Unlit Only</span>
            </div>
            <button 
                onClick={() => setShowUnlitOnly(!showUnlitOnly)}
                className={`w-10 h-5 rounded-full relative transition-colors ${showUnlitOnly ? 'bg-red-500' : 'bg-slate-700'}`}
            >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showUnlitOnly ? 'left-6' : 'left-1'}`}></div>
            </button>
        </div>

        {/* ANALYTICS SECTION */}
        {stats && (
          <>
            {/* Chart 1: Vertical Saturation */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Vertical Saturation</label>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={verticalData}>
                    <Tooltip 
                      cursor={{fill: '#334155', opacity: 0.2}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {verticalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 1 ? '#3B82F6' : '#475569'} />
                      ))}
                    </Bar>
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Regional Risk (Top 3) */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Regional Risk (Top 3 FIR)</label>
              <div className="space-y-2">
                {stats.by_fir?.slice(0, 3).map((fir: any, i: number) => (
                  <div key={fir.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono">0{i+1}</span>
                      <span className="text-slate-300 font-medium">{fir.name}</span>
                    </div>
                    <div className="flex items-center gap-2 w-1/2">
                      <div className="h-1.5 bg-slate-800 rounded-full flex-1 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${(fir.value / stats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-400 w-8 text-right">{fir.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- VERTICAL FILTERS (DUAL SLIDERS) --- */}
        <div className="pt-4 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">Vertical Limits</label>
          
          {/* Min Slider */}
          <div className="mb-6">
            <div className="flex justify-between mb-2 items-center">
              <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                <ArrowUpFromLine size={10} /> Min Height
              </span>
              <span className="text-blue-400 font-mono text-xs bg-blue-900/20 px-1.5 rounded">
                FL {String(Math.round(minHeight / 100)).padStart(3, '0')}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={minHeight}
              onChange={(e) => setMinHeight(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Max Slider (NEW) */}
          <div>
            <div className="flex justify-between mb-2 items-center">
              <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                <ArrowDownToLine size={10} /> Max Height
              </span>
              <span className="text-emerald-400 font-mono text-xs bg-emerald-900/20 px-1.5 rounded">
                {maxHeight >= 50000 ? 'UNL' : `FL ${String(Math.round(maxHeight / 100)).padStart(3, '0')}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10000" // Goes up to FL 100
              step="100"
              value={maxHeight >= 50000 ? 10000 : maxHeight} // If unlimited, show full bar
              onChange={(e) => {
                const val = Number(e.target.value);
                // If dragged to max, set to "Unlimited" (50k), otherwise set exact value
                setMaxHeight(val === 10000 ? 50000 : val);
              }}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-2 italic">
              *Drag Max to right edge for Unlimited. Use to filter out FL 999 errors.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}