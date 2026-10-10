'use client';

import { useEffect, useState } from 'react';
import { ChartDataPoint } from '@/hooks/useChangeData';
import dynamic from 'next/dynamic';

const StatsChart = dynamic(() => import('./StatsChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-(--color-paper-warm) border border-(--color-hairline)">
      <div className="animate-pulse text-(--color-text-secondary) font-data text-sm">
        Loading chart...
      </div>
    </div>
  ),
});

interface StatsPanelProps {
  percentChanged: number;
  affectedAreaKm2: number;
  confidence: number;
  chartData: ChartDataPoint[];
}

const AnimatedCounter = ({ value, suffix = '', decimals = 1 }: { value: number, suffix?: string, decimals?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1500; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(start + (end - start) * easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{count.toFixed(decimals)}{suffix}</span>;
};

export default function StatsPanel({
  percentChanged,
  affectedAreaKm2,
  confidence,
  chartData
}: StatsPanelProps) {
  return (
    <div className="bg-(--color-paper) p-6 h-full flex flex-col gap-6 border border-(--color-hairline) rounded-none">
      <h3 className="text-xl font-bold border-b border-(--color-hairline) pb-2 text-(--color-ink)">Analysis Results</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-(--color-hairline) p-4 rounded-none flex flex-col items-center justify-center text-center">
          <span className="text-(--color-text-secondary) text-sm uppercase tracking-wider mb-1 font-bold">Percent Changed</span>
          <span className="text-3xl font-data text-(--color-teal)">
            <AnimatedCounter value={percentChanged} suffix="%" />
          </span>
        </div>

        <div className="border border-(--color-hairline) p-4 rounded-none flex flex-col items-center justify-center text-center">
          <span className="text-(--color-text-secondary) text-sm uppercase tracking-wider mb-1 font-bold">Affected Area</span>
          <span className="text-3xl font-data text-(--color-teal)">
            <AnimatedCounter value={affectedAreaKm2} suffix=" km²" />
          </span>
        </div>

        <div className="border border-(--color-hairline) p-4 rounded-none flex flex-col items-center justify-center text-center">
          <span className="text-(--color-text-secondary) text-sm uppercase tracking-wider mb-1 font-bold">AI Confidence</span>
          <span className="text-3xl font-data text-(--color-teal)">
            <AnimatedCounter value={confidence} suffix="%" />
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-62.5 border border-(--color-hairline) p-4 rounded-none">
        <h4 className="text-sm text-(--color-text-secondary) uppercase tracking-wider mb-4 text-center font-bold">Class Area Change</h4>
        <StatsChart data={chartData} />
      </div>
    </div>
  );
}
