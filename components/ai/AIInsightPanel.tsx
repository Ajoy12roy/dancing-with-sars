import { useState, useEffect } from 'react';

interface AIInsightPanelProps {
  percentChanged: number;
  affectedAreaKm2: number;
  confidence: number;
  aoiName: string;
  aoiId: string;
}

export function AIInsightPanel({ percentChanged, affectedAreaKm2, confidence, aoiName, aoiId }: AIInsightPanelProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchInsight = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            percentChanged,
            affectedAreaKm2,
            confidence,
            aoiName,
            aoiId
          })
        });
        
        const result = await response.json();
        if (isMounted) {
          setExplanation(result.explanation);
          setUsedFallback(result.usedFallback);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch AI insight', err);
        if (isMounted) {
          setExplanation('The radar data shows notable structural changes in this area over the selected time period. These variations in backscatter typically indicate shifts in land cover, such as flooding, deforestation, or urban development.');
          setUsedFallback(true);
          setLoading(false);
        }
      }
    };
    
    fetchInsight();
    
    return () => { isMounted = false; };
  }, [percentChanged, affectedAreaKm2, confidence, aoiName, aoiId]);

  return (
    <div className="w-full border border-(--color-hairline) bg-(--color-paper) p-6 rounded-[2px]">
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm text-(--color-text-secondary) font-sans">
          AI-generated explanation of the computed results
        </span>
        {usedFallback && (
          <span className="text-sm text-(--color-text-secondary) font-sans italic">
            offline mode
          </span>
        )}
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-(--color-hairline) rounded-none w-full"></div>
          <div className="h-4 bg-(--color-hairline) rounded-none w-5/6"></div>
          <div className="h-4 bg-(--color-hairline) rounded-none w-4/6"></div>
        </div>
      ) : (
        <p className="text-base text-(--color-ink) font-sans leading-relaxed">
          {explanation}
        </p>
      )}
    </div>
  );
}
