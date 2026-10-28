'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AnalysisMode } from '@/types';
import { getCaseStudyById, getReadyCaseStudies } from '@/lib/case-studies';

export interface ModeDisplayInfo {
  id: AnalysisMode;
  label: string;
  description: string;
  hazardLabel: string;
  oppositeLabel: string;
  persistentLabel: string;
}

export const MODE_INFO_MAP: Record<AnalysisMode, ModeDisplayInfo> = {
  flood: {
    id: 'flood',
    label: 'Flood',
    description: 'Inundation mapping & surface water retreat',
    hazardLabel: 'Flooded Area (Land to Water)',
    oppositeLabel: 'Receded Water (Water to Land)',
    persistentLabel: 'Persistent Water',
  },
  'river-erosion': {
    id: 'river-erosion',
    label: 'River erosion',
    description: 'Riverbank erosion & sandbar accretion',
    hazardLabel: 'River Bank Erosion',
    oppositeLabel: 'Accretion / Deposition',
    persistentLabel: 'Persistent River Channel',
  },
  deforestation: {
    id: 'deforestation',
    label: 'Deforestation',
    description: 'Forest canopy disturbance & clear-cutting',
    hazardLabel: 'Forest Canopy Loss',
    oppositeLabel: 'Regrowth / Gain',
    persistentLabel: 'Stable Forest / Land',
  },
  'surface-water': {
    id: 'surface-water',
    label: 'Surface water',
    description: 'Reservoir, wetland & lake extent monitoring',
    hazardLabel: 'Lost Surface Water',
    oppositeLabel: 'New Surface Water',
    persistentLabel: 'Persistent Surface Water',
  },
};

interface AnalysisModeContextType {
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
  selectedAoi: string;
  setSelectedAoi: (aoi: string) => void;
  modeInfo: ModeDisplayInfo;
}

const AnalysisModeContext = createContext<AnalysisModeContextType | undefined>(undefined);

export function normalizeMode(param: string | null): AnalysisMode | null {
  if (!param) return null;
  const p = param.toLowerCase().trim();
  if (p === 'flood') return 'flood';
  if (p === 'erosion' || p === 'river-erosion') return 'river-erosion';
  if (p === 'deforestation') return 'deforestation';
  if (p === 'water' || p === 'surface-water') return 'surface-water';
  return null;
}

export function AnalysisModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AnalysisMode>('flood');
  const [selectedAoi, setSelectedAoiState] = useState<string>(() => {
    const ready = getReadyCaseStudies('flood');
    return ready[0]?.id || 'sylhet';
  });

  const setMode = useCallback((newMode: AnalysisMode) => {
    setModeState(newMode);
    setSelectedAoiState((prevAoi) => {
      const current = getCaseStudyById(prevAoi);
      if (!current || current.module !== newMode || current.status !== 'ready') {
        const valid = getReadyCaseStudies(newMode);
        return valid[0]?.id || prevAoi;
      }
      return prevAoi;
    });
  }, []);

  const setSelectedAoi = useCallback((aoiId: string) => {
    setSelectedAoiState(aoiId);
    const targetAoi = getCaseStudyById(aoiId);
    if (targetAoi?.module) {
      setModeState(targetAoi.module as AnalysisMode);
    }
  }, []);

  const modeInfo = useMemo(() => {
    return MODE_INFO_MAP[mode] || MODE_INFO_MAP.flood;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      selectedAoi,
      setSelectedAoi,
      modeInfo,
    }),
    [mode, setMode, selectedAoi, setSelectedAoi, modeInfo]
  );

  return (
    <AnalysisModeContext.Provider value={value}>
      {children}
    </AnalysisModeContext.Provider>
  );
}

export function useAnalysisMode(): AnalysisModeContextType {
  const context = useContext(AnalysisModeContext);
  if (!context) {
    throw new Error('useAnalysisMode must be used within an AnalysisModeProvider');
  }
  return context;
}
