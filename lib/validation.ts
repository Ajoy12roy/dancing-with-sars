// ========================================================================
// Independent Validation Registry — Dancing with the SARs (TerraPulse)
// Loads external comparison data against reference rasters/vectors.
// ========================================================================

export interface ValidationMetrics {
  precision: number;
  recall: number;
  iou: number;
  f1: number;
  ourAreaKm2: number;
  referenceAreaKm2: number;
  overlapKm2: number;
  validPixelFraction: number;
}

export interface ValidationData {
  caseId: string;
  referenceName: string;
  referenceSource: string;
  referenceDate: string;
  referenceResolutionMeters: number;
  metrics: ValidationMetrics;
  notes?: string[];
}

/**
 * Safely load validation file for a case study from data/validation/<caseId>.json
 * Returns null if no empirical comparison has been run for this case.
 */
export function getValidationForCase(caseId: string): ValidationData | null {
  if (typeof window === 'undefined') {
    try {
      const req = (0, eval)('require');
      const fs = req('fs');
      const path = req('path');
      const targetPath = path.join(process.cwd(), 'data', 'validation', `${caseId}.json`);
      if (fs.existsSync(targetPath)) {
        return JSON.parse(fs.readFileSync(targetPath, 'utf8')) as ValidationData;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Returns plain-English agreement summary based on IoU threshold:
 * - >= 0.6: High agreement
 * - 0.3 to 0.6: Moderate agreement
 * - < 0.3: Low agreement
 */
export function getAgreementSummary(iou: number, refName: string): string {
  const pct = Math.round(iou * 100);
  if (iou >= 0.6) {
    return `High agreement with ${refName} (IoU ${pct}%)`;
  }
  if (iou >= 0.3) {
    return `Moderate agreement with ${refName} (IoU ${pct}%)`;
  }
  return `Low agreement with ${refName} (IoU ${pct}%) - see notes`;
}
