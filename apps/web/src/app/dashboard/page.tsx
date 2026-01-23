'use client';

/**
 * AEROVERT - STRATEGIC INTELLIGENCE DASHBOARD
 * -------------------------------------------
 * This component visualizes airspace saturation and hazard compliance.
 * It transforms raw NOTAM/Obstacle data into actionable safety metrics for
 * flight operations officers.
 *
 * Core Features:
 * 1. VFR "Wall" Analysis (Area Chart)
 * 2. "Kill Zone" Matrix (Scatter Chart)
 * 3. Compliance Gauge (Safety Score)
 */

import React, { useMemo } from 'react';
import Link from 'next/link';

// Visualization Library
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend, 
  ScatterChart, Scatter
} from 'recharts';

// Icons & UI Assets
import { 
  ArrowLeft, AlertTriangle, LightbulbOff, Activity, Wind, 
  Navigation, Plane, MapPin, Clock, CalendarDays, ShieldCheck, Filter
} from 'lucide-react';

// Global State Management
import { useObstacles } from '@/context/ObstacleContext';

export default function DashboardPage() {
  const { 
    filteredData, 
    showUnlitOnly, 
    setShowUnlitOnly, 
    regionFilter, 
    setRegionFilter,
    activeTypes,      
    toggleType        
  } = useObstacles();

  // --- 1. ANALYTICAL ENGINES ---

  /**
   * ENGINE A: VFR Airspace Profile ("The Wall")
   * Buckets obstacles by Flight Level (FL) to visualize vertical density.
   * Critical for identifying saturation in the VFR Cruise layer (1000-2000ft).
   */
  const vfrProfile = useMemo(() => {
    if (!filteredData) return [];
    
    // Define vertical buckets
    const buckets = [
      { name: '0-500ft', fl: 5, wind: 0, other: 0 },
      { name: '500-1k', fl: 10, wind: 0, other: 0 },
      { name: '1k-2k', fl: 20, wind: 0, other: 0 }, // Cruise Layer
      { name: '2k-3k', fl: 30, wind: 0, other: 0 },
      { name: '> 3k', fl: 999, wind: 0, other: 0 },
    ];

    filteredData.features.forEach(f => {
      const fl = f.properties.max_fl || 0;
      const isWind = f.properties.type === 'WIND TURBINE';
      
      // Determine bucket index
      let bucketIndex = 4;
      if (fl <= 5) bucketIndex = 0;
      else if (fl <= 10) bucketIndex = 1;
      else if (fl <= 20) bucketIndex = 2;
      else if (fl <= 30) bucketIndex = 3;
      
      // Increment counts
      if (isWind) buckets[bucketIndex].wind++;
      else buckets[bucketIndex].other++;
    });
    return buckets;
  }, [filteredData]);

  /**
   * ENGINE B: Obstacle Composition
   * Breaks down the dataset by physical asset type (Wind, Crane, Mast).
   */
  const compositionData = useMemo(() => {
    if (!filteredData) return [];
    const counts: Record<string, number> = { 'WIND TURBINE': 0, 'CRANE': 0, 'MAST': 0, 'OTHER': 0 };
    
    filteredData.features.forEach(f => {
      const t = f.properties.type;
      if (counts[t] !== undefined) counts[t]++;
      else counts['OTHER']++;
    });

    return [
      { name: 'Wind Turbines', value: counts['WIND TURBINE'], color: '#3b82f6' },
      { name: 'Cranes', value: counts['CRANE'], color: '#8b5cf6' },
      { name: 'Masts', value: counts['MAST'], color: '#f59e0b' },
      { name: 'Other', value: counts['OTHER'], color: '#64748b' },
    ].filter(d => d.value > 0);
  }, [filteredData]);

  /**
   * ENGINE C: Key Performance Indicators (KPIs)
   * Calculates high-level metrics for the top cards.
   */
  const kpis = useMemo(() => {
    if (!filteredData) return { total: 0, unlit: 0, vfrConflict: 0 };
    let unlit = 0;
    let vfrConflict = 0;

    filteredData.features.forEach(f => {
      const text = (f.properties.text || "").toLowerCase();
      // Logic: Check for keywords indicating lighting failure
      if (text.includes('unlit') || text.includes('out of service')) unlit++;
      
      const fl = f.properties.max_fl || 0;
      // VFR Conflict Zone: 500ft to 2000ft
      if (fl >= 5 && fl <= 20) vfrConflict++;
    });

    return { total: filteredData.features.length, unlit, vfrConflict };
  }, [filteredData]);

  /**
   * ENGINE D: Critical Hazard Feed
   * Filters for the top 15 most dangerous obstacles based on:
   * 1. Lighting Status (Unlit = Higher Risk)
   * 2. Altitude (Higher = Higher Risk)
   */
  const criticalHazards = useMemo(() => {
    if (!filteredData) return [];
    return filteredData.features
      .filter(f => {
        const text = (f.properties.text || "").toLowerCase();
        return text.includes('unlit') || text.includes('out') || (f.properties.max_fl || 0) > 20;
      })
      .sort((a, b) => (b.properties.max_fl || 0) - (a.properties.max_fl || 0))
      .slice(0, 15); 
  }, [filteredData]);

  /**
   * ENGINE E: Freshness Index
   * Counts assets added to the database within the last 7 days.
   */
  const freshnessCount = useMemo(() => {
    if (!filteredData) return 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 600);
    
    return filteredData.features.filter(f => {
      if (!f.properties.start_date) return false;
      return new Date(f.properties.start_date) >= sevenDaysAgo;
    }).length;
  }, [filteredData]);

  /**
   * ENGINE F: Operational Tempo (Monthly Activity)
   * Buckets new hazard intake by month for the current operational year (2025).
   */
  const monthlyActivity = useMemo(() => {
    if (!filteredData) return [];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = months.map(m => ({ name: m, count: 0 }));

    filteredData.features.forEach(f => {
      if (f.properties.start_date) {
        const date = new Date(f.properties.start_date);
        if (date.getFullYear() === 2025) {
          monthCounts[date.getMonth()].count++;
        }
      }
    });
    return monthCounts;
  }, [filteredData]);

  /**
   * ENGINE G: "The Kill Zone" (Scatter Matrix)
   * Maps correlation between Obstacle Type (X) and Height (Y).
   * Color codes data points based on lighting status to highlight high-risk clusters.
   */
  const scatterData = useMemo(() => {
    if (!filteredData) return [];
    return filteredData.features.map((f, index) => {
      const typeMap: Record<string, number> = { 'WIND TURBINE': 1, 'CRANE': 2, 'MAST': 3, 'LIGHTS': 4 };
      const t = f.properties.type;
      const xVal = typeMap[t] || 5;
      
      const text = (f.properties.text || "").toLowerCase();
      const isUnlit = text.includes('unlit') || text.includes('out of service');
      
      return {
        id: index,
        x: xVal,
        y: f.properties.max_fl || 0,
        type: t,
        status: isUnlit ? 'UNLIT' : 'LIT',
        color: isUnlit ? '#ef4444' : '#3b82f6',
        name: f.properties.id
      };
    });
  }, [filteredData]);

  /**
   * ENGINE H: Safety Compliance Score
   * Calculates the percentage of assets that are compliant (Lit) vs Violations (Unlit).
   */
  const complianceData = useMemo(() => {
    if (!filteredData) return { rate: 0, chart: [] };
    const total = filteredData.features.length;
    if (total === 0) return { rate: 100, chart: [{ name: 'Safe', value: 1, color: '#10b981' }] };

    let unlit = 0;
    filteredData.features.forEach(f => {
        const text = (f.properties.text || "").toLowerCase();
        if (text.includes('unlit') || text.includes('out of service')) unlit++;
    });

    const safe = total - unlit;
    const rate = Math.round((safe / total) * 100);

    return {
        rate,
        chart: [
            { name: 'Compliant (Lit)', value: safe, color: '#10b981' },
            { name: 'Violation (Unlit)', value: unlit, color: '#ef4444' }
        ]
    };
  }, [filteredData]);

  // Helper Component for Filter Buttons
  const FilterButton = ({ label, id, color }: { label: string, id: string, color: string }) => (
    <button
      onClick={() => toggleType(id)}
      className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
        activeTypes.includes(id) 
          ? `bg-${color}-500/10 text-${color}-400 border-${color}-500/50` 
          : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700'
      }`}
      style={{ 
        color: activeTypes.includes(id) ? color : undefined,
        borderColor: activeTypes.includes(id) ? color : undefined,
        backgroundColor: activeTypes.includes(id) ? `${color}15` : undefined 
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: activeTypes.includes(id) ? color : '#475569' }}></span>
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 font-sans overflow-y-auto">
      
      {/* --- SECTION 1: HEADER & CONTROLS --- */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-blue-100">
            <Plane className="text-blue-500 rotate-[-45deg]" />
            Strategic Intelligence
          </h1>
          <p className="text-slate-400 text-sm mt-1">Airspace Saturation & Hazard Analysis</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Classification Filter */}
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 overflow-x-auto">
             <Filter size={14} className="text-slate-500 ml-2 mr-1" />
             <FilterButton label="Wind" id="WIND TURBINE" color="#3b82f6" />
             <FilterButton label="Crane" id="CRANE" color="#8b5cf6" />
             <FilterButton label="Mast" id="MAST" color="#f59e0b" />
             <FilterButton label="Lights" id="LIGHTS" color="#10b981" />
          </div>

          {/* Region Filter */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center">
             {['ALL', 'EDWW', 'EDGG', 'EDMM'].map(region => (
               <button
                 key={region}
                 onClick={() => setRegionFilter(region)}
                 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                   regionFilter === region 
                     ? 'bg-blue-600 text-white shadow-lg' 
                     : 'text-slate-500 hover:text-slate-300'
                 }`}
               >
                 {region}
               </button>
             ))}
          </div>

          <Link 
            href="/" 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-600"
          >
            <ArrowLeft size={14} /> Map View
          </Link>
        </div>
      </header>

      {/* --- SECTION 2: KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* KPI 1: Total Assets */}
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-2 text-[10px] font-bold uppercase tracking-widest">
            <Activity size={14} /> Total Assets
          </div>
          <div className="text-3xl font-mono font-bold text-white">{kpis.total.toLocaleString()}</div>
        </div>
        
        {/* KPI 2: VFR Conflict */}
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-500 mb-2 text-[10px] font-bold uppercase tracking-widest">
            <Navigation size={14} /> VFR Conflict (500-2k ft)
          </div>
          <div className="text-3xl font-mono font-bold text-amber-500">{kpis.vfrConflict.toLocaleString()}</div>
        </div>

        {/* KPI 3: Unlit Hazards */}
        <div className={`p-5 rounded-xl border transition-all ${showUnlitOnly ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-900/40 border-slate-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest">
              <LightbulbOff size={14} /> NVFR Hazard (Unlit)
            </div>
            <button 
              onClick={() => setShowUnlitOnly(!showUnlitOnly)}
              className={`w-8 h-4 rounded-full relative transition-colors ${showUnlitOnly ? 'bg-red-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showUnlitOnly ? 'left-4.5' : 'left-0.5'}`}></div>
            </button>
          </div>
          <div className="text-3xl font-mono font-bold text-red-100">{kpis.unlit}</div>
        </div>

        {/* KPI 4: Active Region */}
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 backdrop-blur-sm">
           <div className="flex items-center gap-2 text-blue-400 mb-2 text-[10px] font-bold uppercase tracking-widest">
            <MapPin size={14} /> Active Region
          </div>
          <div className="text-3xl font-mono font-bold text-blue-400">{regionFilter}</div>
        </div>

        {/* KPI 5: Freshness Index */}
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 backdrop-blur-sm">
           <div className="flex items-center gap-2 text-emerald-400 mb-2 text-[10px] font-bold uppercase tracking-widest">
            <Clock size={14} /> New (Last 7 Days)
          </div>
          <div className="text-3xl font-mono font-bold text-emerald-400">+{freshnessCount}</div>
        </div>
      </div>

      {/* --- SECTION 3: VISUALIZATION LAYER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* CHART 1: VFR Profile (Wide) */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold mb-6 text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Plane size={16} /> VFR Obstacle Profile (The "Wall")
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vfrProfile}>
                <defs>
                  <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="other" stackId="1" stroke="#94a3b8" fill="#475569" name="Structure" />
                <Area type="monotone" dataKey="wind" stackId="1" stroke="#3b82f6" fill="url(#colorWind)" name="Wind Turbines" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Obstacle Composition */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold mb-6 text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Wind size={16} /> Obstacle Composition
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION 4: ADVANCED ANALYTICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* CHART 3: The "Kill Zone" Matrix */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold mb-6 text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500"/> The "Kill Zone" Matrix (Height vs. Type Analysis)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Type" 
                  ticks={[1, 2, 3, 4]} 
                  tickFormatter={(val) => {
                     if (val === 1) return 'WIND';
                     if (val === 2) return 'CRANE';
                     if (val === 3) return 'MAST';
                     if (val === 4) return 'LIGHTS';
                     return '';
                  }}
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0.5, 4.5]}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Height" 
                  unit=" FL" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl text-xs">
                          <div className="font-bold text-white mb-1">{data.name}</div>
                          <div className="text-slate-400">{data.type}</div>
                          <div className="font-mono mt-1 text-white">Height: FL {data.y}</div>
                          <div className={`mt-1 font-bold ${data.status === 'UNLIT' ? 'text-red-500' : 'text-blue-500'}`}>
                            {data.status}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Obstacles" data={scatterData} fill="#8884d8">
                   {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Monthly Hazard Activity */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold mb-6 text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CalendarDays size={16} /> Hazard Activity (2025)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyActivity}>
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-2">
            *New hazard intake per month for the 2025 operational year.
          </p>
        </div>
      </div>

      {/* --- SECTION 5: HAZARD DETAIL & COMPLIANCE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table: Critical Hazards */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-bold mb-4 text-red-400 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={16} /> Top 15 Critical Hazards (Unlit / High Altitude)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Coords (Lat/Lon)</th>
                  <th className="pb-3">Region</th>
                  <th className="pb-3">Height (FL)</th>
                  <th className="pb-3">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {criticalHazards.map((obs) => {
                  return (
                    <tr key={`${obs.properties.id}-${obs.properties.type}`} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-2 font-mono text-blue-400">{obs.properties.id}</td>
                      <td className="py-3 text-xs uppercase font-bold tracking-wider" style={{ color: obs.properties.type === 'WIND TURBINE' ? '#3b82f6' : '#94a3b8' }}>
                        {obs.properties.type}
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-500">
                        {obs.geometry.coordinates[1].toFixed(4)}, {obs.geometry.coordinates[0].toFixed(4)}
                      </td>
                      <td className="py-3 text-slate-400">{obs.properties.fir || 'UNK'}</td>
                      <td className="py-3 font-mono font-bold text-white">FL {obs.properties.max_fl}</td>
                      <td className="py-3">
                        <div className="max-w-xs text-xs text-slate-400 leading-snug line-clamp-2" title={obs.properties.text}>
                          {obs.properties.text}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gauge: Safety Compliance Score */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative">
          <h3 className="absolute top-6 left-6 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={16} /> Safety Compliance
          </h3>
          
          <div className="w-full h-64 mt-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceData.chart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    startAngle={180}
                    endAngle={0}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {complianceData.chart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} 
                     itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
             </ResponsiveContainer>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 text-center">
                 <div className="text-4xl font-bold text-white">{complianceData.rate}%</div>
                 <div className="text-[10px] text-slate-500 uppercase tracking-wider">Compliance Rate</div>
             </div>
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-[-20px] px-4">
             *Calculated based on ratio of functional lighting systems vs. reported unlit hazards.
          </p>
        </div>

      </div>

    </main>
  );
}