import fs from 'fs';
import path from 'path';

export interface ExposureThresholdRow {
  thresholdDb: number;
  pipelineAreaKm2: number;
  estimatedPeopleInExtent: number;
  populationSharePct: number;
}

export interface ExposurePopulationSource {
  name: string;
  year: number;
  licenceName: string;
  citation: string;
  url: string;
  resolution: string;
  units: string;
}

export interface ExposureMaskSource {
  case: string;
  dateBefore: string;
  dateAfter: string;
  polarization: string;
  thresholds: number[];
  centreThresholdDb: number;
}

export interface ExposureMinDefaultMax {
  min: ExposureThresholdRow;
  default: ExposureThresholdRow;
  max: ExposureThresholdRow;
}

export interface UpazilaExposureRow {
  name: string;
  areaKm2InsideAoi: number;
  populationInsideAoi: number;
  exposedMin: number;
  exposedDefault: number;
  exposedMax: number;
}

export interface SylhetExposureData {
  schemaVersion: string;
  caseId: string;
  quantity: string;
  method: string;
  populationSource: ExposurePopulationSource;
  maskSource: ExposureMaskSource;
  perThresholdRows: ExposureThresholdRow[];
  minDefaultMax: ExposureMinDefaultMax;
  aoiTotalPopulation: number;
  aoiTotalAreaKm2: number;
  perUpazila: UpazilaExposureRow[] | null;
  perUpazilaNote: string;
  limitations: string[];
  status: string;
  notFor: string[];
  computedBy: string;
  gitCommit: string;
}

let cachedData: SylhetExposureData | null = null;

export function getSylhetExposureData(): SylhetExposureData {
  if (cachedData) {
    return cachedData;
  }
  const filePath = path.join(process.cwd(), 'data', 'exposure', 'sylhet.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Exposure data file not found at ${filePath}`);
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as SylhetExposureData;
    if (!parsed || !parsed.caseId || !parsed.perThresholdRows) {
      throw new Error(`Malformed exposure data file at ${filePath}`);
    }
    cachedData = parsed;
    return cachedData;
  } catch (err) {
    throw new Error(
      `Failed to read/parse exposure data file: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
