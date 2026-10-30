// ========================================================================
// Case Study Registry — Dancing with the SARs
// Central data-driven registry for all SAR analysis case studies.
// ========================================================================

import type { AreaOfInterest, BoundingBox, DateRange, SensitivityData, ValidationData } from '@/types';
import { getSensitivityForCase } from '@/lib/sensitivity';
import { getValidationForCase } from '@/lib/validation';
import seedData from '@/data/case-studies/seed.json';
import sylhetResult from '@/data/precomputed/sylhet/result.json';
import jamunaResult from '@/data/precomputed/jamuna/result.json';
import amazonResult from '@/data/precomputed/amazon/result.json';
import tanguarResult from '@/data/precomputed/tanguar/result.json';

export type CaseStudyModule = 'flood' | 'river-erosion' | 'deforestation' | 'surface-water';
export type CaseStudyStatus = 'ready' | 'pending-data';

export interface CaseStudyAoi {
  centerLonLat?: [number, number] | number[] | null;
  halfSizeKm?: number;
  note?: string;
  verifyInGEE?: boolean;
}

export interface SourceLink {
  name: string;
  url: string;
}

export interface CaseStudyDates {
  before?: string | [string, string] | string[];
  after?: string | [string, string] | string[];
  a?: string;
  b?: string;
}

export interface CaseStudyDataSource {
  name: string;
  url: string;
}

export interface CaseStudy {
  id: string;
  module: CaseStudyModule;
  title: string;
  location?: string;
  country: string;
  eventPeriod?: string;
  summary: string;
  causesAndImpacts?: string;
  suggestedDates?: CaseStudyDates;
  aoi?: CaseStudyAoi;
  datasets?: string[];
  sourceLinks?: SourceLink[];
  validateAgainst?: string | string[];
  limitations?: string | string[];
  attribution?: string;
  dataSources?: string | CaseStudyDataSource[] | Array<{ name: string; url: string }>;
  precomputedId: string;
  status: CaseStudyStatus;

  // Visual/Metadata fields matching existing demo presentation
  name?: string;
  modeLabel?: string;
  description?: string;
  dateA?: string;
  dateB?: string;
  interval?: string;
  boundsLabel?: string;
  monitoredArea?: string;
  primaryResult?: string;

  // Day 2 honesty fields
  beforeRange?: DateRange;
  afterRange?: DateRange;
  honestyNote?: string;

  // Day 3 sensitivity analysis
  sensitivity?: SensitivityData;

  // Day 4 independent validation
  validation?: ValidationData;
}

interface RawBounds {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
}

function getCenterFromBounds(bounds?: RawBounds, fallback: [number, number] = [0, 0]): [number, number] {
  if (
    bounds &&
    typeof bounds.north === 'number' &&
    typeof bounds.south === 'number' &&
    typeof bounds.east === 'number' &&
    typeof bounds.west === 'number'
  ) {
    return [
      Number(((bounds.north + bounds.south) / 2).toFixed(5)),
      Number(((bounds.east + bounds.west) / 2).toFixed(5)),
    ];
  }
  return fallback;
}

const BUNDLED_READY_PRECOMPUTED_IDS = new Set([
  'sylhet',
  'jamuna',
  'amazon',
  'tanguar',
  'cox-bazar-kutupalong-2017',
  'feni-2024',
  'hakaluki-haor',
  'padma-naria',
  'rio-grande-do-sul-2024',
  'sindh-pakistan-2022',
]);

interface PrecomputedResultData {
  aoiId?: string;
  name?: string;
  dateBefore?: string;
  dateAfter?: string;
  dates?: {
    a?: string;
    b?: string;
    days?: number;
  };
  totalAreaKm2?: number;
  affectedAreaKm2?: number;
  percentChanged?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Safely load precomputed result.json for an entry if available on disk.
 */
function loadPrecomputedResult(precomputedId: string): PrecomputedResultData | null {
  if (typeof window === 'undefined') {
    try {
      const req = (0, eval)('require');
      const fs = req('fs');
      const path = req('path');
      const targetPath = path.join(process.cwd(), 'data', 'precomputed', precomputedId, 'result.json');
      if (fs.existsSync(targetPath)) {
        return JSON.parse(fs.readFileSync(targetPath, 'utf8')) as PrecomputedResultData;
      }
    } catch {
      // Fall through to null if read fails
    }
  }
  return null;
}

/**
 * Determine case study readiness.
 * An entry is "ready" only if data/precomputed/<precomputedId>/result.json exists on disk;
 * otherwise it is "pending-data" and must NOT appear in the UI or in any allowlist.
 */
function isPrecomputedReady(precomputedId: string): boolean {
  if (typeof window === 'undefined') {
    try {
      // Dynamic require avoids bundlers bundling 'fs' and 'path' into client packages
      const req = (0, eval)('require');
      const fs = req('fs');
      const path = req('path');
      const targetPath = path.join(process.cwd(), 'data', 'precomputed', precomputedId, 'result.json');
      return fs.existsSync(targetPath);
    } catch {
      // Fall through to bundled set if require fails or in edge runtime
    }
  }
  return BUNDLED_READY_PRECOMPUTED_IDS.has(precomputedId);
}

// ── 4 Existing Demos Registered with Current IDs, Paths, and Text ───────
const EXISTING_DEMO_ENTRIES: CaseStudy[] = [
  {
    id: 'sylhet',
    module: 'flood',
    title: 'Sylhet Flood 2022',
    name: 'Sylhet Flood 2022',
    modeLabel: 'Flood Inundation',
    location: 'Sylhet Division, Surma River Basin',
    country: 'Bangladesh',
    eventPeriod: '2022-05-10 to 2022-06-20',
    summary: 'Devastating monsoon floods in the Sylhet division, Bangladesh — widespread inundation of low-lying wetlands.',
    description: 'Pre-monsoon wetland baseline to peak monsoon inundation across the Surma river basin in northeastern Bangladesh.',
    causesAndImpacts: undefined,
    suggestedDates: {
      before: '2022-05-10',
      after: '2022-06-20',
      a: '2022-05-01',
      b: '2022-06-21',
    },
    aoi: {
      centerLonLat: [91.87502, 24.91504],
      halfSizeKm: 15,
      note: 'Surma River Basin',
    },
    datasets: ['Copernicus Sentinel-1 C-Band SAR (GRD)'],
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
    validateAgainst: 'Copernicus Emergency Management Service delineation products',
    limitations: 'Specular reflection on saturated ground can mimic open water.',
    attribution: 'Contains modified Copernicus Sentinel data (2022), processed with Google Earth Engine.',
    dataSources: 'Copernicus Sentinel-1 C-Band SAR (GRD)',
    precomputedId: 'sylhet',
    status: isPrecomputedReady('sylhet') ? 'ready' : 'pending-data',
    dateA: '2022-05-01',
    dateB: '2022-06-21',
    interval: '51 days',
    boundsLabel: '24.8499°N – 24.9802°N, 91.7999°E – 91.9501°E',
    monitoredArea: '218.10 km²',
    primaryResult: 'Flooded Area: 37.19 km²',
    beforeRange: { start: '2022-05-01', end: '2022-05-10' },
    afterRange: { start: '2022-06-20', end: '2022-06-21' },
  },
  {
    id: 'jamuna',
    module: 'river-erosion',
    title: 'Jamuna River Erosion 2019 to 2024',
    name: 'Jamuna River Erosion 2019 to 2024',
    modeLabel: 'River Bank Erosion',
    location: 'Jamuna River Corridor',
    country: 'Bangladesh',
    eventPeriod: '2019-02-15 to 2024-02-15',
    summary: 'Multi-year braided river channel migration, severe riverbank erosion, and sandbar accretion along the Jamuna River, Bangladesh.',
    description: 'Five-year braided channel migration along the Brahmaputra-Jamuna river corridor, compared at identical low-water dry season epochs.',
    causesAndImpacts: undefined,
    suggestedDates: {
      before: '2019-02-15',
      after: '2024-02-15',
      a: '2019-02-15',
      b: '2024-02-15',
    },
    aoi: {
      centerLonLat: [89.79991, 24.42497],
      halfSizeKm: 25,
      note: 'Jamuna River Braided Channel Corridor',
    },
    datasets: ['Copernicus Sentinel-1 C-Band SAR (GRD)'],
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
    validateAgainst: 'CEGIS river morphological monitoring datasets',
    limitations: 'Dry-season low-flow comparison required to control water level variations.',
    attribution: 'Contains modified Copernicus Sentinel data (2019–2024), processed with Google Earth Engine.',
    dataSources: 'Copernicus Sentinel-1 C-Band SAR (GRD)',
    precomputedId: 'jamuna',
    status: isPrecomputedReady('jamuna') ? 'ready' : 'pending-data',
    dateA: '2019-02-15',
    dateB: '2024-02-15',
    interval: '1,826 days (5.0 years)',
    boundsLabel: '24.2998°N – 24.5501°N, 89.6498°E – 89.9500°E',
    monitoredArea: '842.38 km²',
    primaryResult: 'Erosion: 47.59 km² (9.52 km²/yr), Accretion: 42.38 km²',
    beforeRange: { start: '2019-02-01', end: '2019-02-28' },
    afterRange: { start: '2024-02-01', end: '2024-02-28' },
  },
  {
    id: 'amazon',
    module: 'deforestation',
    title: 'Amazon Deforestation',
    name: 'Amazon Deforestation',
    modeLabel: 'Forest Canopy Loss',
    location: 'Rondônia, Brazilian Amazon',
    country: 'Brazil',
    eventPeriod: '2021-01-01 to 2023-01-01',
    summary: 'Tracking tropical rainforest canopy loss, logging, and agricultural clear-cutting in Rondônia, Brazilian Amazon using SAR backscatter analysis.',
    description: 'Two-year multi-temporal canopy backscatter loss detection in the Rondônia region of the southern Amazon basin.',
    causesAndImpacts: undefined,
    suggestedDates: {
      before: '2021-01-01',
      after: '2023-01-01',
      a: '2021-01-01',
      b: '2023-01-01',
    },
    aoi: {
      centerLonLat: [-62.10000, -10.24996],
      halfSizeKm: 20,
      note: 'Rondônia Forest Clearing Frontier',
    },
    datasets: ['Copernicus Sentinel-1 C-Band SAR (GRD)'],
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
    validateAgainst: 'INPE PRODES annual deforestation monitoring',
    limitations: 'Soil moisture spikes during tropical rain can modulate surface backscatter.',
    attribution: 'Contains modified Copernicus Sentinel data (2021–2023), processed with Google Earth Engine.',
    dataSources: 'Copernicus Sentinel-1 C-Band SAR (GRD)',
    precomputedId: 'amazon',
    status: isPrecomputedReady('amazon') ? 'ready' : 'pending-data',
    dateA: '2021-01-01',
    dateB: '2023-01-01',
    interval: '730 days (2.0 years)',
    boundsLabel: '10.3500°S – 10.1499°S, 62.2001°W – 61.9999°W',
    monitoredArea: '485.21 km²',
    primaryResult: 'Forest Canopy Loss: 0.62 km²',
    beforeRange: { start: '2021-01-01', end: '2021-01-15' },
    afterRange: { start: '2023-01-01', end: '2023-01-15' },
  },
  {
    id: 'tanguar',
    module: 'surface-water',
    title: 'Tanguar Haor region (study-area box, 418.40 km²)',
    name: 'Tanguar Haor region (study-area box, 418.40 km²)',
    modeLabel: 'Surface Water Dynamics',
    location: 'Sunamganj, Sylhet Basin (study-area box, 418.40 km²)',
    country: 'Bangladesh',
    eventPeriod: '2023-02-15 to 2023-08-15',
    summary: 'Seasonal surface water expansion and contraction in the Tanguar Haor region, monitored across a 418.40 km² study-area box in Sunamganj, Bangladesh.',
    description: 'Cyclic pre-monsoon dry season baseline to peak monsoon wetland expansion across a 418.40 km² study-area box in northeastern Bangladesh.',
    causesAndImpacts: undefined,
    suggestedDates: {
      before: '2023-02-15',
      after: '2023-08-15',
      a: '2023-02-15',
      b: '2023-08-15',
    },
    aoi: {
      centerLonLat: [91.08998, 25.13495],
      halfSizeKm: 20,
      note: 'Tanguar Haor 418.40 km² Study-Area Box',
    },
    datasets: ['Copernicus Sentinel-1 C-Band SAR (GRD)'],
    sourceLinks: [
      {
        name: 'Copernicus Data Space Ecosystem',
        url: 'https://dataspace.copernicus.eu/',
      },
    ],
    validateAgainst: 'Ramsar Sites Information Service (RSIS)',
    limitations: 'Aquatic vegetation and emergent reeds may attenuate water specular backscatter. Figures cover the whole study-area box, not only the haor wetland boundary.',
    attribution: 'Contains modified Copernicus Sentinel data (2023), processed with Google Earth Engine.',
    dataSources: 'Copernicus Sentinel-1 C-Band SAR (GRD)',
    precomputedId: 'tanguar',
    status: isPrecomputedReady('tanguar') ? 'ready' : 'pending-data',
    dateA: '2023-02-15',
    dateB: '2023-08-15',
    interval: '181 days',
    boundsLabel: '25.0498°N – 25.2201°N, 90.9798°E – 91.2002°E',
    monitoredArea: '418.40 km²',
    primaryResult: 'Initial: 35.99 km² → Final: 298.31 km² (+262.32 km²)',
    beforeRange: { start: '2023-02-01', end: '2023-02-28' },
    afterRange: { start: '2023-08-01', end: '2023-08-31' },
    honestyNote: 'Figures cover the whole study-area box, not only the haor wetland boundary.',
  },
];

// ── Merge Seed Entries with Dynamically Computed Status ─────────────────
interface SeedJsonFormat {
  _comment?: string;
  caseStudies?: Array<Record<string, unknown>>;
}

const rawSeedList: Array<Record<string, unknown>> = Array.isArray(seedData)
  ? (seedData as unknown as Array<Record<string, unknown>>)
  : ((seedData as unknown as SeedJsonFormat)?.caseStudies || []);

const SEED_ENTRIES: CaseStudy[] = rawSeedList.map((raw) => {
  const precomputedId = String(raw.precomputedId || raw.id || '');
  const ready = isPrecomputedReady(precomputedId);
  const res = ready ? loadPrecomputedResult(precomputedId) : null;

  let title = String(raw.title || '');
  let name = String(raw.name || raw.title || '');
  let modeLabel: string | undefined = typeof raw.modeLabel === 'string' ? raw.modeLabel : undefined;
  let honestyNote: string | undefined = typeof raw.honestyNote === 'string' ? raw.honestyNote : undefined;

  let dateA: string | undefined = typeof raw.dateA === 'string' ? raw.dateA : undefined;
  let dateB: string | undefined = typeof raw.dateB === 'string' ? raw.dateB : undefined;
  let interval: string | undefined = typeof raw.interval === 'string' ? raw.interval : undefined;
  let monitoredArea: string | undefined = typeof raw.monitoredArea === 'string' ? raw.monitoredArea : undefined;
  let boundsLabel: string | undefined = typeof raw.boundsLabel === 'string' ? raw.boundsLabel : undefined;
  let primaryResult: string | undefined = typeof raw.primaryResult === 'string' ? raw.primaryResult : undefined;

  // Extract real date ranges if recorded
  let beforeRange: DateRange | undefined = undefined;
  const rawDates = raw.suggestedDates as CaseStudyDates | undefined;
  if (Array.isArray(rawDates?.before) && rawDates.before.length >= 2) {
    beforeRange = {
      start: String(rawDates.before[0]),
      end: String(rawDates.before[1]),
    };
  }
  let afterRange: DateRange | undefined = undefined;
  if (Array.isArray(rawDates?.after) && rawDates.after.length >= 2) {
    afterRange = {
      start: String(rawDates.after[0]),
      end: String(rawDates.after[1]),
    };
  }

  // Step 3: Neutral headline and honesty caveat for Padma
  if (precomputedId === 'padma-naria') {
    title = 'Padma River: Net Shoreline & Channel Change (Naria reach)';
    name = 'Padma River: Net Shoreline & Channel Change (Naria reach)';
    modeLabel = 'Net shoreline / river-channel change';
    honestyNote =
      'This figure is net land-to-water change between two composites. It can include water-level differences and sandbar movement, so it is not a direct measure of bank erosion.';
  }

  if (res) {
    if (!dateA) dateA = res.dateBefore || res.dates?.a;
    if (!dateB) dateB = res.dateAfter || res.dates?.b;
    if (!interval && res.dates?.days) {
      const yrs = (res.dates.days / 365.25).toFixed(1);
      interval = `${res.dates.days.toLocaleString()} days (~${yrs} years)`;
    }
    if (!monitoredArea && typeof res.totalAreaKm2 === 'number') {
      monitoredArea = `${res.totalAreaKm2.toFixed(2)} km²`;
    }
    if (!boundsLabel && res.bounds) {
      boundsLabel = `${res.bounds.south?.toFixed(4)}°N – ${res.bounds.north?.toFixed(4)}°N, ${res.bounds.west?.toFixed(4)}°E – ${res.bounds.east?.toFixed(4)}°E`;
    }
    if (!primaryResult && typeof res.affectedAreaKm2 === 'number') {
      const pct = typeof res.percentChanged === 'number' ? ` (${res.percentChanged.toFixed(2)}%)` : '';
      if (precomputedId === 'padma-naria') {
        primaryResult = `Net Land-to-Water Change: ${res.affectedAreaKm2.toFixed(2)} km²${pct}`;
      } else {
        primaryResult = `Affected Area: ${res.affectedAreaKm2.toFixed(2)} km²${pct}`;
      }
    }
  }

  return {
    ...raw,
    id: String(raw.id || ''),
    module: raw.module as CaseStudyModule,
    title,
    name,
    modeLabel,
    country: String(raw.country || ''),
    summary: String(raw.summary || ''),
    precomputedId,
    // Computed status: ready ONLY if precomputed result.json physically exists on disk
    status: ready ? 'ready' : 'pending-data',
    dateA,
    dateB,
    interval,
    monitoredArea,
    boundsLabel,
    primaryResult,
    beforeRange,
    afterRange,
    honestyNote,
  } as CaseStudy;
});

const ALL_CASE_STUDIES: CaseStudy[] = [...EXISTING_DEMO_ENTRIES, ...SEED_ENTRIES];

// ── Exported Registry Helpers ───────────────────────────────────────────

/**
 * Return all registered case studies (both ready and pending-data).
 */
export function getAllCaseStudies(): CaseStudy[] {
  return ALL_CASE_STUDIES.map((cs) => ({
    ...cs,
    status: isPrecomputedReady(cs.precomputedId) ? 'ready' : 'pending-data',
    sensitivity: cs.sensitivity || getSensitivityForCase(cs.precomputedId || cs.id) || undefined,
    validation: cs.validation || getValidationForCase(cs.precomputedId || cs.id) || undefined,
  }));
}

/**
 * Return only "ready" case studies whose precomputed outputs exist on disk.
 * Pending entries are completely hidden from UI and allowlists.
 */
export function getReadyCaseStudies(module?: CaseStudyModule): CaseStudy[] {
  return getAllCaseStudies().filter((cs) => {
    if (cs.status !== 'ready') return false;
    if (module && cs.module !== module) return false;
    return true;
  });
}

/**
 * Find a case study by ID (any status).
 */
export function getCaseStudyById(id: string): CaseStudy | undefined {
  const cleanId = (id || '').trim().toLowerCase();
  return getAllCaseStudies().find((cs) => cs.id.toLowerCase() === cleanId);
}

/**
 * Check if an AOI ID belongs to a known, READY case study.
 * Used for strict API allowlist validation (returns false for unknown or pending IDs).
 */
export function isKnownCaseId(id: string): boolean {
  if (!id) return false;
  const cleanId = id.trim().toLowerCase();
  const found = getCaseStudyById(cleanId);
  return Boolean(found && found.status === 'ready');
}

/**
 * Map a CaseStudy to the legacy AreaOfInterest structure used by /explore and visualizers.
 */
export function toAreaOfInterest(cs: CaseStudy): AreaOfInterest {
  let bounds: BoundingBox = { north: 0, south: 0, east: 0, west: 0 };
  let center: [number, number] = [0, 0];
  let zoom = 10;
  let dateBefore = 'Before Scene';
  if (Array.isArray(cs.suggestedDates?.before)) {
    dateBefore = cs.suggestedDates.before[0] || 'Before Scene';
  } else if (typeof cs.suggestedDates?.before === 'string') {
    dateBefore = cs.suggestedDates.before;
  } else if (cs.suggestedDates?.a) {
    dateBefore = cs.suggestedDates.a;
  } else if (cs.dateA) {
    dateBefore = cs.dateA;
  }

  let dateAfter = 'After Scene';
  if (Array.isArray(cs.suggestedDates?.after)) {
    dateAfter = cs.suggestedDates.after[0] || 'After Scene';
  } else if (typeof cs.suggestedDates?.after === 'string') {
    dateAfter = cs.suggestedDates.after;
  } else if (cs.suggestedDates?.b) {
    dateAfter = cs.suggestedDates.b;
  } else if (cs.dateB) {
    dateAfter = cs.dateB;
  }

  if (cs.id === 'sylhet') {
    bounds = {
      north: sylhetResult.bounds?.north ?? 24.98017,
      south: sylhetResult.bounds?.south ?? 24.84992,
      east: sylhetResult.bounds?.east ?? 91.95012,
      west: sylhetResult.bounds?.west ?? 91.79992,
    };
    center = getCenterFromBounds(sylhetResult.bounds, [24.91504, 91.87502]);
    zoom = 11;
    dateBefore = sylhetResult.dateBefore || '2022-05-10';
    dateAfter = sylhetResult.dateAfter || '2022-06-20';
  } else if (cs.id === 'jamuna') {
    bounds = {
      north: jamunaResult.bounds?.north ?? 24.55015,
      south: jamunaResult.bounds?.south ?? 24.29979,
      east: jamunaResult.bounds?.east ?? 89.95002,
      west: jamunaResult.bounds?.west ?? 89.64980,
    };
    center = getCenterFromBounds(jamunaResult.bounds, [24.42497, 89.79991]);
    zoom = 10;
    dateBefore = jamunaResult.dates?.a || '2019-02-15';
    dateAfter = jamunaResult.dates?.b || '2024-02-15';
  } else if (cs.id === 'amazon') {
    bounds = {
      north: amazonResult.bounds?.north ?? -10.14988,
      south: amazonResult.bounds?.south ?? -10.35003,
      east: amazonResult.bounds?.east ?? -61.99992,
      west: amazonResult.bounds?.west ?? -62.20007,
    };
    center = getCenterFromBounds(amazonResult.bounds, [-10.24996, -62.10000]);
    zoom = 10;
    dateBefore = amazonResult.dateBefore || '2021-01-01';
    dateAfter = amazonResult.dateAfter || '2023-01-01';
  } else if (cs.id === 'tanguar') {
    bounds = {
      north: tanguarResult.bounds?.north ?? 25.22011,
      south: tanguarResult.bounds?.south ?? 25.04979,
      east: tanguarResult.bounds?.east ?? 91.20020,
      west: tanguarResult.bounds?.west ?? 90.97976,
    };
    center = getCenterFromBounds(tanguarResult.bounds, [25.13495, 91.08998]);
    zoom = 11;
    dateBefore = tanguarResult.dates?.a || '2023-02-15';
    dateAfter = tanguarResult.dates?.b || '2023-08-15';
  } else {
    const res = loadPrecomputedResult(cs.precomputedId || cs.id);
    if (res?.bounds) {
      bounds = {
        north: res.bounds.north,
        south: res.bounds.south,
        east: res.bounds.east,
        west: res.bounds.west,
      };
      center = getCenterFromBounds(res.bounds, [
        (res.bounds.north + res.bounds.south) / 2,
        (res.bounds.east + res.bounds.west) / 2,
      ]);
      if (res.dates?.a) dateBefore = res.dates.a;
      if (res.dates?.b) dateAfter = res.dates.b;
    } else if (Array.isArray(cs.aoi?.centerLonLat) && cs.aoi.centerLonLat.length >= 2) {
      const lon = cs.aoi.centerLonLat[0];
      const lat = cs.aoi.centerLonLat[1];
      if (typeof lon === 'number' && typeof lat === 'number') {
        const halfDeg = (cs.aoi.halfSizeKm || 20) / 111.0;
        bounds = {
          north: lat + halfDeg,
          south: lat - halfDeg,
          east: lon + halfDeg,
          west: lon - halfDeg,
        };
        center = [lat, lon];
      }
    }
  }

  const modeLabels: Record<CaseStudyModule, string> = {
    flood: 'Flood Inundation',
    'river-erosion': 'River Bank Erosion',
    deforestation: 'Forest Canopy Loss',
    'surface-water': 'Surface Water Dynamics',
  };

  const metricKeys: Record<CaseStudyModule, string> = {
    flood: 'floodedAreaKm2',
    'river-erosion': 'erosionAreaKm2',
    deforestation: 'forestLossKm2',
    'surface-water': 'waterDeltaKm2',
  };

  const activeModeLabel = cs.modeLabel || modeLabels[cs.module] || cs.module;

  return {
    id: cs.id,
    mode: cs.module,
    name: cs.title,
    description: cs.summary,
    country: cs.country,
    modeLabel: activeModeLabel,
    displayMetadata: {
      mode: cs.module,
      modeLabel: activeModeLabel,
      badge: activeModeLabel,
      primaryMetricKey: metricKeys[cs.module] || 'affectedAreaKm2',
      hazardLabel: activeModeLabel,
    },
    bounds,
    center,
    zoom,
    beforeRange: cs.beforeRange,
    afterRange: cs.afterRange,
    honestyNote: cs.honestyNote,
    sensitivity: cs.sensitivity || getSensitivityForCase(cs.precomputedId || cs.id) || undefined,
    validation: cs.validation || getValidationForCase(cs.precomputedId || cs.id) || undefined,
    sceneBefore: {
      id: `S1-${cs.id}-pre`,
      aoiId: cs.id,
      date: dateBefore,
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: `/api/images?aoi=${cs.id}&type=before`,
      bounds,
    },
    sceneAfter: {
      id: `S1-${cs.id}-post`,
      aoiId: cs.id,
      date: dateAfter,
      satellite: 'Sentinel-1',
      polarization: 'VV',
      previewUrl: `/api/images?aoi=${cs.id}&type=after`,
      bounds,
    },
  };
}

/**
 * Return AreaOfInterest[] representation for all currently READY case studies.
 * Preserves the exact properties and structure of DEMO_AOIS.
 */
export function getReadyDemoAois(): AreaOfInterest[] {
  return getReadyCaseStudies().map(toAreaOfInterest);
}
