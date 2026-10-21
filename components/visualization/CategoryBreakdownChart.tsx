'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ResultCategory } from '@/types';

interface CategoryBreakdownChartProps {
  categories?: ResultCategory[];
}

export default function CategoryBreakdownChart({
  categories,
}: CategoryBreakdownChartProps) {
  // Build chart items derived directly from result.categories (areaKm2 per category)
  const items =
    categories && categories.length > 0
      ? categories.map((cat) => {
          const isLoss =
            cat.kind === 'loss' ||
            cat.id.includes('loss') ||
            cat.id.includes('erosion') ||
            cat.id.includes('flooded');
          const isGain =
            cat.kind === 'gain' ||
            cat.id.includes('gain') ||
            cat.id.includes('accretion');

          // Bar colors by kind:
          // loss & hazard = #A8462E, gain = #2C5C61, persistent & other = #7D8A92 (neutral token)
          const color = isLoss ? '#A8462E' : isGain ? '#2C5C61' : '#7D8A92';

          return {
            name: cat.label || cat.id,
            areaKm2: Number(cat.areaKm2.toFixed(2)),
            color,
            kind: cat.kind,
          };
        })
      : [];

  if (items.length === 0) {
    return (
      <div className="w-full h-full min-h-40 flex items-center justify-center text-xs font-data text-(--color-text-secondary) border border-dashed border-(--color-hairline) p-4">
        No categorical breakdown data available for this scene
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <BarChart
        layout="vertical"
        data={items}
        margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--color-ink)"
          tick={{
            fill: 'var(--color-text-secondary)',
            fontSize: 11,
            fontFamily: 'var(--font-data)',
          }}
          axisLine={{ stroke: 'var(--color-hairline)' }}
          tickLine={false}
          unit=" km²"
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--color-ink)"
          tick={{
            fill: 'var(--color-ink)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
          }}
          axisLine={{ stroke: 'var(--color-hairline)' }}
          tickLine={false}
          width={130}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-hairline)', opacity: 0.2 }}
          contentStyle={{
            backgroundColor: 'var(--color-paper)',
            border: '1px solid var(--color-hairline)',
            borderRadius: '2px',
            fontFamily: 'var(--font-data)',
            fontSize: '12px',
            color: 'var(--color-ink)',
            boxShadow: 'none',
          }}
          formatter={(val: unknown) => [`${Number(val).toFixed(2)} km²`, 'Area']}
        />
        <Bar dataKey="areaKm2" radius={[0, 2, 2, 0]}>
          {items.map((entry, index) => (
            <Cell key={`bar-cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
