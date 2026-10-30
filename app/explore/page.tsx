'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChangeData, useUploadChangeData } from '@/hooks/useChangeData';
import BeforeAfterViewer from '@/components/visualization/BeforeAfterViewer';
import StatsPanel from '@/components/visualization/StatsPanel';
import CategoryBreakdownChart from '@/components/visualization/CategoryBreakdownChart';
import { ChangeMap } from '@/components/visualization/ChangeMap';
import ShorelineShiftCard from '@/components/visualization/ShorelineShiftCard';
import CaseStudyCard from '@/components/visualization/CaseStudyCard';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';
import { DataPanel } from '@/components/ui/DataPanel';
import { FileDropZone } from '@/components/upload/FileDropZone';
import { HairlineProgress } from '@/components/upload/HairlineProgress';
import { useAnalysisMode } from '@/context';
import {
  getReadyDemoAois,
  getReadyCaseStudies,
  getCaseStudyById,
} from '@/lib/case-studies';
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

  const readyAois = useMemo(() => getReadyDemoAois(), []);
  const activeModeCaseStudies = useMemo(() => getReadyCaseStudies(mode), [mode]);
  const currentCaseStudy = useMemo(() => getCaseStudyById(selectedAoi), [selectedAoi]);

  const rawModeParam = searchParams.get('mode');

  // Synchronize URL search param -> context state on load or URL param change.
  // URL is the single source of truth when a search parameter is present.
  useEffect(() => {
    const parsed = parseModeParam(rawModeParam);
    const targetMode = parsed || mode;

    if (parsed && parsed !== mode) {
      setMode(parsed);
    }

    // Ensure selectedAoi belongs to the active/target mode
    const current = getCaseStudyById(selectedAoi);
    if (!current || current.module !== targetMode || current.status !== 'ready') {
      const validCases = getReadyCaseStudies(targetMode);
      if (validCases.length > 0 && validCases[0]) {
        setSelectedAoi(validCases[0].id);
      }
    }
  }, [rawModeParam, mode, selectedAoi, setMode, setSelectedAoi]);

  // Quick Demo State
  const { data: demoData, loading: demoLoading, error: demoError } = useChangeData(selectedAoi);
  const activeDemoAoi =
    readyAois.find((a) => a.id === selectedAoi) ||
    readyAois.find((a) => a.mode === mode) ||
    readyAois[0];

  // Upload State
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [uploadDateA, setUploadDateA] = useState<string>('');
  const [uploadDateB, setUploadDateB] = useState<string>('');
  const [sampleLoading, setSampleLoading] = useState<boolean>(false);

  const {
    data: uploadData,
    loading: uploadLoading,
    statusText: uploadStatusText,
    error: uploadError,
    serverStatus,
    apiUrl,
    analyze: analyzeUpload,
    analyzeSample: analyzeSampleUpload,
    reset: resetUpload,
    pingHealth,
  } = useUploadChangeData();

  // Ping /health once when upload panel becomes visible
  useEffect(() => {
    if (activeTab === 'upload' && apiUrl && serverStatus === 'idle') {
      pingHealth();
    }
  }, [activeTab, apiUrl, serverStatus, pingHealth]);

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

  const handleDownloadSampleFiles = () => {
    const download = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    download('/samples/sylhet_before.tif', 'sylhet_before.tif');
    setTimeout(() => {
      download('/samples/sylhet_after.tif', 'sylhet_after.tif');
    }, 300);
  };

  const handleTryWithSampleFiles = async () => {
    try {
      setSampleLoading(true);
      setBeforeFile(null);
      setAfterFile(null);
      setUploadDateA('2022-05-01');
      setUploadDateB('2022-06-21');

      await analyzeSampleUpload({
        name: 'sylhet',
        mode: mode || 'flood',
        dateA: '2022-05-01',
        dateB: '2022-06-21',
      });
    } catch (err: unknown) {
      console.error('Failed to run sample analysis:', err);
    } finally {
      setSampleLoading(false);
    }
  };

  // Switch mode tab and sync URL
  const handleModeSelect = useCallback((newMode: AnalysisMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      const validCases = getReadyCaseStudies(newMode);
      if (validCases.length > 0 && validCases[0]) {
        const current = getCaseStudyById(selectedAoi);
        if (!current || current.module !== newMode) {
          setSelectedAoi(validCases[0].id);
        }
      }
    }
    const targetParam = modeToParam(newMode);
    if (rawModeParam !== targetParam) {
      router.replace(`/explore?mode=${targetParam}`, { scroll: false });
    }
  }, [mode, selectedAoi, rawModeParam, router, setMode, setSelectedAoi]);

  // Switch demo AOI select and sync URL
  const handleAoiSelect = useCallback((aoiId: string) => {
    if (aoiId !== selectedAoi) {
      setSelectedAoi(aoiId);
    }
    const found = getCaseStudyById(aoiId);
    if (found?.module) {
      const targetMode = found.module as AnalysisMode;
      if (targetMode !== mode) {
        setMode(targetMode);
      }
      const targetParam = modeToParam(targetMode);
      if (rawModeParam !== targetParam) {
        router.replace(`/explore?mode=${targetParam}`, { scroll: false });
      }
    }
  }, [selectedAoi, mode, rawModeParam, router, setSelectedAoi, setMode]);


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

  const displayTitle =
    activeTab === 'demo'
      ? currentCaseStudy?.title || activeDemoAoi?.name || 'Precomputed Case Studies'
      : 'Custom SAR Analysis';

  const displayDescription =
    activeTab === 'demo'
      ? currentCaseStudy?.description || currentCaseStudy?.summary || activeDemoAoi?.description || 'Sentinel-1 radar backscatter variation analysis'
      : 'Upload co-registered Before and After SAR GeoTIFF imagery to detect ground surface change.';

  return (
    <div className="min-h-screen bg-paper text-ink p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 12-Column CSS Grid Layout with consistent 24px gap (gap-6) */}
        <div className="grid grid-cols-12 gap-6">
          {/* ── Row 1: Centered Case Study Title and Description (12 cols) ── */}
          <div className="col-span-12 text-center space-y-2 pb-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-headline text-ink tracking-tight">
              {displayTitle}
            </h1>
            <p className="text-text-secondary text-sm sm:text-base max-w-3xl mx-auto font-sans leading-relaxed">
              {displayDescription}
            </p>
          </div>

          {/* ── Row 2: Two-Sided Controls (Left: Quick Demo & Upload, Right: Case Study Selector) ── */}
          <div className="col-span-12 pb-4 border-b border-hairline">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Left side — Quick Demo and Upload controls (immediately above SAR Image Comparison) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex border border-hairline rounded-[2px] p-0.5 bg-surface-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('demo')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors cursor-pointer ${
                      activeTab === 'demo'
                        ? 'bg-accent text-text-on-accent font-semibold'
                        : 'text-text-secondary hover:text-ink'
                    }`}
                  >
                    Quick Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors cursor-pointer ${
                      activeTab === 'upload'
                        ? 'bg-accent text-text-on-accent font-semibold'
                        : 'text-text-secondary hover:text-ink'
                    }`}
                  >
                    Upload Your Own
                  </button>
                </div>

                {/* Reset Upload button (when in Upload mode with data) */}
                {activeTab === 'upload' && uploadData && (
                  <button
                    type="button"
                    onClick={handleResetUpload}
                    className="px-3 py-1.5 text-xs font-medium border border-hairline text-ink hover:border-ink rounded-[2px] transition-colors cursor-pointer"
                  >
                    Upload Another Pair
                  </button>
                )}

                {/* Server Status indicator (when in Upload mode and API URL configured) */}
                {activeTab === 'upload' && apiUrl && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-hairline rounded-[2px] bg-surface-2 text-xs font-data">
                    {serverStatus === 'ready' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                        <span className="text-teal font-medium">Server ready</span>
                      </>
                    )}
                    {serverStatus === 'waking' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rust animate-pulse shrink-0" />
                        <span className="text-text-secondary">Server waking up</span>
                      </>
                    )}
                    {serverStatus === 'offline' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rust shrink-0" />
                        <span className="text-rust">Server offline</span>
                      </>
                    )}
                    {serverStatus === 'idle' && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-hairline shrink-0" />
                        <span className="text-text-secondary">Connecting...</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right side — Case Study selector (immediately above Flood Detection and analysis sections) */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                <label htmlFor="aoi-select" className="text-xs font-medium text-text-secondary shrink-0 font-sans">
                  Case Study:
                </label>
                <select
                  id="aoi-select"
                  value={selectedAoi}
                  onChange={(e) => {
                    handleAoiSelect(e.target.value);
                    if (activeTab !== 'demo') {
                      setActiveTab('demo');
                    }
                  }}
                  className="bg-surface border border-hairline text-ink rounded-[2px] py-1.5 px-3 text-xs font-data focus:outline-none focus:border-accent cursor-pointer flex-1 sm:flex-initial max-w-full sm:max-w-xs md:max-w-md truncate"
                >
                  {activeModeCaseStudies.map((cs) => (
                    <option key={cs.id} value={cs.id} className="font-normal font-sans text-ink">
                      {cs.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Notice when Live Processing API URL is not configured ── */}
          {activeTab === 'upload' && !apiUrl && (
            <div className="col-span-12 border border-hairline bg-surface p-6 rounded-[2px] space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rust" />
                <h2 className="text-base font-bold font-headline text-ink">
                  Live Processing Not Configured
                </h2>
              </div>
              <p className="text-text-secondary text-sm font-sans">
                Live processing is not configured; precomputed areas still work.
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className="px-4 py-2 text-xs font-semibold bg-accent text-text-on-accent rounded-[2px] border border-accent hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  View Precomputed Case Studies
                </button>
              </div>
            </div>
          )}

          {/* ── Upload Mode Form / Progress States ── */}
          {activeTab === 'upload' && uploadError && (
            <div className="col-span-12 border border-rust text-rust p-4 rounded-[2px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-sm">Analysis Failed</p>
                <p className="text-sm font-sans">{uploadError}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className="px-3 py-1.5 text-xs font-medium border border-hairline text-ink hover:border-ink rounded-[2px] transition-colors cursor-pointer"
                >
                  Return to Quick Demo
                </button>
                <button
                  type="button"
                  onClick={handleResetUpload}
                  className="px-3 py-1.5 text-xs font-medium border border-rust text-rust hover:bg-rust hover:text-text-on-accent rounded-[2px] transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {activeTab === 'upload' && uploadLoading && (
            <div className="col-span-12">
              <HairlineProgress statusText={uploadStatusText || 'Analyzing radar change'} />
            </div>
          )}

          {activeTab === 'upload' && apiUrl && !uploadLoading && !uploadData && (
            <div className="col-span-12 border border-hairline bg-surface p-6 rounded-[2px] space-y-6">
              <div>
                <h2 className="text-xl font-bold font-headline text-ink">
                  Upload SAR GeoTIFF Files
                </h2>
                <p className="text-text-secondary text-sm mt-1 font-sans">
                  Upload co-registered Before and After SAR imagery (.tif or .tiff, up to 60 MB each) to compute radar backscatter changes.
                </p>
              </div>

              {/* Analysis Configuration Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-hairline bg-surface-2 p-4 rounded-[2px]">
                <div>
                  <label htmlFor="upload-mode-select" className="block text-xs font-medium text-text-secondary mb-1 font-sans">
                    Analysis type
                  </label>
                  <select
                    id="upload-mode-select"
                    value={mode}
                    onChange={(e) => handleModeSelect(e.target.value as AnalysisMode)}
                    className="w-full bg-surface border border-hairline text-ink rounded-[2px] py-2 px-3 text-sm focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="flood">Flood</option>
                    <option value="river-erosion">River erosion</option>
                    <option value="deforestation">Deforestation</option>
                    <option value="surface-water">Surface water</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="upload-date-a" className="block text-xs font-medium text-text-secondary mb-1 font-sans">
                    Before date (optional)
                  </label>
                  <input
                    type="date"
                    id="upload-date-a"
                    value={uploadDateA}
                    onChange={(e) => setUploadDateA(e.target.value)}
                    className="w-full bg-surface border border-hairline text-ink rounded-[2px] py-2 px-3 text-sm font-data focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="upload-date-b" className="block text-xs font-medium text-text-secondary mb-1 font-sans">
                    After date (optional)
                  </label>
                  <input
                    type="date"
                    id="upload-date-b"
                    value={uploadDateB}
                    onChange={(e) => setUploadDateB(e.target.value)}
                    className="w-full bg-surface border border-hairline text-ink rounded-[2px] py-2 px-3 text-sm font-data focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* File Drop Zones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileDropZone
                  label="Before image (.tif / .tiff, max 60 MB)"
                  file={beforeFile}
                  onFileSelect={(f) => setBeforeFile(f)}
                  onFileRemove={() => setBeforeFile(null)}
                  disabled={uploadLoading || sampleLoading}
                />
                <FileDropZone
                  label="After image (.tif / .tiff, max 60 MB)"
                  file={afterFile}
                  onFileSelect={(f) => setAfterFile(f)}
                  onFileRemove={() => setAfterFile(null)}
                  disabled={uploadLoading || sampleLoading}
                />
              </div>

              {/* Sample buttons & Submit Action */}
              <div className="pt-4 border-t border-hairline space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSampleFiles}
                      className="px-3 py-1.5 text-xs font-medium border border-hairline text-ink hover:border-ink rounded-[2px] transition-colors cursor-pointer bg-surface"
                    >
                      Download sample files
                    </button>
                    <button
                      type="button"
                      onClick={handleTryWithSampleFiles}
                      disabled={uploadLoading || sampleLoading}
                      className="px-3 py-1.5 text-xs font-medium border border-hairline text-teal hover:border-teal rounded-[2px] transition-colors cursor-pointer bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sampleLoading ? 'Loading samples...' : 'Try with sample files'}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!beforeFile || !afterFile || uploadLoading || sampleLoading}
                    onClick={handleAnalyze}
                    className="bg-accent text-text-on-accent font-semibold border border-accent hover:bg-accent-hover disabled:bg-transparent disabled:text-text-secondary disabled:border-hairline disabled:cursor-not-allowed rounded-[2px] px-6 py-2.5 text-sm transition-colors cursor-pointer"
                  >
                    Analyze
                  </button>
                </div>

                <p className="text-xs text-text-secondary font-sans">
                  Use clipped GeoTIFFs (about 10-20 km wide, both dates on the same grid). Full raw Sentinel-1 scenes are too large.
                </p>
              </div>
            </div>
          )}

          {/* ── Demo Loading / Error States ── */}
          {activeTab === 'demo' && demoLoading && (
            <div className="col-span-12 flex justify-center items-center h-[50vh] border border-hairline bg-surface rounded-[2px]">
              <div className="font-data text-sm text-text-secondary">
                Loading SAR observation data...
              </div>
            </div>
          )}

          {activeTab === 'demo' && demoError && (
            <div className="col-span-12 border border-rust bg-surface text-rust p-6 rounded-[2px] text-center">
              <p className="font-semibold text-sm">Error Loading Precomputed Data</p>
              <p className="text-xs mt-1 font-sans">{demoError}</p>
            </div>
          )}

          {/* ── Results View: Rendered for both Demo and Upload Success ── */}
          {displayData && activeAoi && (activeTab === 'demo' ? !demoLoading && !demoError : !uploadLoading) && (
            <>
              {/* ── Visible Honesty Note (Steps 2b & 3b) ── */}
              {activeTab === 'demo' && (currentCaseStudy?.honestyNote || displayData.honestyNote) && (
                <div className="col-span-12 border border-hairline bg-surface-2 p-3 text-xs text-ink flex items-start gap-2.5 rounded-[2px]">
                  <span className="text-teal font-semibold font-data uppercase tracking-wider shrink-0 mt-0.5">Note:</span>
                  <span className="font-sans leading-relaxed">
                    {currentCaseStudy?.honestyNote || displayData.honestyNote}
                  </span>
                </div>
              )}

              {/* ── Row 1: Left = SAR Imagery Comparison (7 cols), Right = Geospatial Classification (5 cols) ── */}
              <div className="col-span-12 lg:col-span-7 flex">
                <BeforeAfterViewer
                  beforeImage={displayData.beforeImage}
                  afterImage={displayData.afterImage}
                  changeMapImage={displayData.changeMapImage}
                  dateBefore={displayData.dateBefore}
                  dateAfter={displayData.dateAfter}
                  beforeRange={displayData.beforeRange || currentCaseStudy?.beforeRange}
                  afterRange={displayData.afterRange || currentCaseStudy?.afterRange}
                />
              </div>

              <div className="col-span-12 lg:col-span-5 flex">
                {mode === 'deforestation' ? (
                  <ChangeMap data={displayData} aoi={activeAoi} />
                ) : (
                  <ShorelineShiftCard data={displayData} mode={mode} />
                )}
              </div>

              {/* ── Case Study Card (under the viewer for the selected demo) ── */}
              {activeTab === 'demo' && currentCaseStudy && (
                <div className="col-span-12">
                  <CaseStudyCard
                    caseStudy={currentCaseStudy}
                    dateBefore={displayData.dateBefore}
                    dateAfter={displayData.dateAfter}
                    beforeRange={displayData.beforeRange || currentCaseStudy?.beforeRange}
                    afterRange={displayData.afterRange || currentCaseStudy?.afterRange}
                    sensitivity={displayData.sensitivity || currentCaseStudy?.sensitivity}
                  />
                </div>
              )}

              {/* ── Row 2: Left = Category Breakdown (7 cols), Right = Radar Interpretation (5 cols) ── */}
              <div className="col-span-12 lg:col-span-7 flex">
                <DataPanel
                  title="Category Breakdown"
                  rightSlot={
                    <span className="font-data text-xs text-text-secondary">Area (km²)</span>
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
                    <div className="pt-3 border-t border-hairline flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      {displayData.categories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-1.5 font-data text-text-secondary">
                          <span
                            className="w-2.5 h-2.5 rounded-sm border border-hairline shrink-0"
                            style={{
                              backgroundColor:
                                cat.kind === 'loss' || cat.id.includes('loss') || cat.id.includes('erosion') || cat.id.includes('flooded')
                                  ? 'var(--color-rust)'
                                  : cat.kind === 'gain' || cat.id.includes('accretion')
                                  ? 'var(--color-teal)'
                                  : 'var(--color-ink-muted)',
                            }}
                          />
                          <span className="text-ink font-sans">{cat.label}:</span>
                          <span className="font-medium text-teal">{cat.areaKm2.toFixed(2)} km²</span>
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-4">
          <div className="h-8 bg-surface-2 border border-hairline w-64 rounded-[2px]" />
          <div className="h-96 bg-surface-2 border border-hairline w-full rounded-[2px]" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
