import React from 'react';
import Link from 'next/link';
import { 
  Map, 
  BarChart3, 
  Wind, 
  ZapOff, 
  ShieldAlert, 
  Radar,
  Layers,
  Navigation,
  ArrowRight,
  Database
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* =========================================
          1. HERO SECTION (The "Hook")
      ========================================= */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center overflow-hidden border-b border-slate-800">
        
        {/* BACKGROUND IMAGE - UPDATED: More Visible */}
        <div className="absolute inset-0 z-0">
           <img 
            src="/hero-background.png" 
            alt="Strategic Airspace Visualization" 
            // Changed: blur-[2px] (sharper) and opacity-75 (brighter)
            className="w-full h-full object-cover object-center scale-105 blur-[2px] opacity-75" 
           />
           {/* Gradient Overlay - Reduced opacity so image shows through */}
           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-5xl px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          {/* UPDATED: Project Name + Scope Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-blue-400/30 bg-slate-900/80 text-blue-300 text-sm font-medium mb-8 backdrop-blur-md shadow-lg">
            <Radar className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="font-bold text-white tracking-wider">AEROVERT DE</span>
            <span className="h-4 w-px bg-blue-500/50 mx-1"></span>
            <span className="text-xs uppercase tracking-wide opacity-90">
              VFR Hazard Intelligence • Germany & FIRs (EDGG, EDMM, EDWW) • 2025 Data
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-2xl">
            Visualizing 
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-100 to-indigo-400 pb-2">
              Obstacle Risk & Saturation
            </span>
            for VFR Aviation
          </h1>
          
          <p className="text-xl text-slate-200 mb-12 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-md">
            A strategic demonstration platform using archived 2025 NOTAM data to analyze the vertical and horizontal impact of wind farms, cranes, and unlit masts on VFR flight safety.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            {/* LINK TO THE MAP PAGE */}
            <Link href="/map" className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-xl hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none ring-offset-slate-900 focus:ring-2 focus:ring-blue-400">
              <Map className="w-6 h-6" />
              <span>Open Operational Map</span>
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            {/* LINK TO ANALYTICS DASHBOARD */}
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-slate-200 transition-all duration-200 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:text-white backdrop-blur-md focus:outline-none ring-offset-slate-900 focus:ring-2 focus:ring-slate-400 hover:shadow-lg">
              <BarChart3 className="w-6 h-6" />
              <span>Analytics Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================
          2. SAFETY GATEBAR (UPDATED: Blue Theme, Smaller Text)
      ========================================= */}
      <div className="bg-gradient-to-r from-slate-900/95 to-blue-950/95 border-y border-blue-500/20 backdrop-blur-lg relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-center gap-2 text-slate-300 text-[11px] md:text-xs font-medium text-center md:text-left opacity-90">
          <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
          <p>
            <span className="font-bold text-blue-300 uppercase tracking-wider">Demonstration Project Only:</span> This platform utilizes archived data from 2025 for analysis purposes. It does NOT reflect real-time conditions. <span className="underline decoration-blue-400/50 underline-offset-4">Never use for flight planning or navigation.</span> Consult official AIS sources.
          </p>
        </div>
      </div>

      {/* =========================================
          3. VISUAL STORY (How it Works)
      ========================================= */}
      <section className="py-24 bg-slate-950/50 relative overflow-hidden">
         {/* Subtle background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 opacity-70"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-white mb-4">From Raw Data to Strategic Awareness</h2>
             <p className="text-slate-400 max-w-2xl mx-auto">How this demo platform transforms thousands of unstructured NOTAMs into actionable visual intelligence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
             {/* Connecting Lines (Desktop only) */}
             <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-900/0 via-blue-500/30 to-blue-900/0"></div>

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center relative">
              <div className="w-20 h-20 bg-slate-900 border-2 border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.15)] z-10 bg-slate-950">
                <Database className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. Ingest & Filter</h3>
              <p className="text-slate-400 leading-relaxed">
                We parse archived 2025 NOTAMs, discarding non-physical data and isolating obstacles like wind turbines and masts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center relative">
               <div className="w-20 h-20 bg-slate-900 border-2 border-indigo-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.15)] z-10 bg-slate-950">
                <Layers className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. Classify & Map</h3>
              <p className="text-slate-400 leading-relaxed">
                Data is geolocated and categorized by type (Wind, Crane, Mast) and flagged for hazards like "Unlit" status.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center relative">
               <div className="w-20 h-20 bg-slate-900 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)] z-10 bg-slate-950">
                <Navigation className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Visualize Risk</h3>
              <p className="text-slate-400 leading-relaxed">
                Presenting the data on an operational map for scanning or an analytics dashboard for strategic saturation analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================
          4. FEATURE GRID (Bento Box Style)
      ========================================= */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1: Wind Farms */}
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform">
                <Wind className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Wind Farm Saturation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Visualize the density of wind parks and their collective impact on VFR corridors, specifically in coastal and northern regions.
              </p>
            </div>

            {/* Feature 2: Unlit Hazards */}
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-red-900/30 hover:border-red-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <div className="w-12 h-12 bg-red-900/30 rounded-xl flex items-center justify-center mb-4 text-red-400 group-hover:scale-110 transition-transform">
                <ZapOff className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                NVFR: Unlit Obstacles
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Critical identification of masts, cranes, and turbines with "OUT OF SERVICE" lighting, posing high risks for Night VFR.
              </p>
            </div>

            {/* Feature 3: Verticality */}
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
              <div className="w-12 h-12 bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Vertical Analytics</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Filter obstacles by Flight Level (FL). Analyze height distribution to identify clear vertical airspace bands.
              </p>
            </div>

            {/* Feature 4: Data Source */}
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 hover:border-slate-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center mb-4 text-slate-300 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">2025 Archived Data</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Built on a static snapshot of DFS NOTAM data from January 2025 for stable post-event analysis and demonstration.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================
          5. FOOTER
      ========================================= */}
      <footer className="py-12 border-t border-slate-900/80 bg-slate-950 text-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-slate-300 font-bold text-xl mb-4">
            <Radar className="w-6 h-6 text-blue-500" />
            AEROVERT DE
            <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 ml-2 border border-blue-500/20">DEMO</span>
          </div>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Geospatial hazard intelligence demonstration for research and analysis purposes only. Not affiliated with any official aviation authority.
          </p>
          <p className="text-slate-600 text-xs mt-6">
            © 2026 Aerovert DE. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}