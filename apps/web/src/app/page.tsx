'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Map as MapIcon, BarChart3, ArrowRight } from 'lucide-react';

// Dynamic Import for Map
const ObstacleMap = dynamic(() => import('@/components/map/ObstacleMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-blue-500 font-mono animate-pulse">
      INITIALIZING GEOSPATIAL ENGINE...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      
      {/* 1. The Clean Map (Background) */}
      <div className="absolute inset-0 z-0">
        <ObstacleMap />
      </div>

      {/* 2. Navigation Overlay (Home Screen UI) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-tighter drop-shadow-2xl">
          AEROVERT <span className="text-blue-500">DE</span>
        </h1>
        <p className="text-slate-300 mb-8 text-lg font-light drop-shadow-md">
          Germany Airspace Obstacle Intelligence
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Link 
            href="/map"
            className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-blue-500/25"
          >
            <MapIcon size={20} />
            <span>Operational Map</span>
            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
          </Link>

          <Link 
            href="/dashboard"
            className="group flex items-center gap-3 bg-slate-800/80 hover:bg-slate-700/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-medium transition-all border border-slate-700 hover:border-slate-500"
          >
            <BarChart3 size={20} />
            <span>Analytics Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 w-full text-center z-10 pointer-events-none">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Powered by Python ETL & PostGIS
        </p>
      </div>
    </main>
  );
}