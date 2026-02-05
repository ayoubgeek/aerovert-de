'use client';

import React, { memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { Calendar, AlertTriangle, CheckCircle2, Ruler } from 'lucide-react';
import { useObstacleFilters, ObstacleFeature } from '@/context/ObstacleContext';
import 'leaflet/dist/leaflet.css';

// Helper: Maps obstacle type to color code
const getColor = (type: string, isUnlit: boolean) => {
  if (isUnlit) return '#ef4444'; // Red for hazard/unlit

  switch (type) {
    case 'WIND TURBINE': return '#3b82f6'; // Blue
    case 'CRANE': return '#8b5cf6';        // Purple
    case 'MAST': return '#f59e0b';         // Amber
    case 'LIGHTS': return '#10b981';       // Green
    default: return '#64748b';             // Slate
  }
};

// Component: Individual Marker
// TODO: Consider clustering if dataset grows > 5000 points
const ObstacleMarker = ({ f }: { f: ObstacleFeature }) => {
  const p = f.properties;
  const rawText = (p.text || "").toLowerCase();

  // Perf: One-pass check for unlit keywords
  const isUnlit = rawText.includes('unlit') || rawText.includes('out of service') || rawText.includes('lgt out');
  const heightFL = p.max_fl || 0;
  const isVFRConflict = heightFL >= 5 && heightFL <= 20; // 500-2000ft

  return (
    <CircleMarker
      center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
      radius={isUnlit ? 5 : 4}
      pathOptions={{
        color: getColor(p.type, isUnlit),
        fillColor: getColor(p.type, isUnlit),
        fillOpacity: isUnlit ? 0.9 : 0.6,
        weight: isUnlit ? 2 : 0,
        stroke: isUnlit,
      }}
    >
      <Popup maxWidth={320} className="expert-popup">
        <div className="bg-white text-slate-900 font-sans p-0 overflow-hidden rounded-md shadow-xl">

          {/* Header */}
          <div className={`p-3 border-b flex items-start justify-between ${isUnlit ? 'bg-red-50' : 'bg-slate-50'}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isUnlit ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    <AlertTriangle size={10} /> NVFR Hazard
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <CheckCircle2 size={10} /> Compliant
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400">{p.fir || 'UNK'}</span>
              </div>
              <h3 className={`font-bold text-sm uppercase ${isUnlit ? 'text-red-600' : 'text-slate-800'}`}>
                {p.type}
              </h3>
            </div>
            <span className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-1 rounded font-mono">
              {p.id}
            </span>
          </div>

          {/* Metrics */}
          <div className="p-3 grid grid-cols-2 gap-2">
            <div className={`p-2 rounded border ${isVFRConflict ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <span className={`text-[10px] font-bold uppercase block mb-1 ${isVFRConflict ? 'text-amber-600' : 'text-slate-400'}`}>
                Max Height
              </span>
              <div className="flex items-end gap-1">
                <span className="text-lg font-mono font-bold text-slate-900">FL {heightFL}</span>
                {isVFRConflict && <span className="text-[9px] text-amber-600 font-bold mb-1">CRUISE ZONE</span>}
              </div>
            </div>

            <div className="p-2 rounded border bg-slate-50 border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Radius
              </span>
              <div className="flex items-center gap-1">
                <Ruler size={14} className="text-slate-400" />
                <span className="text-lg font-mono font-bold text-slate-900">
                  {p.radius ? p.radius : '0.0'} <span className="text-xs text-slate-500">NM</span>
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 p-1.5 bg-slate-50 rounded">
              <Calendar size={12} />
              <span className="font-medium">
                {p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'}
                {' → '}
                {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'PERMANENT'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100 leading-tight max-h-24 overflow-y-auto">
              {p.text}
            </div>
          </div>

        </div>
      </Popup>
    </CircleMarker>
  );
};

// Component: Memoized Marker Layer
// Optimization: Separates map update cycle from marker filtering to reduce jank
const MarkersLayer = memo(function MarkersLayer({ features }: { features: ObstacleFeature[] }) {
  return (
    <>
      {features.map((f) => (
        <ObstacleMarker key={`${f.properties.id}-${f.properties.type}`} f={f} />
      ))}
    </>
  );
});

export default function ObstacleMap() {
  const { filteredData } = useObstacleFilters();
  const features = filteredData?.features || [];

  return (
    <MapContainer
      center={[51.1657, 10.4515]}
      zoom={6}
      style={{ height: "100%", width: "100%", background: "#050505" }}
      zoomControl={false}
    >
      <ZoomControl position="topright" />

      <TileLayer
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MarkersLayer features={features} />

    </MapContainer>
  );
}