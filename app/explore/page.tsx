'use client';

import { useState } from 'react';
import { useChangeData } from '@/hooks/useChangeData';
import BeforeAfterViewer from '@/components/visualization/BeforeAfterViewer';
import StatsPanel from '@/components/visualization/StatsPanel';
import { DEMO_AOIS } from '@/constants';
import { ChangeMap } from '@/components/visualization/ChangeMap';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';

export default function ExplorePage() {
  const [selectedAoi, setSelectedAoi] = useState<string>(DEMO_AOIS[0]?.id || '');
  const { data, loading, error } = useChangeData(selectedAoi);
  const activeAoi = DEMO_AOIS.find(a => a.id === selectedAoi);

  return (
    <div className="min-h-screen bg-(--color-paper) p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-(--color-hairline) pb-4">
          <div>
            <h1 className="text-3xl font-bold text-(--color-ink)">
              Explore Data
            </h1>
            <p className="text-(--color-text-secondary) text-sm mt-1">
              Select an area of interest to view SAR change detection analysis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="aoi-select" className="text-sm font-medium text-(--color-ink)">
              Area of Interest:
            </label>
            <select
              id="aoi-select"
              value={selectedAoi}
              onChange={(e) => setSelectedAoi(e.target.value)}
              className="bg-transparent border border-(--color-hairline) text-(--color-ink) rounded-none py-2 px-4 focus:outline-none focus:border-(--color-teal)"
            >
              {DEMO_AOIS.map((aoi) => (
                <option key={aoi.id} value={aoi.id}>
                  {aoi.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading && (
          <div className="flex justify-center items-center h-[50vh]">
            <div className="animate-spin h-12 w-12 border-b-2 border-(--color-teal)"></div>
          </div>
        )}

        {error && (
          <div className="border border-(--color-rust) text-(--color-rust) p-4 text-center">
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Viewer Column (Takes up 2/3 space on large screens) */}
            <div className="lg:col-span-2 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="w-full">
                <BeforeAfterViewer 
                  beforeImage={data.beforeImage} 
                  afterImage={data.afterImage} 
                  changeMapImage={data.changeMapImage} 
                />
              </div>
              {activeAoi && (
                <div className="w-full">
                  <ChangeMap data={data} aoi={activeAoi} />
                </div>
              )}
            </div>
            
            {/* Stats Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <StatsPanel 
                percentChanged={data.percentChanged}
                affectedAreaKm2={data.affectedAreaKm2}
                confidence={data.confidence}
                chartData={data.chartData}
              />
              <AIInsightPanel 
                percentChanged={data.percentChanged}
                affectedAreaKm2={data.affectedAreaKm2}
                confidence={data.confidence}
                aoiName={activeAoi?.name || ''}
                aoiId={activeAoi?.id || ''}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
