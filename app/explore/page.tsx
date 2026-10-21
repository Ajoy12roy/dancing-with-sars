'use client';

import { useState } from 'react';
import { useChangeData, useUploadChangeData } from '@/hooks/useChangeData';
import BeforeAfterViewer from '@/components/visualization/BeforeAfterViewer';
import StatsPanel from '@/components/visualization/StatsPanel';
import CategoryBreakdownChart from '@/components/visualization/CategoryBreakdownChart';
import { ChangeMap } from '@/components/visualization/ChangeMap';
import ShorelineShiftCard from '@/components/visualization/ShorelineShiftCard';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { HairlineProgress } from '@/components/upload/HairlineProgress';
import { useAnalysisMode } from '@/context';
import { DEMO_AOIS } from '@/constants';
import type { AreaOfInterest, AnalysisMode } from '@/types';

const MODE_TABS: { id: AnalysisMode; label: string }[] = [
  { id: 'flood', label: 'Flood' },
  { id: 'river-erosion', label: 'River Erosion' },
  { id: 'deforestation', label: 'Deforestation' },
  { id: 'surface-water', label: 'Surface Water' },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'demo' | 'upload'>('demo');
  const { mode, setMode, selectedAoi, setSelectedAoi } = useAnalysisMode();

  // Quick Demo State
  const { data: demoData, loading: demoLoading, error: demoError } = useChangeData(selectedAoi);
  const activeDemoAoi = DEMO_AOIS.find((a) => a.id === selectedAoi) || DEMO_AOIS[0];

  // Upload State
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [uploadDateA, setUploadDateA] = useState<string>('');
  const [uploadDateB, setUploadDateB] = useState<string>('');
  const {
    data: uploadData,
    loading: uploadLoading,
    error: uploadError,
    analyze: analyzeUpload,
    reset: resetUpload,
  } = useUploadChangeData();

  const handleResetUpload = () => {
    setBeforeFile(null);
    setAfterFile(null);
    setUploadDateA('');
    setUploadDateB('');
    resetUpload();
  };

  const handleAnalyze = () => {
    if (beforeFile && afterFile) {
      analyzeUpload(beforeFile, afterFile, {
        mode,
        dateA: uploadDateA || undefined,
        dateB: uploadDateB || undefined,
      });
    }
  };

  // Switch mode tab
  const handleModeSelect = (newMode: AnalysisMode) => {
    setMode(newMode);
    if (activeTab === 'demo') {
      const matching = DEMO_AOIS.filter((a) => a.mode === newMode);
      if (matching.length > 0 && matching[0]) {
        setSelectedAoi(matching[0].id);
      }
    }
  };

  // Switch demo AOI select
  const handleAoiSelect = (aoiId: string) => {
    setSelectedAoi(aoiId);
    const found = DEMO_AOIS.find((a) => a.id === aoiId);
    if (found?.mode && found.mode !== mode) {
      setMode(found.mode as AnalysisMode);
    }
  };

  // Filter demo AOIs for current mode
  const filteredAois = DEMO_AOIS.filter((a) => a.mode === mode);
  const displayAois = filteredAois.length > 0 ? filteredAois : DEMO_AOIS;

  // Build upload AOI representation for ChangeMap / BeforeAfterViewer
  const uploadAoi: AreaOfInterest | null = uploadData
    ? {
        id: uploadData.aoiId,
        mode: uploadData.mode || mode,
        name: uploadData.name || 'Uploaded SAR Imagery',
        description: 'User-uploaded SAR GeoTIFF change detection analysis',
        country: 'Custom',
        bounds: uploadData.bounds || { north: 0, south: 0, east: 0, west: 0 },
        center: uploadData.center || [0, 0],
        zoom: uploadData.zoom || 10,
        sceneBefore: {
          id: `${uploadData.aoiId}-before`,
          aoiId: uploadData.aoiId,
          date: uploadData.dateBefore || 'Before Scene',
          satellite: 'Sentinel-1',
          polarization: 'VV',
          previewUrl: uploadData.beforeImage,
          bounds: uploadData.bounds || { north: 0, south: 0, east: 0, west: 0 },
        },
        sceneAfter: {
          id: `${uploadData.aoiId}-after`,
          aoiId: uploadData.aoiId,
          date: uploadData.dateAfter || 'After Scene',
          satellite: 'Sentinel-1',
          polarization: 'VV',
          previewUrl: uploadData.afterImage,
          bounds: uploadData.bounds || { north: 0, south: 0, east: 0, west: 0 },
        },
      }
    : null;

  const displayData = activeTab === 'demo' ? demoData : uploadData;
  const activeAoi = activeTab === 'demo' ? activeDemoAoi : uploadAoi;

  return (
    <div className="min-h-screen bg-(--color-paper) text-(--color-ink) p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top: 4-Mode Selector Tabs with hairline underline */}
        <div className="border-b border-(--color-hairline)">
          <div className="flex gap-6 sm:gap-8 overflow-x-auto">
            {MODE_TABS.map((tab) => {
              const isActive = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleModeSelect(tab.id)}
                  className={`pb-3 font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-(--color-teal) text-(--color-ink)'
                      : 'border-transparent text-(--color-text-secondary) hover:text-(--color-ink)'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 12-Column CSS Grid Layout with consistent 24px gap (gap-6) */}
        <div className="grid grid-cols-12 gap-6">
          {/* ── Row 1: Page Header + AOI Select / Mode Switcher (12 columns) ── */}
          <div className="col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-(--color-hairline)">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold font-headline text-(--color-ink)">
                {activeTab === 'demo'
                  ? activeDemoAoi?.name || 'Precomputed Case Studies'
                  : 'Custom SAR Analysis'}
              </h1>
              <p className="text-(--color-text-secondary) text-sm mt-1 font-sans">
                {activeTab === 'demo'
                  ? activeDemoAoi?.description || 'Sentinel-1 radar backscatter variation analysis'
                  : 'Upload co-registered Before and After SAR GeoTIFF imagery to detect ground surface change.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              {/* Quick Demo vs Upload Toggle */}
              <div className="inline-flex border border-(--color-hairline) rounded-[2px] p-0.5 bg-(--color-paper)">
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors cursor-pointer ${
                    activeTab === 'demo'
                      ? 'bg-(--color-teal) text-white'
                      : 'text-(--color-text-secondary) hover:text-(--color-ink)'
                  }`}
                >
                  Quick Demo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-(--color-teal) text-white'
                      : 'text-(--color-text-secondary) hover:text-(--color-ink)'
                  }`}
                >
                  Upload Your Own
                </button>
              </div>

              {/* AOI Select (when in Quick Demo mode) */}
              {activeTab === 'demo' && (
                <div className="flex items-center gap-2">
                  <label htmlFor="aoi-select" className="text-xs font-medium text-(--color-text-secondary) shrink-0 font-sans">
                    Case Study:
                  </label>
                  <select
                    id="aoi-select"
                    value={selectedAoi}
                    onChange={(e) => handleAoiSelect(e.target.value)}
                    className="bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) rounded-[2px] py-1.5 px-3 text-xs font-data focus:outline-none focus:border-(--color-teal) cursor-pointer"
                  >
                    {displayAois.map((aoi) => (
                      <option key={aoi.id} value={aoi.id}>
                        {aoi.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Upload button (when in Upload mode with data) */}
              {activeTab === 'upload' && uploadData && (
                <button
                  type="button"
                  onClick={handleResetUpload}
                  className="px-3 py-1.5 text-xs font-medium border border-(--color-hairline) text-(--color-ink) hover:border-(--color-ink) rounded-[2px] transition-colors cursor-pointer"
                >
                  Upload Another Pair
                </button>
              )}
            </div>
          </div>

          {/* ── Upload Mode Form / Progress States ── */}
          {activeTab === 'upload' && uploadError && (
            <div className="col-span-12 border border-(--color-rust) text-(--color-rust) p-4 rounded-[2px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-sm">Analysis Failed</p>
                <p className="text-sm font-sans">{uploadError}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className="px-3 py-1.5 text-xs font-medium border border-(--color-hairline) text-(--color-ink) hover:border-(--color-ink) rounded-[2px] transition-colors cursor-pointer"
                >
                  Return to Quick Demo
                </button>
                <button
                  type="button"
                  onClick={handleResetUpload}
                  className="px-3 py-1.5 text-xs font-medium border border-(--color-rust) text-(--color-rust) hover:bg-(--color-rust) hover:text-white rounded-[2px] transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {activeTab === 'upload' && uploadLoading && (
            <div className="col-span-12">
              <HairlineProgress />
            </div>
          )}

          {activeTab === 'upload' && !uploadLoading && !uploadData && (
            <div className="col-span-12 border border-(--color-hairline) bg-(--color-paper) p-6 rounded-[2px] space-y-6">
              <div>
                <h2 className="text-xl font-bold font-headline text-(--color-ink)">
                  Upload SAR GeoTIFF Files
                </h2>
                <p className="text-(--color-text-secondary) text-sm mt-1 font-sans">
                  Upload co-registered Before and After SAR imagery (.tif or .tiff, up to 250 MB each) to compute radar backscatter changes.
                </p>
              </div>

              {/* Analysis Configuration Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-(--color-hairline) bg-(--color-paper-warm) p-4 rounded-[2px]">
                <div>
                  <label htmlFor="upload-mode-select" className="block text-xs font-medium text-(--color-text-secondary) mb-1 font-sans">
                    Analysis type
                  </label>
                  <select
                    id="upload-mode-select"
                    value={mode}
                    onChange={(e) => handleModeSelect(e.target.value as AnalysisMode)}
                    className="w-full bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) rounded-[2px] py-2 px-3 text-sm focus:outline-none focus:border-(--color-teal) cursor-pointer"
                  >
                    <option value="flood">Flood</option>
                    <option value="river-erosion">River erosion</option>
                    <option value="deforestation">Deforestation</option>
                    <option value="surface-water">Surface water</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="upload-date-a" className="block text-xs font-medium text-(--color-text-secondary) mb-1 font-sans">
                    Before date (optional)
                  </label>
                  <input
                    type="date"
                    id="upload-date-a"
                    value={uploadDateA}
                    onChange={(e) => setUploadDateA(e.target.value)}
                    className="w-full bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) rounded-[2px] py-2 px-3 text-sm font-data focus:outline-none focus:border-(--color-teal)"
                  />
                </div>
                <div>
                  <label htmlFor="upload-date-b" className="block text-xs font-medium text-(--color-text-secondary) mb-1 font-sans">
                    After date (optional)
                  </label>
                  <input
                    type="date"
                    id="upload-date-b"
                    value={uploadDateB}
                    onChange={(e) => setUploadDateB(e.target.value)}
                    className="w-full bg-(--color-paper) border border-(--color-hairline) text-(--color-ink) rounded-[2px] py-2 px-3 text-sm font-data focus:outline-none focus:border-(--color-teal)"
                  />
                </div>
              </div>

              {/* File Drop Zones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileDropZone
                  label="Before image (.tif / .tiff)"
                  file={beforeFile}
                  onFileSelect={(f) => setBeforeFile(f)}
                  onFileRemove={() => setBeforeFile(null)}
                  disabled={uploadLoading}
                />
                <FileDropZone
                  label="After image (.tif / .tiff)"
                  file={afterFile}
                  onFileSelect={(f) => setAfterFile(f)}
                  onFileRemove={() => setAfterFile(null)}
                  disabled={uploadLoading}
                />
              </div>

              {/* Submit Action */}
              <div className="flex justify-end pt-2 border-t border-(--color-hairline)">
                <button
                  type="button"
                  disabled={!beforeFile || !afterFile || uploadLoading}
                  onClick={handleAnalyze}
                  className="bg-(--color-teal) text-white border border-(--color-teal) hover:bg-(--color-teal-light) disabled:bg-transparent disabled:text-(--color-text-secondary) disabled:border-(--color-hairline) disabled:cursor-not-allowed rounded-[2px] px-6 py-2.5 font-medium text-sm transition-colors cursor-pointer"
                >
                  Analyze
                </button>
              </div>
            </div>
          )}

          {/* ── Demo Loading / Error States ── */}
          {activeTab === 'demo' && demoLoading && (
            <div className="col-span-12 flex justify-center items-center h-[50vh] border border-(--color-hairline) bg-(--color-paper) rounded-[2px]">
              <div className="font-data text-sm text-(--color-text-secondary)">
                Loading SAR observation data...
              </div>
            </div>
          )}

          {activeTab === 'demo' && demoError && (
            <div className="col-span-12 border border-(--color-rust) text-(--color-rust) p-6 rounded-[2px] text-center">
              <p className="font-semibold text-sm">Error Loading Precomputed Data</p>
              <p className="text-xs mt-1 font-sans">{demoError}</p>
            </div>
          )}

          {/* ── Results View: Rendered for both Demo and Upload Success ── */}
          {displayData && activeAoi && (activeTab === 'demo' ? !demoLoading && !demoError : !uploadLoading) && (
            <>
              {/* ── Row 2: Before/After Viewer (7 cols) + Map Card (5 cols), Equal Height ── */}
              <div className="col-span-12 lg:col-span-7 flex">
                <BeforeAfterViewer
                  beforeImage={displayData.beforeImage}
                  afterImage={displayData.afterImage}
                  changeMapImage={displayData.changeMapImage}
                  dateBefore={displayData.dateBefore}
                  dateAfter={displayData.dateAfter}
                />
              </div>

              <div className="col-span-12 lg:col-span-5 flex">
                {mode === 'deforestation' ? (
                  <ChangeMap data={displayData} aoi={activeAoi} />
                ) : (
                  <ShorelineShiftCard data={displayData} mode={mode} />
                )}
              </div>

              {/* ── Row 3: Metric Cards Row (12 cols, equal width/height, same padding) ── */}
              <div className="col-span-12">
                <StatsPanel
                  data={displayData}
                  mode={displayData.mode || activeAoi.mode || mode}
                />
              </div>

              {/* ── Row 4: Charts Row (7 cols Category Breakdown + 5 cols AI Insight) ── */}
              <div className="col-span-12 lg:col-span-7 flex">
                <div className="border border-(--color-hairline) bg-(--color-paper) rounded-[2px] flex flex-col h-full min-h-85 w-full">
                  {/* Header bar (h-12) */}
                  <div className="h-12 px-4 border-b border-(--color-hairline) flex items-center justify-between bg-(--color-paper) shrink-0">
                    <h3 className="font-bold font-headline text-base text-(--color-ink)">Category Breakdown</h3>
                    <span className="font-data text-xs text-(--color-text-secondary)">Area (km²)</span>
                  </div>

                  {/* Body (flex-1) with CategoryBreakdownChart */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div className="h-56 w-full">
                      <CategoryBreakdownChart
                        categories={displayData.categories}
                        chartData={displayData.chartData}
                      />
                    </div>

                    {displayData.categories && displayData.categories.length > 0 && (
                      <div className="pt-3 border-t border-(--color-hairline) flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        {displayData.categories.map((cat) => (
                          <div key={cat.id} className="flex items-center gap-1.5 font-data text-(--color-text-secondary)">
                            <span
                              className="w-2.5 h-2.5 rounded-sm border border-(--color-hairline) shrink-0"
                              style={{
                                backgroundColor:
                                  cat.kind === 'loss' || cat.id.includes('loss') || cat.id.includes('erosion') || cat.id.includes('flooded')
                                    ? 'var(--color-rust)'
                                    : cat.kind === 'gain' || cat.id.includes('accretion')
                                    ? 'var(--color-teal)'
                                    : '#7D8A92',
                              }}
                            />
                            <span className="text-(--color-ink) font-sans">{cat.label}:</span>
                            <span className="font-medium text-(--color-teal)">{cat.areaKm2.toFixed(2)} km²</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 flex">
                <AIInsightPanel
                  data={displayData}
                  percentChanged={displayData.percentChanged}
                  affectedAreaKm2={displayData.affectedAreaKm2}
                  confidence={displayData.confidence}
                  totalAreaKm2={displayData.totalAreaKm2}
                  metrics={displayData.metrics}
                  categories={displayData.categories}
                  dates={displayData.dates}
                  warnings={displayData.warnings}
                  aoiName={activeAoi.name}
                  aoiId={activeAoi.id}
                  mode={displayData.mode || activeAoi.mode || mode}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
