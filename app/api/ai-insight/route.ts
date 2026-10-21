import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateFallbackInsight, InsightPayload } from '@/lib/ai-insight-fallback';

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

      modeFacts = `
- Analysis Mode: River Bank Erosion & Accretion
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Bank Erosion Area: ${erosion} km² (land converted to river water)
- Bank Accretion Area: ${accretion} km² (river water converted to sediment/sandbars)
- Net Land Change: ${net} km²
- Annualized Erosion Rate: ${rate}
- Persistent River Channel Area: ${river}`;
      break;
    }

    case 'flood': {
      const flooded = (payload.affectedAreaKm2 ?? 0).toFixed(2);
      const pct = (payload.percentChanged ?? 0).toFixed(2);
      const signal = (payload.confidence ?? payload.signalStrength ?? 0).toFixed(1);

      modeFacts = `
- Analysis Mode: Flood Inundation
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Flooded Ground Area: ${flooded} km²
- Percentage of Footprint Inundated: ${pct}%
- Radar Backscatter Signal Strength: ${signal}%`;
      break;
    }

    case 'deforestation': {
      const loss = ((metrics.forestLossKm2 as number) ?? payload.affectedAreaKm2 ?? 0).toFixed(2);
      const pct = (payload.percentChanged ?? 0).toFixed(2);
      const signal = (payload.confidence ?? payload.signalStrength ?? 0).toFixed(1);

      modeFacts = `
- Analysis Mode: Forest Canopy Loss / Disturbance
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Forest Canopy Loss Area: ${loss} km²
- Percentage of Surveyed Area Affected: ${pct}%
- Radar Backscatter Signal Strength: ${signal}%`;
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
      break;
    }

    default: {
      modeFacts = `
- Analysis Mode: SAR Change Detection
- Observation Dates: ${dateA} to ${dateB}${daysStr}
- Affected Area: ${(payload.affectedAreaKm2 ?? 0).toFixed(2)} km²
- Percentage of Scene Changed: ${(payload.percentChanged ?? 0).toFixed(2)}%
- Signal Strength: ${(payload.confidence ?? payload.signalStrength ?? 0).toFixed(1)}%`;
      break;
    }
  }

  const catStr =
    categories.length > 0
      ? `\nCategorized Classes:\n${categories.map((c) => `  - ${c.label}: ${c.areaKm2.toFixed(2)} km² (${c.kind})`).join('\n')}`
      : '';

  const warnStr =
    warnings.length > 0
      ? `\nProcessing Warnings (MUST be explicitly mentioned in the explanation):\n${warnings.map((w) => `  - ${w}`).join('\n')}`
      : '\nProcessing Warnings: None';

  return `You are an expert remote sensing analyst explaining Synthetic Aperture Radar (SAR) change detection results for ${aoiName}.

MANDATORY RULES:
1. All numbers provided below are already computed by deterministic code.
2. You must ONLY explain these computed numbers.
3. You MUST NOT invent, estimate, round differently, or add numbers.
4. You MUST NOT name causes (for example climate change, dams, illegal logging, weather systems) that are not in the data.
5. You MUST mention the processing warnings if any are provided below.
6. Provide exactly 3 short sentences in plain English.

COMPUTED DATA:
${modeFacts.trim()}
${catStr}
${warnStr}

Provide exactly 3 short sentences in plain English:`;
}

// Call Gemini 3.5 Flash with 12s timeout and 1 retry after 1.5s on 503 or 429
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const runWithTimeout = async (): Promise<string> => {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('TIMEOUT_12S'));
      }, 12000);
    });

    try {
      const res = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      clearTimeout(timer!);
      return res.response.text();
    } catch (err) {
      clearTimeout(timer!);
      throw err;
    }
  };

  try {
    return await runWithTimeout();
  } catch (firstErr: unknown) {
    const errObj = firstErr as { status?: number; message?: string };
    const errStr = String(errObj?.message || firstErr);
    const isRetryable =
      errObj?.status === 503 ||
      errObj?.status === 429 ||
      errStr.includes('503') ||
      errStr.includes('429') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('UNAVAILABLE');

    if (isRetryable) {
      // ONE retry after 1.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await runWithTimeout();
    }

    throw firstErr;
  }
}

export async function POST(request: NextRequest) {
  let payload: InsightPayload = { mode: 'flood' };

  try {
    payload = await request.json();

    // API key stays server-side only; never log it
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      const fallback = generateFallbackInsight(payload);
      return NextResponse.json({
        explanation: fallback,
        usedFallback: true,
      });
    }

    const prompt = buildPrompt(payload);
    const text = await callGemini(apiKey, prompt);

    return NextResponse.json({
      explanation: text.trim(),
      usedFallback: false,
    });
  } catch {
    // Generate deterministic fallback from the real numbers
    const fallback = generateFallbackInsight(payload);

    return NextResponse.json({
      explanation: fallback,
      usedFallback: true,
    });
  }
}
