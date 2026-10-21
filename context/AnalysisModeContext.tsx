'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AnalysisMode } from '@/types';
import { DEMO_AOIS } from '@/constants';

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

export function AnalysisModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AnalysisMode>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlMode = searchParams.get('mode');
      const validModes: AnalysisMode[] = ['flood', 'river-erosion', 'deforestation', 'surface-water'];
      if (urlMode && validModes.includes(urlMode as AnalysisMode)) {
        return urlMode as AnalysisMode;
      }
      const urlAoi = searchParams.get('aoi');
      if (urlAoi) {
        const match = DEMO_AOIS.find((a) => a.id === urlAoi);
        if (match?.mode && validModes.includes(match.mode as AnalysisMode)) {
          return match.mode as AnalysisMode;
        }
      }
    }
    return 'flood';
  });

  const [selectedAoi, setSelectedAoiState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlAoi = searchParams.get('aoi');
      if (urlAoi && DEMO_AOIS.some((a) => a.id === urlAoi)) {
        return urlAoi;
      }
    }
    return DEMO_AOIS[0]?.id || 'sylhet';
  });

  const setMode = useCallback((newMode: AnalysisMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', newMode);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const setSelectedAoi = useCallback((aoiId: string) => {
    setSelectedAoiState(aoiId);
    const targetAoi = DEMO_AOIS.find((a) => a.id === aoiId);
    if (targetAoi?.mode) {
      const targetMode = targetAoi.mode as AnalysisMode;
      setModeState(targetMode);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('aoi', aoiId);
        url.searchParams.set('mode', targetMode);
        window.history.replaceState({}, '', url.toString());
      }
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('aoi', aoiId);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const modeInfo = useMemo(() => {
    return MODE_INFO_MAP[mode] || MODE_INFO_MAP.flood;
  }, [mode]);

  return (
    <AnalysisModeContext.Provider value={{ mode, setMode, selectedAoi, setSelectedAoi, modeInfo }}>
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
