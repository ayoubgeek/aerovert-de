'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

// --- Types ---
export interface ObstacleFeature {
  type: string;
  properties: {
    id: string;
    type: string;
    max_fl: number;
    text: string;
    fir?: string;
    radius?: number;
    start_date?: string;
    end_date?: string;
    min_fl?: number;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface ObstacleCollection {
  type: "FeatureCollection";
  features: ObstacleFeature[];
}

export interface StatsData {
  total: number;
  by_type: Record<string, number>;
  by_fir: { name: string; value: number }[];
  vertical: Record<string, number>;
}

interface ObstacleContextType {
  // Data
  data: ObstacleCollection | null;
  filteredData: ObstacleCollection | null;
  stats: StatsData | null;
  loading: boolean;
  
  // Analytics Metrics
  avgCeiling: number;
  
  // Filter State
  minHeight: number;
  setMinHeight: (h: number) => void;
  maxHeight: number;
  setMaxHeight: (h: number) => void;
  
  activeTypes: string[];
  toggleType: (t: string) => void;
  
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  
  showUnlitOnly: boolean;
  setShowUnlitOnly: (v: boolean) => void;

  // --- NEW: Region Filter ---
  regionFilter: string; // 'ALL', 'EDWW', 'EDGG', 'EDMM'
  setRegionFilter: (r: string) => void;
}

const ObstacleContext = createContext<ObstacleContextType | undefined>(undefined);

export function ObstacleProvider({ children }: { children: ReactNode }) {
  // --- State ---
  const [data, setData] = useState<ObstacleCollection | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [minHeight, setMinHeight] = useState(0); 
  const [maxHeight, setMaxHeight] = useState(50000); 
  
  const [activeTypes, setActiveTypes] = useState<string[]>([
    'WIND TURBINE', 'CRANE', 'MAST', 'LIGHTS' 
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnlitOnly, setShowUnlitOnly] = useState(false); 
  const [regionFilter, setRegionFilter] = useState("ALL"); // <--- NEW

  // --- 1. Data Fetching ---
  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        const [obsRes, statsRes] = await Promise.all([
          fetch(`${apiUrl}/obstacles`),
          fetch(`${apiUrl}/stats`)
        ]);

        const obsData = await obsRes.json();
        const statsData = await statsRes.json();

        setData(obsData);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // --- 2. Filtering Engine ---
  const filteredData = useMemo(() => {
    if (!data) return null;

    const filteredFeatures = data.features.filter(feature => {
      // A. STRICT DATA HYGIENE
      const radius = feature.properties.radius || 0;
      const type = feature.properties.type;
      const fir = (feature.properties.fir || "UNK").toUpperCase();

      if (radius > 1.5) return false; 
      if (type === 'UNKNOWN') return false;

      // B. User Controls
      
      // 1. Region Filter (NEW)
      if (regionFilter !== 'ALL' && fir !== regionFilter) return false;

      // 2. Height Range
      const heightFt = (feature.properties.max_fl || 0) * 100;
      const matchesHeight = heightFt >= minHeight && heightFt <= maxHeight;

      // 3. Type Filter
      const matchesType = activeTypes.includes(type);

      // 4. Search Filter
      const searchLower = searchTerm.toLowerCase();
      const text = (feature.properties.text || "").toLowerCase();
      const id = (feature.properties.id || "").toLowerCase();
      const firLower = fir.toLowerCase();
      
      const matchesSearch = 
        text.includes(searchLower) || 
        id.includes(searchLower) ||
        firLower.includes(searchLower);

      // 5. Unlit Filter
      const matchesUnlit = showUnlitOnly 
        ? (text.includes('unlit') || text.includes('lgt out') || text.includes('out of service'))
        : true;

      return matchesHeight && matchesType && matchesSearch && matchesUnlit;
    });

    return {
      ...data,
      features: filteredFeatures
    };
  }, [data, minHeight, maxHeight, activeTypes, searchTerm, showUnlitOnly, regionFilter]); 

  // --- 3. Dynamic Analytics ---
  const avgCeiling = useMemo(() => {
    if (!filteredData || filteredData.features.length === 0) return 0;
    const totalFL = filteredData.features.reduce((sum, f) => sum + (f.properties.max_fl || 0), 0);
    return totalFL / filteredData.features.length;
  }, [filteredData]);

  // --- 4. Handlers ---
  const toggleType = (typeId: string) => {
    setActiveTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <ObstacleContext.Provider value={{
      data,
      filteredData,
      stats,
      loading,
      avgCeiling,
      minHeight,
      setMinHeight,
      maxHeight,
      setMaxHeight,
      activeTypes,
      toggleType,
      searchTerm,
      setSearchTerm,
      showUnlitOnly,
      setShowUnlitOnly,
      regionFilter,       // <--- EXPOSED
      setRegionFilter     // <--- EXPOSED
    }}>
      {children}
    </ObstacleContext.Provider>
  );
}

export function useObstacles() {
  const context = useContext(ObstacleContext);
  if (context === undefined) {
    throw new Error('useObstacles must be used within an ObstacleProvider');
  }
  return context;
}