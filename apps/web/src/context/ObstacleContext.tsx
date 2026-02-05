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

// --- Context Definition ---

// Data Context (Stable): holds heavy API responses
interface ObstacleDataContextType {
  data: ObstacleCollection | null;
  stats: StatsData | null;
  loading: boolean;
}

// Filter Context (Volatile): holds UI state and derived filtered data
interface ObstacleFilterContextType {
  filteredData: ObstacleCollection | null;
  avgCeiling: number;

  // Filters
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

  regionFilter: string;
  setRegionFilter: (r: string) => void;
}

const ObstacleDataContext = createContext<ObstacleDataContextType | undefined>(undefined);
const ObstacleFilterContext = createContext<ObstacleFilterContextType | undefined>(undefined);

export function ObstacleProvider({ children }: { children: ReactNode }) {
  // --- Data State ---
  const [data, setData] = useState<ObstacleCollection | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Filter State ---
  const [minHeight, setMinHeight] = useState(0);
  const [maxHeight, setMaxHeight] = useState(50000);
  const [activeTypes, setActiveTypes] = useState<string[]>([
    'WIND TURBINE', 'CRANE', 'MAST', 'LIGHTS'
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUnlitOnly, setShowUnlitOnly] = useState(false);
  const [regionFilter, setRegionFilter] = useState("ALL");

  // --- 1. Data Fetching ---
  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // TODO: Implement SWR or React Query for caching and revalidation
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

  // --- 2. Filtering Logic ---
  const filteredData = useMemo(() => {
    if (!data) return null;

    const filteredFeatures = data.features.filter(feature => {
      // PERF: Cache property access to avoid repeatable read overhead
      const p = feature.properties;
      const type = p.type;

      // Sanity checks: exclude invalid or ghost data
      const radius = p.radius || 0;
      if (radius > 1.5) return false;
      if (type === 'UNKNOWN') return false;

      // Filter Pipeline: ordered by compute cost (cheapest -> most expensive)

      // 1. Region String Match
      if (regionFilter !== 'ALL') {
        const fir = (p.fir || "UNK").toUpperCase();
        if (fir !== regionFilter) return false;
      }

      // 2. Type Inclusion (O(1) lookup)
      if (!activeTypes.includes(type)) return false;

      // 3. Numeric Range
      const heightFt = (p.max_fl || 0) * 100;
      if (heightFt < minHeight || heightFt > maxHeight) return false;

      // 4. Boolean/Substring Check (Unlit)
      if (showUnlitOnly) {
        const text = (p.text || "");
        // Note: checking subsets helps avoid expensive lowercase() on full strings
        if (!text.includes('unlit') && !text.includes('lgt out') && !text.includes('out of service')) {
          return false;
        }
      }

      // 5. Full Text Search (Most expensive)
      if (searchTerm) {
        // TODO: Move this to a web worker if dataset exceeds 10k items
        const searchLower = searchTerm.toLowerCase();
        const text = (p.text || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        const fir = (p.fir || '').toLowerCase();

        if (!text.includes(searchLower) && !id.includes(searchLower) && !fir.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });

    return {
      ...data,
      features: filteredFeatures
    };
  }, [data, minHeight, maxHeight, activeTypes, searchTerm, showUnlitOnly, regionFilter]);

  // --- 3. Analytics ---
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

  // --- 5. Context Providers ---

  // Stable Data Bundle (updates rarely)
  const dataValue = useMemo(() => ({
    data,
    stats,
    loading
  }), [data, stats, loading]);

  // Volatile Filter Bundle (updates frequently)
  const filterValue = useMemo(() => ({
    filteredData,
    avgCeiling,
    minHeight, setMinHeight,
    maxHeight, setMaxHeight,
    activeTypes, toggleType,
    searchTerm, setSearchTerm,
    showUnlitOnly, setShowUnlitOnly,
    regionFilter, setRegionFilter
  }), [
    filteredData, avgCeiling,
    minHeight, maxHeight, activeTypes, searchTerm, showUnlitOnly, regionFilter
  ]);

  return (
    <ObstacleDataContext.Provider value={dataValue}>
      <ObstacleFilterContext.Provider value={filterValue}>
        {children}
      </ObstacleFilterContext.Provider>
    </ObstacleDataContext.Provider>
  );
}

// --- Hooks ---

export function useObstacleData() {
  const context = useContext(ObstacleDataContext);
  if (context === undefined) throw new Error('useObstacleData must be used within ObstacleProvider');
  return context;
}

export function useObstacleFilters() {
  const context = useContext(ObstacleFilterContext);
  if (context === undefined) throw new Error('useObstacleFilters must be used within ObstacleProvider');
  return context;
}

/**
 * @deprecated Use useObstacleData (stable) or useObstacleFilters (volatile) instead.
 */
export function useObstacles() {
  const dataCtx = useObstacleData();
  const filterCtx = useObstacleFilters();

  return {
    ...dataCtx,
    ...filterCtx
  };
}