'use client';

import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';

// Dynamic Import for Map
const ObstacleMap = dynamic(() => import('@/components/map/ObstacleMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-950 text-blue-500 font-mono animate-pulse">
      LOADING MAP INTELLIGENCE...
    </div>
  ),
});

export default function MapPage() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950 flex">
      
      {/* Sidebar Overlay */}
      <div className="z-[1000] h-full pointer-events-none">
        {/* Sidebar has pointer-events-auto inside it to allow clicking */}
        <div className="pointer-events-auto h-full">
          <Sidebar />
        </div>
      </div>

      {/* Full Screen Map */}
      <div className="flex-1 relative z-0">
        <ObstacleMap />
      </div>
      
    </main>
  );
}