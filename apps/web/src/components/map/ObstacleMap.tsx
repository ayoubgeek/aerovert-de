'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { AlertTriangle, Calendar, Layers, Map as MapIcon, Info, Wind } from 'lucide-react';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';

// --- EXPERT INTERFACES ---
interface ObstacleFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;          // F0153/25
    db_id: number;
    type: string;        // WIND TURBINE
    fir: string;         // EDGG
    min_fl: number | null;
    max_fl: number | null;
    radius: number | null;
    text: string;
    start_date: string | null;
    end_date: string | null;
  };
}

interface ObstacleCollection {
  count: number;
  features: ObstacleFeature[];
}

export default function ObstacleMap() {
  const [data, setData] = useState<ObstacleCollection | null>(null);
  const [loading, setLoading] = useState(true);
  
  // -- Filters --
  const [filterType, setFilterType] = useState<'ALL' | 'WIND' | 'CRANE' | 'OTHER'>('ALL');
  const [minAltitude, setMinAltitude] = useState<number>(0); // Filter by max_fl

  useEffect(() => {
    fetch('http://localhost:8000/obstacles')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => console.error("Failed to fetch:", err));
  }, []);

  // -- ANALYTICS ENGINE --
  const { filteredFeatures, typeStats, verticalStats } = useMemo(() => {
    if (!data) return { filteredFeatures: [], typeStats: [], verticalStats: [] };

    // 1. Filtering Logic
    const filtered = data.features.filter(f => {
      const t = f.properties.type;
      const maxFl = f.properties.max_fl || 0;
      
      // Filter by Type
      if (filterType === 'WIND' && t !== 'WIND TURBINE') return false;
      if (filterType === 'CRANE' && t !== 'CRANE') return false;
      if (filterType === 'OTHER' && (t === 'WIND TURBINE' || t === 'CRANE')) return false;

      // Filter by Vertical Extent (Show only obstacles reaching ABOVE X height)
      if (maxFl < minAltitude) return false;

      return true;
    });

    // 2. Vertical Analytics (Buckets)
    const vStats = [
      { name: '< 500ft', count: 0, fl: 5 },
      { name: '500-1000ft', count: 0, fl: 10 },
      { name: '1000-2000ft', count: 0, fl: 20 },
      { name: '> 2000ft', count: 0, fl: 999 },
    ];

    filtered.forEach(f => {
      const fl = f.properties.max_fl || 0;
      if (fl < 5) vStats[0].count++;
      else if (fl < 10) vStats[1].count++;
      else if (fl < 20) vStats[2].count++;
      else vStats[3].count++;
    });

    // 3. Type Stats
    const types = [
      { name: 'Turbines', value: filtered.filter(f => f.properties.type === 'WIND TURBINE').length, color: '#3b82f6' },
      { name: 'Cranes', value: filtered.filter(f => f.properties.type === 'CRANE').length, color: '#ef4444' },
      { name: 'Other', value: filtered.filter(f => f.properties.type !== 'WIND TURBINE' && f.properties.type !== 'CRANE').length, color: '#a855f7' },
    ];

    return { filteredFeatures: filtered, typeStats: types, verticalStats: vStats };
  }, [data, filterType, minAltitude]);

  // -- HELPER: Marker Color --
  const getColor = (type: string) => {
    switch (type) {
      case 'WIND TURBINE': return '#3b82f6';
      case 'CRANE': return '#ef4444';
      default: return '#a855f7';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-gray-100 overflow-hidden font-sans">
      
      {/* --- EXPERT ANALYTICS SIDEBAR --- */}
      <div className="w-96 flex flex-col border-r border-gray-800 bg-[#111111] z-20 shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h1 className="text-lg font-bold flex items-center gap-2 text-white">
            <MapIcon className="w-5 h-5 text-blue-500" />
            AEROVERT <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">PRO</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">Germany Airspace Obstacle Intelligence</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* 1. KEY METRICS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/40 border border-gray-700 p-4 rounded-lg">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Total Hazards</span>
              <div className="text-3xl font-bold text-white mt-1">{filteredFeatures.length}</div>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 p-4 rounded-lg">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Avg. Ceiling</span>
              <div className="text-3xl font-bold text-blue-400 mt-1">
                FL {Math.round(filteredFeatures.reduce((acc, curr) => acc + (curr.properties.max_fl || 0), 0) / (filteredFeatures.length || 1))}
              </div>
            </div>
          </div>

          {/* 2. FILTER CONTROLS */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Data Filtering
            </h3>
            
            {/* Type Toggles */}
            <div className="flex bg-gray-800/50 p-1 rounded-lg mb-4">
              {['ALL', 'WIND', 'CRANE'].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t as any)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterType === t 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Altitude Slider */}
            <div className="bg-gray-800/30 p-3 rounded border border-gray-700/50">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Min. Flight Level</span>
                <span className="text-blue-400 font-mono">FL {minAltitude.toString().padStart(3, '0')}</span>
              </div>
              <input 
                type="range" 
                min="0" max="50" step="5" 
                value={minAltitude}
                onChange={(e) => setMinAltitude(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[10px] text-gray-500 mt-2">
                *Hides obstacles below this altitude. Useful for flight planning above specific FL.
              </p>
            </div>
          </div>

          {/* 3. VERTICAL SATURATION CHART */}
          <div className="h-48 w-full">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Vertical Saturation
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={verticalStats} layout="vertical" margin={{ left: 0, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#9ca3af', fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#1f2937', border: 'none', fontSize: '12px'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 text-center">
          DATA SOURCE: EDGG, EDMM, EDWW (2025 SERIES)
        </div>
      </div>

      {/* --- THE MAP --- */}
      <div className="flex-1 relative z-10">
        <MapContainer 
          center={[51.1657, 10.4515]} 
          zoom={6} 
          style={{ height: "100%", width: "100%", background: "#050505" }}
        >
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {filteredFeatures.map((f) => (
            <CircleMarker
              key={f.properties.id}
              center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
              pathOptions={{
                color: getColor(f.properties.type),
                fillColor: getColor(f.properties.type),
                fillOpacity: 0.6,
                weight: 0,
                radius: 4
              }}
            >
              <Popup maxWidth={300} className="expert-popup">
                <div className="bg-white text-gray-900 font-sans p-1">
                  
                  {/* HEADER */}
                  <div className="flex items-start justify-between border-b pb-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.properties.fir} FIR</span>
                      <h3 className="font-bold text-sm text-blue-600 uppercase">{f.properties.type}</h3>
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-mono">
                      {f.properties.id}
                    </span>
                  </div>

                  {/* CRITICAL DATA GRID */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="text-[10px] text-blue-400 block uppercase">Vertical Limits</span>
                      <span className="font-bold font-mono text-sm text-blue-900">
                        FL {f.properties.min_fl?.toString().padStart(3, '0') || 'GND'} - FL {f.properties.max_fl?.toString().padStart(3, '0')}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-[10px] text-gray-400 block uppercase">Radius</span>
                      <span className="font-bold font-mono text-sm">
                        {f.properties.radius ? `${f.properties.radius} NM` : 'SPOT'}
                      </span>
                    </div>
                  </div>

                  {/* DATES */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3 bg-gray-50 p-1.5 rounded border border-gray-100">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>
                      {f.properties.start_date ? format(new Date(f.properties.start_date), 'MMM dd') : '?'} 
                      {' → '} 
                      {f.properties.end_date ? format(new Date(f.properties.end_date), 'MMM dd, yyyy') : 'PERM'}
                    </span>
                  </div>

                  {/* RAW TEXT PREVIEW */}
                  <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 font-mono leading-tight max-h-20 overflow-y-auto">
                    {f.properties.text}
                  </div>

                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}