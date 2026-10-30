import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateFallbackInsight, InsightPayload } from '@/lib/ai-insight-fallback';
import { getCaseStudyById, isKnownCaseId } from '@/lib/case-studies';
import {
  getSensitivityForCase,
  getSensitivityDelta,
  getSensitivityParameterLabel,
  getSensitivityClass,
} from '@/lib/sensitivity';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CACHE_VERSION = 'v2_reliability';

// Known valid Modes
const KNOWN_MODES = new Set(['flood', 'river-erosion', 'erosion', 'deforestation', 'surface-water', 'water']);

// Allowed numeric metrics keys from result.json
const ALLOWED_METRIC_KEYS = new Set([
  'percentChanged',
  'affectedAreaKm2',
  'confidence',
  'signalStrength',
  'totalAreaKm2',
  'floodedAreaKm2',
  'persistentWaterKm2',
  'recededWaterKm2',
  'erosionAreaKm2',
  'accretionAreaKm2',
  'netLandChangeKm2',
  'erosionRateKm2PerYear',
  'riverAreaKm2',
  'otherNewWaterAreaKm2',
  'otherLostWaterAreaKm2',
  'forestLossKm2',
  'lossThresholdDb',
  'waterAreaAKm2',
  'waterAreaBKm2',
  'waterDeltaKm2',
  'waterDeltaPercent',
  'newWaterKm2',
  'lostWaterKm2',
  'changedAreaKm2',
]);

// Server-side cache: 24h TTL
interface CacheRecord {
  explanation: string;
  fallback: boolean;
  timestamp: number;
}
const insightCache = new Map<string, CacheRecord>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Per-IP rate limiting: 10 requests per 10 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 10;
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const history = (ipRequestHistory.get(ip) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (history.length >= RATE_LIMIT_MAX) {
    ipRequestHistory.set(ip, history);
    return false; // Exceeded
  }
  history.push(now);
  ipRequestHistory.set(ip, history);
  return true; // Allowed
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstPart = forwarded.split(',')[0];
    if (firstPart) return firstPart.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

function normalizeMode(mode: string): string {
  if (mode === 'erosion') return 'river-erosion';
  if (mode === 'water') return 'surface-water';
  return mode;
}

// Build structured prompt per mode strictly using real computed numbers
function buildPrompt(payload: InsightPayload): string {
  const mode = payload.mode || 'flood';
  const aoiName = payload.aoiName || payload.aoiId || 'the area of interest';
  const dates = payload.dates;
  const metrics = payload.metrics || {};
  const categories = payload.categories || [];
  const warnings = payload.warnings || [];

  const dateA = dates?.a || 'baseline scene';
  const dateB = dates?.b || 'subsequent scene';
  const daysStr = dates?.days != null ? ` (${dates.days} days apart)` : '';

  let modeFacts = '';

  switch (mode) {
    case 'river-erosion': {
      const erosion = ((metrics.erosionAreaKm2 as number) ?? payload.affectedAreaKm2 ?? 0).toFixed(2);
      const accretion = ((metrics.accretionAreaKm2 as number) ?? 0).toFixed(2);
      const net = ((metrics.netLandChangeKm2 as number) ?? (Number(accretion) - Number(erosion))).toFixed(2);
      const rate =
        metrics.erosionRateKm2PerYear != null
          ? `${Number(metrics.erosionRateKm2PerYear).toFixed(2)} km²/year`
          : 'not calculated (multi-date interval required)';
      const river = metrics.riverAreaKm2 != null ? `${Number(metrics.riverAreaKm2).toFixed(2)} km²` : 'not reported';

      const isPadma = payload.aoiId === 'padma-naria';
      const modeTitle = isPadma ? 'Net Shoreline & River-Channel Change' : 'River Bank Erosion & Accretion';
      const changeDesc = isPadma ? 'Net Land-to-Water Transition Area' : 'Bank Erosion Area';

      modeFacts = `
- Analysis Mode: ${modeTitle}
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- ${changeDesc}: ${erosion} km² (land converted to river water)
- Bank Accretion Area: ${accretion} km² (river water converted to sediment/sandbars)
- Net Land Change: ${net} km²
- Annualized Change Rate: ${rate}
- Persistent River Channel Area: ${river}`;
      if (isPadma) {
        modeFacts += `\n- Caveat: This figure is net land-to-water change between two composites. It includes water-level differences and sandbar movement, so it is not a direct measure of bank erosion.`;
      }
      break;
    }

    case 'flood': {
      const flooded = (payload.affectedAreaKm2 ?? 0).toFixed(2);
      const pct = (payload.percentChanged ?? 0).toFixed(2);
      const rawSignal = payload.confidence ?? payload.signalStrength;
      const signal = rawSignal != null ? `${rawSignal.toFixed(1)}%` : 'not available';

      modeFacts = `
- Analysis Mode: Flood Inundation
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Flooded Ground Area: ${flooded} km²
- Percentage of Footprint Inundated: ${pct}%
- Radar Backscatter Signal Strength: ${signal}`;
      break;
    }

    case 'deforestation': {
      const loss = ((metrics.forestLossKm2 as number) ?? payload.affectedAreaKm2 ?? 0).toFixed(2);
      const pct = (payload.percentChanged ?? 0).toFixed(2);
      const rawSignal = payload.confidence ?? payload.signalStrength;
      const signal = rawSignal != null ? `${rawSignal.toFixed(1)}%` : 'not available';

      modeFacts = `
- Analysis Mode: Forest Canopy Loss / Disturbance
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Forest Canopy Loss Area: ${loss} km²
- Percentage of Surveyed Area Affected: ${pct}%
- Radar Backscatter Signal Strength: ${signal}`;
      break;
    }

    case 'surface-water': {
      const waterA = ((metrics.waterAreaAKm2 as number) ?? 0).toFixed(2);
      const waterB = ((metrics.waterAreaBKm2 as number) ?? 0).toFixed(2);
      const delta = ((metrics.waterDeltaKm2 as number) ?? payload.affectedAreaKm2 ?? 0).toFixed(2);
      const deltaPct = ((metrics.waterDeltaPercent as number) ?? payload.percentChanged ?? 0).toFixed(1);

      modeFacts = `
- Analysis Mode: Surface Water Dynamics
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Initial Water Area (Scene A): ${waterA} km²
- Final Water Area (Scene B): ${waterB} km²
- Net Water Extent Change: ${delta} km²
- Relative Water Extent Variation: ${deltaPct}%`;
      if (payload.aoiId === 'tanguar') {
        modeFacts += `\n- Study Area: Figures cover the whole 418.40 km² study-area box, not only the haor wetland boundary.`;
      }
      break;
    }

    default: {
      const rawSignal = payload.confidence ?? payload.signalStrength;
      const signal = rawSignal != null ? `${rawSignal.toFixed(1)}%` : 'not available';
      modeFacts = `
- Analysis Mode: SAR Change Detection
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Affected Area: ${(payload.affectedAreaKm2 ?? 0).toFixed(2)} km²
- Percentage of Scene Changed: ${(payload.percentChanged ?? 0).toFixed(2)}%
- Signal Strength: ${signal}`;
      break;
    }
  }

  if (payload.sensitivity) {
    const sens = payload.sensitivity;
    const delta = getSensitivityDelta(sens);
    const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
    const paramLabel = getSensitivityParameterLabel(sens.parameterName);
    modeFacts += `\n- Sensitivity Analysis Range: Headline result ranges from ${sens.minAreaKm2.toFixed(2)} to ${sens.maxAreaKm2.toFixed(2)} km² across ±${deltaStr} ${sens.unit} variation in ${paramLabel}.`;
  }

  const catStr =
    categories.length > 0
      ? `\nCategorized Classes:\n${categories.map((c) => `  - ${c.label}: ${c.areaKm2.toFixed(2)} km² (${c.kind})`).join('\n')}`
      : '';

  const warnStr =
    warnings.length > 0
      ? `\nProcessing Warnings (MUST be explicitly mentioned in the explanation):\n${warnings.map((w) => `  - ${w}`).join('\n')}`
      : '\nProcessing Warnings: None';

  const isHighSensitivity = payload.sensitivity && getSensitivityClass(payload.sensitivity) === 'high';
  const highSensRule = isHighSensitivity
    ? '\n7. HIGH THRESHOLD SENSITIVITY: This observation exhibits high sensitivity to threshold perturbation (>50% variation). You MUST use cautious wording (e.g. "estimated", "indicative", "approximately") and explicitly note that the headline figure is indicative rather than exact.'
    : '';

  return `You are an expert remote sensing analyst explaining Synthetic Aperture Radar (SAR) change detection results for ${aoiName}.

MANDATORY RULES:
1. All numbers provided below are already computed by deterministic code.
2. You must ONLY explain these computed numbers.
3. You MUST NOT invent, estimate, round differently, or add numbers.
4. You MUST NOT name causes (for example climate change, dams, illegal logging, weather systems) that are not in the data.
5. You MUST mention the processing warnings if any are provided below.
6. Provide exactly 3 short sentences in plain English.${highSensRule}

COMPUTED DATA:
${modeFacts.trim()}
${catStr}
${warnStr}

Provide exactly 3 short sentences in plain English:`;
}

// Compute reliability notes on the server from trusted data at response time
function buildReliabilityNotes(cleanAoi: string | null, payload: InsightPayload): string[] {
  const notes: string[] = [];

  if (cleanAoi && isKnownCaseId(cleanAoi)) {
    const cs = getCaseStudyById(cleanAoi);
    const sens = cs?.sensitivity || getSensitivityForCase(cleanAoi);

    if (sens) {
      const cls = getSensitivityClass(sens);
      const delta = getSensitivityDelta(sens);
      const deltaStr = delta % 1 === 0 ? delta.toFixed(0) : delta.toFixed(1);
      const paramLabel = getSensitivityParameterLabel(sens.parameterName);
      const classLabel =
        cls === 'stable'
          ? 'Stable under threshold changes'
          : cls === 'moderate'
          ? 'Moderately threshold-sensitive'
          : 'Highly threshold-sensitive (treat headline number as indicative only)';
      notes.push(
        `Sensitivity analysis (${classLabel}): Result spans ${sens.minAreaKm2.toFixed(2)} to ${sens.maxAreaKm2.toFixed(2)} km² when ${paramLabel} varies by ±${deltaStr} ${sens.unit}.`
      );
    }

    if (cs?.honestyNote) {
      notes.push(cs.honestyNote);
    }

    if (cs?.beforeRange && cs?.afterRange) {
      notes.push(
        `Composite dates: Imagery is a median composite of Sentinel-1 scenes acquired from ${cs.beforeRange.start} to ${cs.beforeRange.end} (Before) and ${cs.afterRange.start} to ${cs.afterRange.end} (After).`
      );
    } else if (payload.dates?.a && payload.dates?.b) {
      notes.push(
        `Composite dates: Reference dates (${payload.dates.a} and ${payload.dates.b}) represent median composites around those dates (full acquisition range not recorded).`
      );
    }

    const rawSignal = payload.confidence ?? payload.signalStrength;
    if (rawSignal == null || isNaN(rawSignal)) {
      notes.push('Signal strength: Not available for this observation.');
    }
  } else {
    // Custom upload
    const rawSignal = payload.confidence ?? payload.signalStrength;
    if (rawSignal == null || isNaN(rawSignal)) {
      notes.push('Signal strength: Not available for this custom upload.');
    }
    if (payload.warnings && payload.warnings.length > 0) {
      for (const w of payload.warnings) {
        notes.push(`Notice: ${w}`);
      }
    }
  }

  return notes;
}

// Call Gemini with strict 12-second timeout
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('TIMEOUT_12S'));
    }, 12000);
  });

  try {
    const res = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    return res.response.text();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  // 1. Body size guard: reject bodies over 4 KB
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 4096) {
    return NextResponse.json({ error: 'Request body exceeds 4 KB' }, { status: 400 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 4096) {
    return NextResponse.json({ error: 'Request body exceeds 4 KB' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const topKeys = Object.keys(body);

  // Check which shape the request is
  const isShapeA = topKeys.length === 2 && topKeys.includes('aoi') && topKeys.includes('mode');
  const isShapeB =
    (topKeys.length === 1 && topKeys[0] === 'metrics') ||
    (topKeys.length === 2 && topKeys.includes('metrics') && topKeys.includes('mode'));

  if (!isShapeA && !isShapeB) {
    return NextResponse.json(
      { error: 'Invalid request shape. Expected {aoi, mode} or {metrics: {...}}.' },
      { status: 400 }
    );
  }

  let payload: InsightPayload;
  let cacheKey: string;

  if (isShapeA) {
    // ── Shape A: Demo Areas { aoi, mode } ──
    const aoiStr = body.aoi;
    const modeStr = body.mode;

    if (typeof aoiStr !== 'string' || !isKnownCaseId(aoiStr)) {
      return NextResponse.json({ error: 'Unknown or invalid AOI' }, { status: 400 });
    }
    if (typeof modeStr !== 'string' || !KNOWN_MODES.has(modeStr)) {
      return NextResponse.json({ error: 'Unknown or invalid mode' }, { status: 400 });
    }

    const normalizedMode = normalizeMode(modeStr);

    // Load metrics server-side from data/precomputed/<aoi>/result.json
    const cleanAoi = aoiStr.replace(/[^a-zA-Z0-9_-]/g, '');
    const dataPath = path.join(process.cwd(), 'data', 'precomputed', cleanAoi, 'result.json');

    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Precomputed data not found for AOI' }, { status: 400 });
    }

    let resultData: Record<string, unknown>;
    try {
      const fileRaw = fs.readFileSync(dataPath, 'utf8');
      resultData = JSON.parse(fileRaw);
    } catch {
      return NextResponse.json({ error: 'Failed to read precomputed data' }, { status: 500 });
    }

    const cs = getCaseStudyById(cleanAoi);
    const honestyWarnings = cs?.honestyNote ? [cs.honestyNote] : [];
    const sensitivityData = cs?.sensitivity || getSensitivityForCase(cleanAoi) || undefined;

    payload = {
      mode: normalizedMode,
      aoiName: cs?.title || (resultData.name as string) || cleanAoi,
      aoiId: cleanAoi,
      percentChanged: typeof resultData.percentChanged === 'number' ? resultData.percentChanged : 0,
      affectedAreaKm2: typeof resultData.affectedAreaKm2 === 'number' ? resultData.affectedAreaKm2 : 0,
      confidence: typeof resultData.confidence === 'number' ? resultData.confidence : 0,
      signalStrength: typeof resultData.signalStrength === 'number' ? resultData.signalStrength : 0,
      totalAreaKm2: typeof resultData.totalAreaKm2 === 'number' ? resultData.totalAreaKm2 : undefined,
      metrics: (resultData.metrics as InsightPayload['metrics']) || {},
      categories: (resultData.categories as InsightPayload['categories']) || [],
      dates: resultData.dates as InsightPayload['dates'],
      warnings: [...((resultData.warnings as string[]) || []), ...honestyWarnings],
      sensitivity: sensitivityData,
    };

    cacheKey = `${cleanAoi}:${normalizedMode}:${CACHE_VERSION}`;
  } else {
    // ── Shape B: Uploaded Results { metrics: {...}, [mode] } ──
    if (body.mode !== undefined && (typeof body.mode !== 'string' || !KNOWN_MODES.has(body.mode))) {
      return NextResponse.json({ error: 'Invalid mode for upload metrics' }, { status: 400 });
    }

    const rawMetrics = body.metrics;
    if (!rawMetrics || typeof rawMetrics !== 'object' || Array.isArray(rawMetrics)) {
      return NextResponse.json({ error: 'metrics must be a non-empty object' }, { status: 400 });
    }

    const metricKeys = Object.keys(rawMetrics as Record<string, unknown>);
    if (metricKeys.length === 0) {
      return NextResponse.json({ error: 'metrics object cannot be empty' }, { status: 400 });
    }

    const validatedMetrics: Record<string, number> = {};

    for (const key of metricKeys) {
      if (!ALLOWED_METRIC_KEYS.has(key)) {
        return NextResponse.json({ error: `Unknown metric key: ${key}` }, { status: 400 });
      }

      const val = (rawMetrics as Record<string, unknown>)[key];
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        return NextResponse.json({ error: `Metric ${key} must be a finite number` }, { status: 400 });
      }

      // Range validation
      if (key === 'lossThresholdDb') {
        if (val < -200 || val > 50) {
          return NextResponse.json({ error: `Metric ${key} out of sane range` }, { status: 400 });
        }
      } else if (key === 'percentChanged' || key === 'confidence' || key === 'signalStrength') {
        if (val < 0 || val > 100) {
          return NextResponse.json({ error: `Metric ${key} out of sane range (0-100)` }, { status: 400 });
        }
      } else {
        if (val < -1_000_000 || val > 1_000_000) {
          return NextResponse.json({ error: `Metric ${key} out of sane range` }, { status: 400 });
        }
      }

      validatedMetrics[key] = val;
    }

    // Determine mode from payload or infer from metric keys
    let resolvedMode: string;
    if (body.mode && typeof body.mode === 'string') {
      resolvedMode = normalizeMode(body.mode);
    } else if ('forestLossKm2' in validatedMetrics) {
      resolvedMode = 'deforestation';
    } else if (
      'erosionAreaKm2' in validatedMetrics ||
      'accretionAreaKm2' in validatedMetrics ||
      'riverAreaKm2' in validatedMetrics
    ) {
      resolvedMode = 'river-erosion';
    } else if ('waterAreaAKm2' in validatedMetrics || 'waterDeltaKm2' in validatedMetrics) {
      resolvedMode = 'surface-water';
    } else {
      resolvedMode = 'flood';
    }

    const affected =
      validatedMetrics.affectedAreaKm2 ??
      validatedMetrics.floodedAreaKm2 ??
      validatedMetrics.erosionAreaKm2 ??
      validatedMetrics.forestLossKm2 ??
      validatedMetrics.waterDeltaKm2 ??
      validatedMetrics.changedAreaKm2 ??
      0;

    const pct = validatedMetrics.percentChanged ?? 0;
    const confidence = validatedMetrics.confidence ?? validatedMetrics.signalStrength;

    payload = {
      mode: resolvedMode,
      aoiName: 'Uploaded SAR Imagery',
      aoiId: 'upload',
      percentChanged: pct,
      affectedAreaKm2: affected,
      confidence,
      signalStrength: confidence,
      totalAreaKm2: validatedMetrics.totalAreaKm2,
      metrics: validatedMetrics,
      categories: [],
      warnings: [],
    };

    const sortedEntries = Object.keys(validatedMetrics)
      .sort()
      .map((k) => `${k}:${validatedMetrics[k]}`)
      .join(',');
    const metricsHash = crypto.createHash('sha256').update(sortedEntries).digest('hex').slice(0, 16);
    cacheKey = `upload:${resolvedMode}:${metricsHash}:${CACHE_VERSION}`;
  }

  const activeAoiId = isShapeA ? (body.aoi as string).replace(/[^a-zA-Z0-9_-]/g, '') : null;
  const reliabilityNotes = buildReliabilityNotes(activeAoiId, payload);
  const notesField = reliabilityNotes.length > 0 ? reliabilityNotes : undefined;

  // 2. Per-IP Rate Limiting (10 requests per 10 minutes)
  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp)) {
    const fallbackText = generateFallbackInsight(payload);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded (10 requests per 10 minutes)',
        explanation: fallbackText,
        fallback: true,
        usedFallback: true,
        notes: notesField,
      },
      {
        status: 429,
        headers: { 'Retry-After': '600' },
      }
    );
  }

  // 3. Server-side Cache Check (TTL: 24h)
  const now = Date.now();
  const cached = insightCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      explanation: cached.explanation,
      fallback: cached.fallback,
      usedFallback: cached.fallback,
      notes: notesField,
    });
  }

  // 4. API Key Verification (read only from server env vars)
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    const fallbackText = generateFallbackInsight(payload);
    insightCache.set(cacheKey, { explanation: fallbackText, fallback: true, timestamp: now });
    return NextResponse.json({
      explanation: fallbackText,
      fallback: true,
      usedFallback: true,
      notes: notesField,
    });
  }

  // 5. Generate with Gemini (12-second timeout, deterministic fallback on any error)
  try {
    const prompt = buildPrompt(payload);
    const text = await callGemini(apiKey, prompt);
    const cleanText = text.trim();

    insightCache.set(cacheKey, { explanation: cleanText, fallback: false, timestamp: now });

    return NextResponse.json({
      explanation: cleanText,
      fallback: false,
      usedFallback: false,
      notes: notesField,
    });
  } catch {
    const fallbackText = generateFallbackInsight(payload);
    insightCache.set(cacheKey, { explanation: fallbackText, fallback: true, timestamp: now });
    return NextResponse.json({
      explanation: fallbackText,
      fallback: true,
      usedFallback: true,
      notes: notesField,
    });
  }
}
