# TerraPulse — Presentation & Demo Script

**Event:** NASA International Space Apps Challenge 2026  
**Challenge:** Dancing with the SARs (Synthetic Aperture Radar)  
**Project:** TerraPulse (Team Nova Strike's)  
**Primary UI Workspace:** `http://localhost:3000/explore`

---

## 1. Pre-Demo Checklist (Complete 15 Minutes Before Presentation)

- [ ] **1. Wi-Fi Off & Offline Test:** Disconnect Wi-Fi or enable Airplane Mode. Navigate to `http://localhost:3000/` and `http://localhost:3000/explore`. Confirm all pages render immediately and all precomputed cases switch without network requests.
- [ ] **2. System Audio & Volume Mixer:**
  - Open Windows Volume Mixer (or OS sound settings).
  - Verify your web browser (Chrome / Edge / Firefox / Safari) is unmuted and host audio output is at 75–85%.
  - Verify that an English text-to-speech voice is installed in Windows Settings.
- [ ] **3. Browser Setup:**
  - Use a clean browser profile without ad-blockers or extensions interfering with Web Speech synthesis.
  - Set browser zoom to 100% on a 1920×1080 resolution.
- [ ] **4. Preload Tabs in Order:**
  - Tab 1: `http://localhost:3000/` (Home page)
  - Tab 2: `http://localhost:3000/explore?case=sylhet` (Explore page with Sylhet case loaded)
  - Tab 3: `http://localhost:3000/how-it-works#what-we-do-not-do` (Methodology & Disclaimers)
  - Tab 4: `http://localhost:3000/data-sources` (Dataset Citations & Provenance)

---

## 2. 3-Minute Comprehensive Demo Script

### [0:00 - 0:35] Introduction & The Radar Advantage
- **Action:** Open Tab 1 (`http://localhost:3000/`). Scroll smoothly to the **"Why radar matters"** section.
- **Spoken Words:**
  > *"Judges and team, when disaster strikes, optical satellites are blind—blocked by cloud cover, rain, smoke, and night. Synthetic Aperture Radar, or SAR, transmits microwave pulses that penetrate clouds completely.*  
  > *This is TerraPulse: an open-source, scientifically honest platform that uses radar satellites—including the newly operational NASA-ISRO NISAR mission—to track, measure, and explain surface changes worldwide."*

### [0:35 - 1:20] Real Change Detection & Demographic Exposure
- **Action:** Switch to Tab 2 (`/explore?case=sylhet`).
  1. Click the **Before / After** toggle button and drag the split slider across the flooded basin.
  2. Scroll down to the **"Estimated people living inside the mapped new-water extent"** card.
- **Spoken Words:**
  > *"Here in Sylhet, Bangladesh during the catastrophic 2022 monsoon flood, TerraPulse analyzes Sentinel-1 C-band backscatter.*  
  > *Water acts as a specular reflector, bouncing radar pulses away and appearing dark.*  
  > *Our deterministic engine calculated 37.19 square kilometres of new flood inundation—a 17% change.*  
  > *By combining this radar flood mask with WorldPop 2020 gridded population counts, our demographic model estimates that about 74,000 residents lived inside the mapped new water.*  
  > *Notice that we state this as a prototype estimate with a sensitivity range: from 57,000 to 94,000 people depending on the radar threshold. We never present single uncalibrated numbers as absolute truth."*

### [1:20 - 2:05] NASA-ISRO NISAR L-Band Analysis
- **Action:** Scroll down to the **NISAR GCOV Time Series** card.
  1. Point to the badges: `NASA NISAR L-band`, `PROVISIONAL`, `CRID: P05023`, `Pol: HH`, `Single geometry (Ascending T141 F014)`.
  2. Click on threshold buttons (`-14 dB`, `-16 dB`, `-18 dB`) to show the interactive SVG curve update.
- **Spoken Words:**
  > *"Now let's look at NASA's newest flagship radar: NISAR. NISAR's L-band 24-centimetre wavelength penetrates deeper into vegetation than C-band.*  
  > *Using streaming range requests from Alaska Satellite Facility DAAC, we analyzed 10 NISAR passes over Hakaluki Haor across June to October 2026.*  
  > *In accordance with NASA guidelines, we prominently label this data as PROVISIONAL.*  
  > *Because the backscatter distribution is unimodal, no single threshold is scientifically justified. Instead, TerraPulse provides a full multi-threshold distribution curve across dates, explicitly stating that this is low-backscatter area, not a certified water map."*

### [2:05 - 2:40] "Chiku" Accessible Voice Guide
- **Action:** Scroll back to top. Click the **"Voice on"** button in the header bar. Then click **"Explain this view"**.
- **Spoken Words (Wait for Chiku to speak):**
  > *(Chiku speaks):* *"Sylhet Flood 2022. Sentinel-1 C-band backscatter change detection across the Sylhet Basin. Flooded Area: 37.19 square kilometres. Sensitivity analysis: headline result ranges from 30.85 to 44.01 square kilometres across threshold variation. This is a fixed default setting, not a value proven to be the best."*
- **Speaker Continuation:**
  > *"That voice is Chiku—our native, deterministic voice guide. Chiku runs 100% offline in your browser with zero cloud latency and zero hallucinations. It is specifically designed for accessibility and never claims an empirical threshold is 'best'."*

### [2:40 - 3:00] Scientific Honesty & Conclusion
- **Action:** Switch to Tab 3 (`/how-it-works#what-we-do-not-do`).
- **Spoken Words:**
  > *"Finally, we believe scientific integrity is as vital as code. Our 'What this project does not do' section makes our boundaries unambiguous: we do not forecast floods, we do not give evacuation advice, and our results are honest indicators, not ground-truth validated claims.*  
  > *TerraPulse is fully open source under the MIT License, ready for disaster researchers and communities worldwide. Thank you."*

---

## 3. 60-Second Lightning Demo Script

- **[0:00 - 0:15] Hook & Purpose:**
  - **Action:** Open `/explore?case=sylhet`. Drag the before/after slider once.
  - **Spoken Words:**
    > *"When severe storms hit, clouds block optical cameras. TerraPulse uses radar satellites that see through darkness and storms to detect surface disasters in real time without optical interference."*
- **[0:15 - 0:35] Core Innovation (Sentinel-1 + NISAR + WorldPop):**
  - **Action:** Scroll to Sylhet Exposure card, then NISAR card.
  - **Spoken Words:**
    > *"For the 2022 Sylhet flood, our deterministic pipeline detected 37.19 square kilometres of new floodwater and combined it with WorldPop 2020 data to estimate about 74,000 exposed residents.*  
    > *We also integrated provisional NASA-ISRO NISAR L-band data across 10 satellite passes over Hakaluki Haor, plotting multi-threshold distributions directly from ASF DAAC."*
- **[0:35 - 0:50] Chiku Voice Guide:**
  - **Action:** Click "Test voice" or point to Chiku audio toggle.
  - **Spoken Words:**
    > *"To ensure universal access, our offline voice guide Chiku explains radar findings aloud, always disclosing algorithm sensitivity ranges: 'This is a fixed default setting, not a value proven to be the best.'"*
- **[0:50 - 1:00] Conclusion:**
  - **Action:** Show footer / license badge.
  - **Spoken Words:**
    > *"TerraPulse is open source, scientifically honest, and accessible to everyone. Dancing with the SARs, grounded in reality. Thank you!"*

---

## 4. What NOT to Claim (Strict Scientific Guardrails)

During Q&A and demo delivery, strictly adhere to these rules:

1. **DO NOT claim forecasting or early warning:**
   - *Say:* "TerraPulse analyzes retrospective change between historical satellite passes."
   - *Do NOT say:* "TerraPulse predicts future floods or warns communities ahead of time."
2. **DO NOT claim tactical evacuation or casualty routing:**
   - *Say:* "These are demographic exposure estimates from static population rasters."
   - *Do NOT say:* "Emergency services can route boats or ambulances using these casualty counts."
3. **DO NOT claim NISAR is a validated water map:**
   - *Say:* "NISAR observations track low-backscatter area under provisional data status."
   - *Do NOT say:* "We mapped exact water levels with NISAR."
4. **DO NOT claim thresholds are 'best' or 'optimal':**
   - *Say:* "The default threshold is an established baseline shown with a ±2 dB sensitivity range."
   - *Do NOT say:* "We computed the optimal ground-truth threshold."

---

## 5. Live Presentation Fallback Plan

| Failure Scenario | Immediate Action | What to Say |
| :--- | :--- | :--- |
| **No Internet Connection** | Continue uninterrupted. All demo cases, images, NISAR charts, and demographic tables run 100% offline from local precomputed files. | *"TerraPulse is designed for offline disaster resilience. Everything you see runs locally on this device with zero external cloud calls."* |
| **Browser Speech Audio Fails (Muted / Headphone Jack)** | Point to the visual text bubble directly above the Chiku avatar and the status line. | *"Chiku's audio synthesis is mirrored in an always-visible text transcript, ensuring deaf and hard-of-hearing users receive identical explanations."* |
| **External AI API Fails / No Key** | The AI Insight card automatically displays the deterministic offline template with data-derived reliability notes. | *"Our AI architecture features a strict deterministic fallback: when API keys are absent or servers offline, verified algorithmic facts are displayed without LLM hallucination."* |
| **Display Projector Aspect Ratio Glitch** | The layout uses a 12-column responsive CSS grid with hairline borders that automatically stacks on narrow viewports. | *"The interface is fully responsive, optimized for both 4K command centers and low-bandwidth field laptops."* |

