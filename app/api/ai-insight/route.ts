import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FALLBACK_INSIGHTS } from '@/constants';

export async function POST(request: NextRequest) {
  let aoiId = 'default';
  
  try {
    const body = await request.json();
    const { percentChanged, affectedAreaKm2, confidence, aoiName } = body;
    aoiId = body.aoiId || 'default';

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No API key provided');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `
You are an expert remote sensing analyst explaining SAR (Synthetic Aperture Radar) change detection results to a general audience.
The following numbers have ALREADY been computed by our system. Your job is ONLY to explain them in plain language in 2-3 sentences.
DO NOT invent, estimate, or alter any numbers. DO NOT add any extra information outside of explaining these stats.

Area of Interest: ${aoiName || 'Unknown'}
Percentage of Area Changed: ${percentChanged}%
Affected Area: ${affectedAreaKm2} km²
Confidence Level: ${confidence}%

Provide a clear, accessible 2-3 sentence explanation of what these changes mean on the ground.
`;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text();

    return NextResponse.json({
      explanation: explanation.trim(),
      usedFallback: false,
    });
  } catch (error) {
    console.error('AI Insight Error:', error);
    
    return NextResponse.json({
      explanation: FALLBACK_INSIGHTS[aoiId] || FALLBACK_INSIGHTS['default'],
      usedFallback: true,
    });
  }
}
