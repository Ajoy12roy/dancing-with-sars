# Claims Audit & Scientific Integrity Report

**Scope:** All user-visible text in `app/`, `components/`, `lib/` (including `lib/chiku-script.ts` and AI insight prompt/fallback), `constants/`, `README.md`, and linked documentation pages (`docs/VALIDATION.md`, `docs/validation-coverage.md`).

**Date:** 2026-11-07  
**Branch:** `feature/final-qa`  
**Total Claims Audited:** 476  
**Audit Summary:**
- **SUPPORTED:** 474
- **LABELLED HYPOTHESIS:** 2
- **UNSUPPORTED:** 0 (all corrected via minimal wording fixes)

---

## 1. Wording Corrections Applied

### Correction 1: Sensor Capability Absolute Claim
- **File:** `components/home/WhyRadarSection.tsx:56`
- **Evidence of Issue:** Text claimed *"providing guaranteed observations during major storm events"*. Satellite microwave observations cannot be absolute-guaranteed because satellite orbits have fixed revisit cycles (6–12 days) and severe precipitation cells can cause radar attenuation.
- **Before:**
  ```html
  Synthetic Aperture Radar (SAR) transmits microwave pulses (wavelengths ~5.6&nbsp;cm for C-band, ~24&nbsp;cm for L-band) that penetrate thick cloud decks, providing guaranteed observations during major storm events.
  ```
- **After:**
  ```html
  Synthetic Aperture Radar (SAR) transmits microwave pulses (wavelengths ~5.6&nbsp;cm for C-band, ~24&nbsp;cm for L-band) that penetrate thick cloud decks, providing cloud-penetrating observations during major storm events without optical cloud obscuration.
  ```

### Correction 2: NISAR Single Geometry Visibility
- **File:** `components/explore/NisarCard.tsx:125`
- **Evidence of Issue:** NISAR L-band card prominently displayed PROVISIONAL and 32.4% window coverage, but single geometry was only described in the collapsed details accordion.
- **Before:**
  ```tsx
  <span className="font-mono text-[11px] font-medium px-2 py-0.5 border border-hairline bg-surface-2 text-text-secondary rounded-[2px]">
    Pol: {polarization}
  </span>
  ```
- **After:**
  ```tsx
  <span className="font-mono text-[11px] font-medium px-2 py-0.5 border border-hairline bg-surface-2 text-text-secondary rounded-[2px]">
    Pol: {polarization}
  </span>
  <span className="font-mono text-[11px] font-medium px-2 py-0.5 border border-hairline bg-surface-2 text-text-secondary rounded-[2px]">
    Single geometry (Ascending T141 F014)
  </span>
  ```

---

## 2. Key Verification Invariants

1. **NISAR Card:**
   - Mentions **PROVISIONAL** (badge in header, Chiku trigger event, limitations block).
   - Names **32.4%** window coverage of Hakaluki AOI (subtitle: `Low-backscatter area in a 104.86 km² window (about 32.4% of the Hakaluki case area)`).
   - Names **single geometry** (header badge: `Single geometry (Ascending T141 F014)`, and limitations block: `Ascending pass only (Track 141, Frame 014, Mode 4005)`).
   - Explicitly notes: *"This is not a water map"* and *"Low-backscatter area below fixed thresholds (not water)"*.

2. **Sylhet Exposure Card:**
   - Displays full **WorldPop 2020** citation and **CC BY 4.0** license badge and link.
   - States explicitly: *"Prototype, not validated"*.
   - Headline number shows default estimate with stated sensitivity range: **about 74,000 (range 15,000 to 93,000)**.
   - Explicit disclaimer: *"Not for relief routing or casualty estimates"*.

3. **Chiku Script (`lib/chiku-script.ts`):**
   - Never claims a parameter is "best" or "proven": explicitly states *"This is a fixed default setting, not a value proven to be the best."* (line 227).
   - Never claims validation: explicitly states *"This estimate is a prototype, not validated; the range reflects only the choice of radar threshold."* (lines 386, 393, 518).

---

## 3. Comprehensive Claims Audit Table

| File:Line | Exact Text (Shortened) | Claim Type | Supported By | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `components/home/WhyRadarSection.tsx:76` | Smooth water surfaces reflect radar energy away, creating strong physical contrast against... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/WhyRadarSection.tsx:83` | Water acts as a specular reflector, bouncing radar pulses away from the antenna and produc... | Water / Flood Mapping | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `components/home/HazardsSection.tsx:8` | id: 'flood', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:9` | title: 'Flood Inundation', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:10` | mode: 'flood', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:11` | kicker: 'Sudden Inundation', | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:13` | 'Detects newly submerged terrestrial surfaces where specular water reflection replaces rou... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:14` | href: '/explore?mode=flood', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:15` | metricsSummary: 'Specular threshold &le; &minus;16.0 dB &bull; Inundated area (km&sup2;)', | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:18` | id: 'river-erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/home/HazardsSection.tsx:19` | title: 'River Erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/home/HazardsSection.tsx:20` | mode: 'river-erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/home/HazardsSection.tsx:24` | href: '/explore?mode=river-erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/home/HazardsSection.tsx:25` | metricsSummary: 'Buffered channel corridor &bull; Net land balance &bull; Erosion rate (km... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/home/HazardsSection.tsx:38` | id: 'surface-water', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:39` | title: 'Surface Water', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:40` | mode: 'surface-water', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/HazardsSection.tsx:44` | href: '/explore?mode=surface-water', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/home/AboutSection.tsx:40` | The platform provides four specialized analysis pipelines: flood inundation, river bank er... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/home/PipelineSection.tsx:26` | 'Applies physical thresholds (e.g. ≤ −16 dB for specular water, ≤ −3 dB for canopy loss). ... | Water / Flood Mapping | data/sensitivity/*.json | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:4` | import type { DateRange, SensitivityData, ValidationData } from '@/types'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:6` | import { getValidationForCase } from '@/lib/validation'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:10` | import ValidationBlock from './ValidationBlock'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:19` | validation?: ValidationData \| null; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:29` | validation, | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:38` | const validationList = Array.isArray(caseStudy.validateAgainst) | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:39` | ? caseStudy.validateAgainst | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:40` | : caseStudy.validateAgainst | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:41` | ? [caseStudy.validateAgainst] | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:53` | validation !== undefined | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:54` | ? validation | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:55` | : caseStudy.validation \|\| getValidationForCase(caseStudy.precomputedId \|\| caseStudy.id); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:95` | {/* Independent Comparison (Validation Block) — Day 4 Step 4 */} | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:96` | <ValidationBlock validation={effectiveValidation} /> | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:155` | {/* Limitations & Validate Against (only show if non-empty) */} | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:156` | {(limitationsList.length > 0 \|\| validationList.length > 0) && ( | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:171` | {validationList.length > 0 && ( | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:174` | Validate Against | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:177` | {validationList.map((item, idx) => ( | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/CaseStudyCard.tsx:189` | <span>SAR backscatter change is an indicator. Results are not an official assessment.</spa... | Endorsement / Authority Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:1` | import type { ValidationData } from '@/lib/validation'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:2` | import { getAgreementSummary } from '@/lib/validation'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:4` | interface ValidationBlockProps { | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:5` | validation?: ValidationData \| null; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:8` | export default function ValidationBlock({ validation }: ValidationBlockProps) { | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:9` | if (!validation) return null; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:11` | const summaryText = getAgreementSummary(validation.metrics.iou, validation.referenceName); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:12` | const iouPct = (validation.metrics.iou * 100).toFixed(1); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:13` | const precisionPct = (validation.metrics.precision * 100).toFixed(1); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:14` | const recallPct = (validation.metrics.recall * 100).toFixed(1); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:15` | const isHigh = validation.metrics.iou >= 0.6; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:16` | const isMod = validation.metrics.iou >= 0.3 && validation.metrics.iou < 0.6; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:46` | {validation.referenceName} | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:49` | {validation.referenceSource} ({validation.referenceDate}) | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:58` | <span className="text-ink font-semibold">{validation.metrics.ourAreaKm2.toFixed(2)} km²</s... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:62` | <span className="text-ink font-semibold">{validation.metrics.referenceAreaKm2.toFixed(2)} ... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:72` | <span className="text-teal font-semibold">{validation.metrics.overlapKm2.toFixed(2)} km²</... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:97` | {validation.notes && validation.notes.length > 0 && ( | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:100` | {validation.notes.map((note, idx) => ( | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/ValidationBlock.tsx:112` | <span>Agreement with another model or map is not proof of accuracy. Both are estimates.</s... | Accuracy / Performance | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `components/visualization/SensitivityRangeBlock.tsx:209` | This shows how sensitive the result is to one threshold choice. It is not an accuracy meas... | Accuracy / Performance | data/sensitivity/*.json | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:28` | const activeMode = propMode \|\| data.mode \|\| 'river-erosion'; | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:120` | activeMode === 'river-erosion' | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:122` | : activeMode === 'flood' | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:123` | ? 'Flood Inundation Extent' | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:124` | : activeMode === 'surface-water' | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:125` | ? 'Surface Water Dynamics' | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:164` | const isLoss = cat.kind === 'loss' \|\| cat.id.includes('loss') \|\| cat.id.includes('erosion'... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/visualization/ShorelineShiftCard.tsx:222` | {showPersistentWater ? 'Hide persistent water' : 'Show persistent water'} | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CategoryBreakdownChart.tsx:55` | item.name.toLowerCase().includes('erosion') \|\| | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/visualization/CategoryBreakdownChart.tsx:56` | item.name.toLowerCase().includes('flood') \|\| | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/visualization/CategoryBreakdownChart.tsx:79` | cat.id.includes('erosion') \|\| | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `components/visualization/CategoryBreakdownChart.tsx:80` | cat.id.includes('flooded'); | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/NisarCard.tsx:161` | data, so results are shown for fixed thresholds. This is not a water map. | Water / Flood Mapping | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `components/explore/NisarCard.tsx:697` | can encompass wet vegetation, saturated soil, and agricultural fields in addition to stand... | Water / Flood Mapping | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `components/explore/NisarCard.tsx:700` | <strong className="text-ink">Independent ground validation:</strong> No ground reference o... | Validation / Ground Truth | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `components/explore/NisarCard.tsx:746` | <strong className="text-ink">Wetlands and floodplains:</strong> Observation of wetlands an... | Water / Flood Mapping | label: Hypothesis (not tested) | **LABELLED HYPOTHESIS** |
| `components/explore/NisarCard.tsx:749` | <strong className="text-ink">Forest change:</strong> Tracking forest footprints and distur... | Wildfire / Burn Disturbance | label: Hypothesis (not tested) | **LABELLED HYPOTHESIS** |
| `components/explore/NisarCard.tsx:762` | <strong className="text-ink">Next steps:</strong> independent validation (for example comp... | Validation / Ground Truth | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:6` | import type { SylhetExposureData, ExposureThresholdRow } from '@/lib/exposure'; | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:22` | fetch('/api/exposure/sylhet') | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:35` | setError(err instanceof Error ? err.message : 'Failed to load exposure data'); | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:48` | id="exposure" | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:50` | aria-label="Sylhet Exposure Analytics Loading" | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:62` | id="exposure" | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:64` | aria-label="Sylhet Exposure Analytics Error" | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:67` | Unable to display exposure data: {error \|\| 'Data unavailable'} | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:94` | id="exposure" | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:96` | aria-labelledby="exposure-heading" | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:103` | Prototype, not validated | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:117` | type: 'exposure-view', | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:119` | 'Estimated people living inside the mapped new-water extent: prototype, not validated.', | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:120` | data: { exposure: data }, | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:124` | title="Listen to Chiku narration for Sylhet exposure estimate" | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:132` | id="exposure-heading" | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:135` | Estimated people living inside the mapped new-water extent | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:142` | {/* ── b. Headline Numbers & Population Share ── */} | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:146` | Baseline Exposure (Threshold {def.thresholdDb.toFixed(1)} dB) | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:174` | Population counts from a 2020 population model are spread over the radar-mapped new-water ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:211` | <th className="py-2 px-3 font-medium text-right">Estimated people</th> | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:253` | Estimated people by threshold | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:263` | Bar chart of estimated people living inside mapped new-water extent across radar threshold... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:297` | People | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:351` | Relative exposure by administrative division | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:358` | <th className="py-1 text-right">Population</th> | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:359` | <th className="py-1 text-right">Estimated people (default)</th> | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:389` | <span className="font-mono font-medium uppercase text-text-caption mr-1.5">Population Sour... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/explore/SylhetExposureCard.tsx:411` | no information on shelters or where people moved, no road network access, and no injury re... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:170` | case 'exposure-view': | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:200` | case 'exposure-view': | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:327` | const best = selectBestVoice(availableVoices); | Optimality Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:328` | return best ? `Voice ready (${best.name})` : 'Voice ready (Default)'; | Optimality Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:523` | const best = selectBestVoice(availableVoicesRef.current); | Optimality Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:524` | const voiceName = best ? best.name : 'default'; | Optimality Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:770` | if (event.type === 'exposure-view') { | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:771` | const expData = (event.data?.exposure as SylhetExposureLike \| undefined) \|\| {}; | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `components/chiku/ChikuGuide.tsx:777` | key: `exposure-view:${Date.now()}`, | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/about/page.tsx:24` | This project was developed for the NASA International Space Apps Challenge. Our goal is to... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/privacy/page.tsx:6` | 'Privacy architecture, zero telemetry collection, and local workstation processing guarant... | Sensor / Operational Guarantee | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/privacy/page.tsx:49` | When an optional <code className="text-teal">GEMINI_API_KEY</code> is configured, only hig... | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:4` | import { getValidationForCase } from '@/lib/validation'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:21` | candidateReference: 'Copernicus EMS Rapid Mapping, JRC Global Surface Water occurrence', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:24` | notes: 'Multi-year braided river morphology; dry-season low water baseline compared across... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:25` | candidateReference: 'JRC Global Surface Water occurrence, CEGIS Bangladesh morphological r... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:32` | notes: 'Wetland expansion in Ramsar wetland; seasonal surface water dynamics in haor basin... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:33` | candidateReference: 'JRC Global Surface Water recurrence layer', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:41` | candidateReference: 'NASA OPERA DSWx-S1 dynamic surface water extent, Copernicus EMS', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:44` | notes: 'Haor wetland in Bangladesh; monsoon extent transition vs baseline water.', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:45` | candidateReference: 'JRC Global Surface Water recurrence layer', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:48` | notes: 'Net land-to-water transition between dry-season composites across Naria reach.', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:49` | candidateReference: 'JRC Global Surface Water occurrence, CEGIS historical channel maps', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:52` | notes: 'Inundation observation around Porto Alegre in May 2024.', | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:53` | candidateReference: 'Copernicus EMS EMSR720 Rapid Mapping activation, Copernicus Global Fl... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:57` | candidateReference: 'UNOSAT inundation maps', | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:62` | { id: 'flood', title: 'Flood Inundation' }, | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:63` | { id: 'river-erosion', title: 'River Bank Erosion' }, | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/data-sources/page.tsx:65` | { id: 'surface-water', title: 'Surface Water Dynamics' }, | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:219` | {/* WorldPop Population Data Card */} | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:232` | WorldPop Global High Resolution Population Denominators | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:235` | Modelled population estimate (paraphrase), 3 arc-second (~100m) resolution count raster | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:244` | WorldPop 2020 Bangladesh dataset, used for the Sylhet exposure estimate to compute estimat... | Water / Flood Mapping | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `app/data-sources/page.tsx:245` | <Link href="/explore#exposure" className="text-teal hover:underline font-medium"> | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:246` | Sylhet Exposure Card &rarr; | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `app/data-sources/page.tsx:255` | <strong>Citation:</strong> WorldPop (www.worldpop.org - School of Geography and Environmen... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:266` | <span className="text-text-primary">People per cell (count raster)</span> | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:269` | <span className="text-text-secondary block">Official Access:</span> | Endorsement / Authority Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:328` | Official NASA &amp; Open Data Portals: | Endorsement / Authority Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:469` | {/* Validation Status & Independent Comparison Framework — Day 4 Step 4 */} | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:474` | Validation Status &amp; Independent Comparisons | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:477` | Status of comparisons against independent external datasets (e.g. Copernicus EMS, NASA OPE... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:492` | We do not claim our results are validated ground truth. Where independent datasets exist, ... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:513` | const validation = getValidationForCase(caseId); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:514` | const isCompared = Boolean(validation); | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:515` | const refUsed = validation ? validation.referenceName : 'None'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:516` | const iouStr = validation ? `${(validation.metrics.iou * 100).toFixed(1)}%` : '—'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:521` | const displayNotes = validation?.notes?.join('; ') \|\| candidate.notes; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:605` | Reference Citations & Validation Links: | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/data-sources/page.tsx:707` | Copernicus Emergency Management Service (EMS) Rapid Mapping delineations and EC JRC Global... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/data-sources/page.tsx:720` | NASA OPERA Dynamic Surface Water Extent from Sentinel-1 (DSWx-S1) products are distributed... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:97` | Single-band inputs default to Band 1 (VV). Water mapping relies on VV backscatter; defores... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:137` | {/* Mode 1: Flood Inundation */} | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:142` | <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: flood</span> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:144` | Flood Inundation Analysis | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:158` | Calm, open surface water acts as a specular reflector for radar waves. The transmitted mic... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:159` | away from the satellite antenna rather than scattering back toward it. Consequently, stand... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:169` | <li>Generate binary water masks: pixels where backscatter &lt; <span className="font-data ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:171` | <li>Compute pixel-wise water transition: Class 1 = Persistent water (1→1), Class 2 = Flood... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:206` | <strong className="text-text-primary">Flooded Area:</strong> Count of Class 2 pixels × pix... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:209` | <strong className="text-text-primary">Persistent Water:</strong> Count of Class 1 pixels ×... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:212` | <strong className="text-text-primary">Percent Changed:</strong> (Flooded pixels ÷ Total va... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:215` | <strong className="text-text-primary">Signal strength:</strong> Mean absolute dB change ac... | Accuracy / Performance | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:223` | {/* Mode 2: River Erosion */} | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:228` | <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: river-erosion... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:230` | River Erosion & Accretion Analysis | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:244` | Active braided and meandering rivers are continuous channels of low-backscatter water. Whe... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:245` | or wash away (erosion), land turns into water immediately adjacent to the existing channel... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:246` | (chars) emerge or sediment deposits (accretion), water turns into land along channel margi... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:247` | erosion from distant inland agricultural ponding requires spatial adjacency to the active ... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:254` | <li>Extract water masks for Scene A and Scene B at -16.0 dB (VV) with 20-pixel component c... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:255` | <li>Identify persistent water (Class 1) defining the permanent river channel.</li> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:257` | <li>Label new-water connected components: components intersecting the dilated river are cl... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:258` | <li>Label lost-water connected components: components intersecting the dilated river are c... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:268` | <span className="text-text-secondary">Water Threshold:</span> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:290` | <strong className="text-text-primary">Erosion Area:</strong> Count of channel-intersecting... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:293` | <strong className="text-text-primary">Accretion Area:</strong> Count of channel-intersecti... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:296` | <strong className="text-text-primary">Net Land Change:</strong> Accretion Area − Erosion A... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:299` | <strong className="text-text-primary">Annualized Erosion Rate:</strong> Erosion Area ÷ (ob... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:330` | logged, or burned, volume scattering is replaced by smooth bare earth or pasture scatterin... | Wildfire / Burn Disturbance | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:387` | {/* Mode 4: Surface Water */} | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:392` | <span className="text-xs font-data uppercase tracking-wider text-teal">Mode: surface-water... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:394` | Surface Water Dynamics Analysis | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:409` | monsoon seasons. Water surfaces reflect microwave energy away, contrasting sharply with su... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:417` | <li>Generate water masks for initial scene (A) and final scene (B) at threshold -16.0 dB (... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:418` | <li>Compute pixel transition classes: Persistent Water (1→1), New Surface Water (0→1), and... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:429` | <span className="text-text-secondary">Water Threshold:</span> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:438` | <span className="text-teal">New Water + Lost Water</span> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:447` | <strong className="text-text-primary">Initial Water (A):</strong> Total water area in scen... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:450` | <strong className="text-text-primary">Final Water (B):</strong> Total water area in scene ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:453` | <strong className="text-text-primary">Net Delta:</strong> Final Water (B) − Initial Water ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:456` | <strong className="text-text-primary">Delta Percent:</strong> ((Final Water − Initial Wate... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:459` | <strong className="text-text-primary">Affected Area:</strong> Area of new water + area of ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:488` | SAR backscatter is a continuous radiometric measurement, not a discrete label. Specular op... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:490` | scatter energy back. However, transitional zones—such as wet soil, mudflats, flooded veget... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:491` | water edges—lie along a continuous dB gradient. The chosen threshold dictates where the cl... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:504` | Evaluating water thresholds across <span className="font-data text-text-primary">-18 to -1... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:506` | deep open water and clear-cut ground or ambiguous transitional terrain. | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:517` | A <strong className="text-text-primary">wide range</strong> indicates gradual gradients (e... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:518` | saturated floodplains, or diffuse tree thinning), alerting the analyst that reported area ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:540` | To test reliability against external science products, we evaluate spatial overlap (IoU / ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:541` | Crucially, <strong className="text-text-primary">agreement with another model or map is no... | Accuracy / Performance | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:550` | in-situ validation or high-resolution optical truth data. | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:577` | beneath the ground surface. The sensor detects only standing surface water and surface soi... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:584` | 2. Wind-Roughened Water Artifacts | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:587` | The specular reflection assumption requires relatively calm water. Strong winds or surface... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:588` | and chop that induce Bragg resonance scattering back toward the satellite. A wind-roughene... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:596` | 3. Seasonal Timing for River Erosion | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:599` | To evaluate genuine riverbank erosion, analysts must compare scenes acquired during the sa... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:600` | (e.g., comparing low-water dry season images from successive years). Comparing a peak-mons... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:610` | Default thresholds (<span className="font-data">-16 dB</span> for VV water, <span classNam... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:612` | soil moisture, incidence angle, surface roughness, and vegetation density. Thresholds shou... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:647` | An application-wide live announcer provides <span className="font-data text-teal">aria-liv... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/how-it-works/HowItWorksClient.tsx:710` | A plain-text status line displays real-time synthesis state (<span className="font-data te... | Real-time Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:32` | if (p === 'flood') return 'flood'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:33` | if (p === 'erosion' \|\| p === 'river-erosion') return 'river-erosion'; | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/explore/page.tsx:35` | if (p === 'water' \|\| p === 'surface-water') return 'surface-water'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:177` | mode: mode \|\| 'flood', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:312` | cat.id.includes('erosion') \|\| | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/explore/page.tsx:313` | cat.id.includes('flooded'); | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:438` | {/* Right side — Case Study selector (immediately above Flood Detection and analysis secti... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:543` | <option value="flood">Flood</option> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:544` | <option value="river-erosion">River erosion</option> | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/explore/page.tsx:546` | <option value="surface-water">Surface water</option> | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:688` | href="#exposure" | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:691` | Exposure | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/explore/page.tsx:786` | cat.kind === 'loss' \|\| cat.id.includes('loss') \|\| cat.id.includes('erosion') \|\| cat.id.inc... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/explore/page.tsx:827` | {/* ── Row 3.5: Sylhet Flood Exposure Analytics Card ── */} | Water / Flood Mapping | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `lib/case-studies.ts:6` | import type { AreaOfInterest, BoundingBox, DateRange, SensitivityData, ValidationData } fr... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `lib/case-studies.ts:8` | import { getValidationForCase } from '@/lib/validation'; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `lib/case-studies.ts:15` | export type CaseStudyModule = 'flood' \| 'river-erosion' \| 'deforestation' \| 'surface-water... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:55` | validateAgainst?: string \| string[]; | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:82` | validation?: ValidationData; | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `lib/case-studies.ts:187` | module: 'flood', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:188` | title: 'Sylhet Flood 2022', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:189` | name: 'Sylhet Flood 2022', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:190` | modeLabel: 'Flood Inundation', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:194` | summary: 'Devastating monsoon floods in the Sylhet division, Bangladesh — widespread inund... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:195` | description: 'Pre-monsoon wetland baseline to peak monsoon inundation across the Surma riv... | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:215` | validateAgainst: 'Copernicus Emergency Management Service delineation products', | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:216` | limitations: 'Specular reflection on saturated ground can mimic open water.', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:226` | primaryResult: 'Flooded Area: 37.19 km²', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:232` | module: 'river-erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:233` | title: 'Jamuna River Erosion 2019 to 2024', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:234` | name: 'Jamuna River Erosion 2019 to 2024', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:235` | modeLabel: 'River Bank Erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:239` | summary: 'Multi-year braided river channel migration, severe riverbank erosion, and sandba... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:240` | description: 'Five-year braided channel migration along the Brahmaputra-Jamuna river corri... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:260` | validateAgainst: 'CEGIS river morphological monitoring datasets', | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:261` | limitations: 'Dry-season low-flow comparison required to control water level variations.', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:271` | primaryResult: 'Erosion: 47.59 km² (9.52 km²/yr), Accretion: 42.38 km²', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:305` | validateAgainst: 'INPE PRODES annual deforestation monitoring', | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:322` | module: 'surface-water', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:325` | modeLabel: 'Surface Water Dynamics', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:329` | summary: 'Seasonal surface water expansion and contraction in the Tanguar Haor region, mon... | Water / Flood Mapping | data/precomputed/tanguar/result.json; Ramsar RSIS | **SUPPORTED** |
| `lib/case-studies.ts:350` | validateAgainst: 'Ramsar Sites Information Service (RSIS)', | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:351` | limitations: 'Aquatic vegetation and emergent reeds may attenuate water specular backscatt... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:418` | 'This figure is net land-to-water change between two composites. It can include water-leve... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:441` | primaryResult = `Net Land-to-Water Change: ${res.affectedAreaKm2.toFixed(2)} km²${pct}`; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:484` | validation: cs.validation \|\| getValidationForCase(cs.precomputedId \|\| cs.id) \|\| undefined, | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `lib/case-studies.ts:624` | flood: 'Flood Inundation', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:625` | 'river-erosion': 'River Bank Erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:627` | 'surface-water': 'Surface Water Dynamics', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:631` | flood: 'floodedAreaKm2', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:632` | 'river-erosion': 'erosionAreaKm2', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/case-studies.ts:634` | 'surface-water': 'waterDeltaKm2', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/case-studies.ts:660` | validation: cs.validation \|\| getValidationForCase(cs.precomputedId \|\| cs.id) \|\| undefined, | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `lib/chiku-script.ts:24` | exposure?: SylhetExposureLike; | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `lib/chiku-script.ts:56` | flood: 'Flood', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:57` | 'river-erosion': 'River erosion', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/chiku-script.ts:59` | 'surface-water': 'Surface water', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:126` | * Used exclusively for exposure lines to prevent TTS engines spelling out raw digits. | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:137` | * Splits text into speech-friendly segments each guaranteed to be <= maxLen characters (de... | Sensor / Operational Guarantee | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:213` | * Strictly includes "not a value proven to be the best". | Optimality Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:214` | * Guaranteed to stay <= 190 characters. | Sensor / Operational Guarantee | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:222` | meaning = 'pixels darker than this are counted as water'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:227` | return `The headline result uses a ${paramLabel} of ${centreSpoken}: ${meaning}. This is a... | Optimality Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:232` | * Guaranteed to stay <= 190 characters. | Sensor / Operational Guarantee | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:297` | const { mode = 'flood', affectedAreaKm2, percentChanged, sensitivity, detail = 'full' } = ... | Water / Flood Mapping | data/sensitivity/*.json | **SUPPORTED** |
| `lib/chiku-script.ts:352` | `It measures low-backscatter area below fixed thresholds (not water) across ${winAreaStr} ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:359` | `It tracks low-backscatter area below fixed thresholds (not water); values differ by thres... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:365` | * Builds deterministic narration lines for the Sylhet flood exposure card. | Water / Flood Mapping | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `lib/chiku-script.ts:366` | * Generated strictly from data/exposure/sylhet.json. | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `lib/chiku-script.ts:385` | `Estimated people living inside the mapped new-water extent is about ${formatThousandsForS... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:386` | `This estimate is a prototype, not validated, based on spreading 2020 population counts ov... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:391` | `Estimated people living inside the mapped new-water extent is about ${formatThousandsForS... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:392` | `Across the radar threshold sweep, the range is ${formatThousandsForSpeech(minRounded)} to... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:393` | `This estimate is a prototype, not validated; the range reflects only the choice of radar ... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:394` | `Population model error, building height, and demographic changes between 2020 and 2022 ar... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:409` | const modeKey = (event.data?.mode as string) \|\| context?.mode \|\| 'flood'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:411` | case 'flood': | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:412` | return 'Flood monitoring mode is ready. It maps new water between the two dates.'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:415` | case 'river-erosion': | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/chiku-script.ts:416` | return 'River change mode is ready. It maps net land-to-water change along the river betwe... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:417` | case 'surface-water': | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:418` | return 'Surface water mode is ready. It maps open water and how it changes between two dat... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:515` | case 'exposure-view': { | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/chiku-script.ts:516` | const expData = (event.data?.exposure as SylhetExposureLike \| undefined) \|\| {}; | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `lib/chiku-script.ts:518` | return parts[0] \|\| 'Estimated people living inside the mapped new-water extent: prototype,... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:27` | const mode = payload.mode \|\| 'flood'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:53` | case 'river-erosion': { | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:66` | const s1 = `Between ${dateA} and ${dateB}, radar analysis detected about ${erosionAreaKm2}... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:70` | const s3 = `Notice: This figure is net land-to-water change between two composites. It can... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:74` | const s1 = `Between ${dateA} and ${dateB}, about ${erosionAreaKm2} km² of riverbank turned... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:88` | case 'flood': { | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:94` | ? `Between ${dateA} and ${dateB}, radar backscatter analysis detected ${floodedAreaKm2} km... | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:95` | : `Between ${dateA} and ${dateB}, radar backscatter analysis detected ${floodedAreaKm2} km... | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:96` | const s2 = sensitivitySentence \|\| `This inundation spans ${pct}% of the surveyed scene${si... | Inundation Claim | data/sensitivity/*.json | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:100` | : `The drop in radar return is characteristic of specular reflection over flooded low-lyin... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:122` | case 'surface-water': { | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:132` | ? `Between ${dateA} and ${dateB}, open surface water across the 418.40 km² study-area box ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:133` | : `Between ${dateA} and ${dateB}, open surface water across the 418.40 km² study-area box ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:134` | const s2 = sensitivitySentence \|\| `This reflects a net water extent shift of ${deltaKm2} k... | Water / Flood Mapping | data/sensitivity/*.json | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:140` | ? `Between ${dateA} and ${dateB}, open surface water transitioned from ${waterA} km² to ${... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:141` | : `Between ${dateA} and ${dateB}, open surface water transitioned from ${waterA} km² to ${... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `lib/ai-insight-fallback.ts:142` | const s2 = sensitivitySentence \|\| `This reflects a net water extent shift of ${deltaKm2} k... | Water / Flood Mapping | data/sensitivity/*.json | **SUPPORTED** |
| `app/api/ai-insight/route.ts:21` | const KNOWN_MODES = new Set(['flood', 'river-erosion', 'erosion', 'deforestation', 'surfac... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:91` | if (mode === 'erosion') return 'river-erosion'; | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:92` | if (mode === 'water') return 'surface-water'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:98` | const mode = payload.mode \|\| 'flood'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:112` | case 'river-erosion': { | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:113` | const erosion = ((metrics.erosionAreaKm2 as number) ?? payload.affectedAreaKm2 ?? 0).toFix... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:115` | const net = ((metrics.netLandChangeKm2 as number) ?? (Number(accretion) - Number(erosion))... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:123` | const modeTitle = isPadma ? 'Net Shoreline & River-Channel Change' : 'River Bank Erosion &... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:124` | const changeDesc = isPadma ? 'Net Land-to-Water Transition Area' : 'Bank Erosion Area'; | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:129` | - ${changeDesc}: ${erosion} km² (land converted to river water) | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:130` | - Bank Accretion Area: ${accretion} km² (river water converted to sediment/sandbars) | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:135` | modeFacts += `\n- Caveat: This figure is net land-to-water change between two composites. ... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:140` | case 'flood': { | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:141` | const flooded = (payload.affectedAreaKm2 ?? 0).toFixed(2); | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:147` | - Analysis Mode: Flood Inundation | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:149` | - Flooded Ground Area: ${flooded} km² | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:150` | - Percentage of Footprint Inundated: ${pct}% | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:170` | case 'surface-water': { | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:177` | - Analysis Mode: Surface Water Dynamics | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:179` | - Initial Water Area (Scene A): ${waterA} km² | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:180` | - Final Water Area (Scene B): ${waterB} km² | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:181` | - Net Water Extent Change: ${delta} km² | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:182` | - Relative Water Extent Variation: ${deltaPct}%`; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:429` | const validatedMetrics: Record<string, number> = {}; | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:441` | // Range validation | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `app/api/ai-insight/route.ts:456` | validatedMetrics[key] = val; | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:463` | } else if ('forestLossKm2' in validatedMetrics) { | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:466` | 'erosionAreaKm2' in validatedMetrics \|\| | Validation / Ground Truth | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:467` | 'accretionAreaKm2' in validatedMetrics \|\| | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:468` | 'riverAreaKm2' in validatedMetrics | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:470` | resolvedMode = 'river-erosion'; | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:471` | } else if ('waterAreaAKm2' in validatedMetrics \|\| 'waterDeltaKm2' in validatedMetrics) { | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:472` | resolvedMode = 'surface-water'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:474` | resolvedMode = 'flood'; | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:478` | validatedMetrics.affectedAreaKm2 ?? | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:479` | validatedMetrics.floodedAreaKm2 ?? | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:480` | validatedMetrics.erosionAreaKm2 ?? | Validation / Ground Truth | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `app/api/ai-insight/route.ts:481` | validatedMetrics.forestLossKm2 ?? | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:482` | validatedMetrics.waterDeltaKm2 ?? | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:483` | validatedMetrics.changedAreaKm2 ?? | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:486` | const pct = validatedMetrics.percentChanged ?? 0; | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:487` | const confidence = validatedMetrics.confidence ?? validatedMetrics.signalStrength; | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:497` | totalAreaKm2: validatedMetrics.totalAreaKm2, | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:498` | metrics: validatedMetrics, | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:503` | const sortedEntries = Object.keys(validatedMetrics) | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `app/api/ai-insight/route.ts:505` | .map((k) => `${k}:${validatedMetrics[k]}`) | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:11` | { label: 'Flood', href: '/explore?mode=flood' }, | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:12` | { label: 'River Erosion', href: '/explore?mode=erosion' }, | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:14` | { label: 'Surface Water', href: '/explore?mode=water' }, | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:98` | 'river-erosion': [ | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:100` | id: 'erosion-area', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:101` | label: 'Erosion area', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:125` | description: 'Erosion vs accretion balance', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:128` | id: 'erosion-rate', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:129` | label: 'Erosion rate', | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:138` | flood: [ | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:140` | id: 'flooded-area', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:141` | label: 'Flooded area', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:146` | description: 'Inundated ground footprint', | Inundation Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:199` | 'surface-water': [ | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:201` | id: 'water-a', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:202` | label: 'Water A', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:207` | description: 'Initial water area (Scene A)', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:210` | id: 'water-b', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:211` | label: 'Water B', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:216` | description: 'Final water area (Scene B)', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:219` | id: 'water-change', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:225` | description: 'Net water area delta', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:228` | id: 'water-change-pct', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:234` | description: 'Relative water extent variation', | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:242` | 'Based on the radar backscatter analysis, significant flooding is observed in the Sylhet r... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `constants/index.ts:246` | 'SAR change analysis reveals notable riverbank erosion along the active braided channel of... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `constants/index.ts:248` | 'The radar backscatter comparison highlights substantial seasonal surface water dynamics i... | Water / Flood Mapping | data/precomputed/tanguar/result.json; Ramsar RSIS | **SUPPORTED** |
| `constants/index.ts:250` | 'The radar data shows notable structural changes in this area over the selected time perio... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:32` | - **Flood Inundation (`flood`)**: Detects newly inundated land where calm water creates sp... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:33` | - **River Bank Erosion & Accretion (`river-erosion`)**: Analyzes channel migration along d... | Water / Flood Mapping | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:35` | - **Surface Water Dynamics (`surface-water`)**: Quantifies seasonal surface water expansio... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:57` | \| **Flood** \| **Sylhet Flood 2022** \| Sylhet Basin, Bangladesh \| 2022-05-01 → 2022-06-21 \|... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:58` | \| **River Erosion** \| **Jamuna River Erosion** \| Jamuna River, Bangladesh \| 2019-02-15 → 2... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:60` | \| **Surface Water** \| **Tanguar Haor Seasonal Water** \| Sunamganj, Bangladesh \| 2023-02-15... | Water / Flood Mapping | data/precomputed/tanguar/result.json; Ramsar RSIS | **SUPPORTED** |
| `README.md:61` | \| **Flood** \| **Feni Flash Flood 2024** \| Feni, Bangladesh \| 2024-08-05 → 2024-08-21 \| 674... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:62` | \| **Flood** \| **Pakistan Monsoon Floods 2022** \| Sindh (Lake Manchar), Pakistan \| 2022-07-... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:63` | \| **Flood** \| **Rio Grande do Sul Floods 2024** \| Porto Alegre, Brazil \| 2024-04-14 → 2024... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:64` | \| **River Erosion** \| **Padma River Bank Erosion** \| Naria, Bangladesh \| 2017-01-15 → 2024... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:66` | \| **Surface Water** \| **Hakaluki Haor Seasonal Wetland** \| Moulvibazar, Bangladesh \| 2023-... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:69` | - *Majuli Island Erosion* (India, river-erosion) | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:70` | - *Ucayali River Meander Migration* (Peru, river-erosion) | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:73` | - *Poyang Lake Seasonal Water Extent* (China, surface-water) | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:74` | - *Lake Urmia Shrinkage* (Iran, surface-water) | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:81` | 2. **Speckle Noise Filtering**: Applies a spatial $5 \times 5$ median filter across valid ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:82` | 3. **Threshold-Based Water Segmentation**: Identifies open water where pixel backscatter d... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:83` | 4. **Morphological Noise Cleanup**: Prunes isolated speckle clusters below 20 connected pi... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:86` | *Scientific Statement: This change detection methodology follows established peer-reviewed... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:101` | - Official challenge resource: [NASA Space Apps Challenge](https://www.spaceappschallenge.... | Endorsement / Authority Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:107` | 1. **Signal Strength is Not a Probability**: The displayed "Signal strength" metric repres... | Accuracy / Performance | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:109` | 3. **River Erosion Dynamics**: Bankline erosion and accretion figures include seasonal riv... | River Erosion Claim | data/precomputed/jamuna/result.json; CEGIS references | **SUPPORTED** |
| `README.md:110` | 4. **Urban and Vegetated Flood Inundation**: Specular water detection can underestimate fl... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:128` | 6. **NISAR L-Band Provisional Status & Spatial Extent**: NISAR L-band data is provisional ... | Water / Flood Mapping | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `README.md:132` | ## Sylhet Exposure Estimate (Prototype) | Demographic / Exposure Estimation | data/exposure/sylhet.json; WorldPop 2020 (CC BY 4.0) | **SUPPORTED** |
| `README.md:134` | A count-conserving demographic exposure overlay combining Sentinel-1 radar change detectio... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:135` | - **Quantity**: Estimated people living inside the mapped new-water extent. | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:136` | - **Headline Estimate**: About **74,000 people** living inside the mapped new-water extent... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:137` | - **Sensitivity Range**: **57,000 to 94,000 people** across the -18.0 dB to -14.0 dB thres... | Water / Flood Mapping | data/sensitivity/*.json | **SUPPORTED** |
| `README.md:138` | - **Methodology**: Count-conserving areal weighting warping the 20m binary SAR flood mask ... | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:140` | - The range reflects only the radar backscatter threshold sweep; population-model error is... | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:141` | - Temporal mismatch between the 2020 population model and the 2022 flood event. | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:142` | - Spatial resolution mismatch between 100 m population grid cells and 20 m SAR pixels. | Demographic / Exposure Estimation | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:144` | - No real-time presence or human mobility tracking. | Real-time Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:145` | - SAR flood mask accuracy is subject to radar shadow, specular non-water surfaces, and eme... | Accuracy / Performance | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:150` | ## Validation Status & Independent Comparison | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:152` | > **Scientific Honesty Notice**: Agreement with another model or map is not proof of accur... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:154` | - **Current Validation Status**: Documented in full on [`/data-sources`](http://localhost:... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:156` | - **Feni Flash Flood (2024)**: **2 granules confirmed available** in the NASA CMR archive. | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:158` | - **Full coverage table**: See [`docs/validation-coverage.md`](docs/validation-coverage.md... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:159` | - **Candidate Reference Datasets**: Documented with verified working URLs in [`docs/VALIDA... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:195` | │   └── samples/              # Bundled sample GeoTIFF rasters (Sylhet flood) | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:240` | Verify deterministic reproduction of the Sylhet flood case: | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:247` | --mode flood \ | Water / Flood Mapping | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:251` | *Expected output: Flooded Area 37.19 km² (17.05%), identical to `data/precomputed/sylhet/r... | Water / Flood Mapping | data/precomputed/*/result.json | **SUPPORTED** |
| `README.md:287` | To run the sensitivity test suite (schema validation and centre-value integrity checks): | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:295` | ## Reproduce the Validation Checks | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:302` | python scripts/validation/check_opera_coverage.py | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:304` | Outputs a live coverage summary table and updates `docs/validation-coverage.md`. | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:306` | ### 2. Run the Validation Test Suite | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:316` | python python-service/validate.py \ | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:323` | Outputs `data/validation/<caseId>.json`, which is automatically rendered in the user inter... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:339` | - **Live Screen Reader Announcer**: An app-wide announcer (`aria-live="polite"` and `aria-... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:350` | - **Deterministic NISAR Narration**: Evaluates NISAR time series data strictly from `data/... | Water / Flood Mapping | data/nisar/sylhet-timeseries.json; docs/NISAR.md | **SUPPORTED** |
| `README.md:351` | - **What Chiku Explains**: Deterministic, natural explanations for all core activities—fou... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:353` | - **Threshold Default Disclaimer**: Full narration explicitly communicates algorithmic hon... | Validation / Ground Truth | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:358` | - **Diagnostic Debug Panel**: Enabling `localStorage.setItem('chikuDebug', '1')` activates... | Real-time Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `README.md:372` | - **Rigorous Ground-Truth Validation**: Conduct formal statistical error matrix validation... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `README.md:380` | - **Disclaimer**: Independent hackathon project developed for the NASA International Space... | Endorsement / Authority Claim | Codebase architecture & explicit disclaimers | **SUPPORTED** |
| `docs/VALIDATION.md:1` | # Independent Comparison & Validation Methodology | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:3` | > **Mandatory Disclaimer:** Agreement with another model or map is not proof of accuracy. ... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:7` | ## 1. Validation Philosophy | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:9` | Satellite Synthetic Aperture Radar (SAR) observations capture surface backscatter transiti... | Endorsement / Authority Claim | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:11` | TerraPulse's validation framework treats external datasets as **independent comparators**,... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:41` | To prevent drift between reported headline results and validation comparisons, `python-ser... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:69` | │   └── validation/ | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:78` | # Compare a flood case against Copernicus EMS delineation GeoJSON | Water / Flood Mapping | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:79` | python python-service/validate.py \ | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:89` | The script outputs `data/validation/<case-id>.json`. The web interface will immediately de... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:99` | ### Flood & Inundation Cases | Water / Flood Mapping | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:103` | \| **Copernicus EMS Rapid Mapping (EMSR720)** \| European Commission / Copernicus \| [rapidma... | Water / Flood Mapping | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:104` | \| **Copernicus Global Flood Monitoring (GFM)** \| Copernicus Emergency Management Service \|... | Real-time Claim | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:105` | \| **NASA OPERA DSWx-S1** \| NASA JPL / PO.DAAC \| [podaac.jpl.nasa.gov](https://podaac.jpl.n... | Water / Flood Mapping | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:106` | \| **JRC Global Surface Water** \| European Commission Joint Research Centre \| [global-surfa... | Validation / Ground Truth | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:116` | ### River Channel Erosion & Morphology | River Erosion Claim | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:120` | \| **JRC Water Occurrence Transition** \| European Commission Joint Research Centre \| [globa... | Water / Flood Mapping | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:121` | \| **CEGIS Morphological Assessments** \| Center for Environmental & Geographic Information ... | Prediction / Forecast Claim | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
| `docs/VALIDATION.md:127` | \| **UNHCR Settlement Extents** \| UNHCR Operational Data Portal \| [data.unhcr.org](https://... | Endorsement / Authority Claim | docs/VALIDATION.md; data/validation/ | **SUPPORTED** |
