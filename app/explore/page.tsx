'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChangeData, useUploadChangeData } from '@/hooks/useChangeData';
import BeforeAfterViewer from '@/components/visualization/BeforeAfterViewer';
import StatsPanel from '@/components/visualization/StatsPanel';
import CategoryBreakdownChart from '@/components/visualization/CategoryBreakdownChart';
import { ChangeMap } from '@/components/visualization/ChangeMap';
import ShorelineShiftCard from '@/components/visualization/ShorelineShiftCard';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';
import { DataPanel } from '@/components/ui/DataPanel';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { HairlineProgress } from '@/components/upload/HairlineProgress';
import { useAnalysisMode } from '@/context';
import { DEMO_AOIS } from '@/constants';
import type { AreaOfInterest, AnalysisMode } from '@/types';

function parseModeParam(param: string | null): AnalysisMode | null {
  if (!param) return null;
  const p = param.toLowerCase().trim();
  if (p === 'flood') return 'flood';
  if (p === 'erosion' || p === 'river-erosion') return 'river-erosion';
  if (p === 'deforestation') return 'deforestation';
  if (p === 'water' || p === 'surface-water') return 'surface-water';
  return null;
}

function modeToParam(m: AnalysisMode): string {
  if (m === 'river-erosion') return 'erosion';
  if (m === 'surface-water') return 'water';
  return m;
}

function ExploreContent() {
  const [activeTab, setActiveTab] = useState<'demo' | 'upload'>('demo');
  const { mode, setMode, selectedAoi, setSelectedAoi } = useAnalysisMode();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawModeParam = searchParams.get('mode');

  // Synchronize URL search param -> context state on load or URL param change.
  // URL is the single source of truth when a search parameter is present.
  useEffect(() => {
    const parsed = parseModeParam(rawModeParam);
    if (parsed && parsed !== mode) {
      setMode(parsed);
      if (activeTab === 'demo') {
        const matching = DEMO_AOIS.find((a) => a.mode === parsed);
        if (matching && matching.id !== selectedAoi) {
          setSelectedAoi(matching.id);
        }
      }
    }
  }, [rawModeParam, mode, selectedAoi, activeTab, setMode, setSelectedAoi]);

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

  // Switch mode tab and sync URL
  const handleModeSelect = useCallback((newMode: AnalysisMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      if (activeTab === 'demo') {
        const matching = DEMO_AOIS.find((a) => a.mode === newMode);
        if (matching && matching.id !== selectedAoi) {
          setSelectedAoi(matching.id);
        }
      }
    }
    const targetParam = modeToParam(newMode);
    if (rawModeParam !== targetParam) {
      router.replace(`/explore?mode=${targetParam}`, { scroll: false });
    }
  }, [mode, selectedAoi, activeTab, rawModeParam, router, setMode, setSelectedAoi]);

  // Switch demo AOI select and sync URL
  const handleAoiSelect = useCallback((aoiId: string) => {
    if (aoiId !== selectedAoi) {
      setSelectedAoi(aoiId);
    }
    const found = DEMO_AOIS.find((a) => a.id === aoiId);
    if (found?.mode) {
      const targetMode = found.mode as AnalysisMode;
      if (targetMode !== mode) {
        setMode(targetMode);
      }
      const targetParam = modeToParam(targetMode);
      if (rawModeParam !== targetParam) {
        router.replace(`/explore?mode=${targetParam}`, { scroll: false });
      }
    }
  }, [selectedAoi, mode, rawModeParam, router, setSelectedAoi, setMode]);

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

  // Wrap items passed to CategoryBreakdownChart in useMemo keyed on the underlying result
  const chartItems = useMemo(() => {
    const categories = displayData?.categories;
    if (!categories || categories.length === 0) return [];
    return categories.map((cat) => {
      const isLoss =
        cat.kind === 'loss' ||
        cat.id.includes('loss') ||
        cat.id.includes('erosion') ||
        cat.id.includes('flooded');
      const isGain =
        cat.kind === 'gain' ||
        cat.id.includes('gain') ||
        cat.id.includes('accretion');
      const color = isLoss ? '#A8462E' : isGain ? '#2C5C61' : '#7D8A92';
      return {
        name: cat.label || cat.id,
        areaKm2: Number(cat.areaKm2.toFixed(2)),
        color,
        kind: cat.kind,
      };
    });
  }, [displayData?.categories]);

  return (
    <div className="min-h-screen bg-(--color-paper) text-(--color-ink) p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
                  Upload co-registered Before and After SAR imagery (.tif or .tiff, up to 250 MB each) to compute radar backscatter changes. Requires local Python runtime; precomputed case studies in Quick Demo work without Python.
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
              {/* ── Row 1: Left = SAR Imagery Comparison (7 cols), Right = Geospatial Classification (5 cols) ── */}
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

              {/* ── Row 2: Left = Category Breakdown (7 cols), Right = Radar Interpretation (5 cols) ── */}
              <div className="col-span-12 lg:col-span-7 flex">
                <DataPanel
                  title="Category Breakdown"
                  rightSlot={
                    <span className="font-data text-xs text-(--color-text-secondary)">Area (km²)</span>
                  }
                  className="h-full w-full"
                  bodyClassName="justify-between"
                >
                  <div className="h-56 w-full">
                    <CategoryBreakdownChart
                      categories={displayData.categories}
                      items={chartItems}
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
                </DataPanel>
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

              {/* ── Row 3: Metric Cards Row (12 cols, equal width/height, same padding) ── */}
              <div className="col-span-12">
                <StatsPanel
                  data={displayData}
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

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 bg-(--color-hairline) w-64 mb-4 rounded-sm" />
          <div className="h-96 bg-(--color-hairline) w-full rounded-sm" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
