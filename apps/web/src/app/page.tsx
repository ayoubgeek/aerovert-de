'use client';

import dynamic from 'next/dynamic';

// Dynamically import the map with NO SSR (Server Side Rendering)
const ObstacleMap = dynamic(() => import('@/components/map/ObstacleMap'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-sm tracking-widest">INITIALIZING GEOSPATIAL ENGINE...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <ObstacleMap />
    </main>
  );
}