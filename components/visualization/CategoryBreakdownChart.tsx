'use client';

import { useMemo, useState, useEffect } from 'react';
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

export interface ChartItem {
  name: string;
  areaKm2: number;
  color?: string;
  kind?: string;
}

interface CategoryBreakdownChartProps {
  categories?: ResultCategory[];
  items?: ChartItem[];
}

export default function CategoryBreakdownChart({
  categories,
  items: propItems,
}: CategoryBreakdownChartProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const gainColor = isDark ? '#19E66F' : '#2C5C61';
  const lossColor = isDark ? '#FF5A47' : '#A8462E';
  const neutralColor = isDark ? '#8F99A3' : '#7D8A92';

  // Build chart items derived directly from result.categories (areaKm2 per category), or use memoized propItems
  const derivedItems = useMemo(() => {
    if (propItems) {
      return propItems.map((item) => {
        const isLoss =
          item.kind === 'loss' ||
          item.name.toLowerCase().includes('loss') ||
          item.name.toLowerCase().includes('erosion') ||
          item.name.toLowerCase().includes('flood') ||
          item.color === '#A8462E' ||
          item.color === '#FF5A47';
        const isGain =
          item.kind === 'gain' ||
          item.name.toLowerCase().includes('gain') ||
          item.name.toLowerCase().includes('accretion') ||
          item.color === '#2C5C61' ||
          item.color === '#19E66F';

        return {
          ...item,
          color: isLoss ? lossColor : isGain ? gainColor : neutralColor,
        };
      });
    }

    if (!categories || categories.length === 0) return [];

    return categories.map((cat) => {
      const isLoss =
        cat.kind === 'loss' ||
        cat.id.includes('loss') ||
        cat.id.includes('erosion') ||
        cat.id.includes('flooded');
      const isGain =
        cat.kind === 'gain' ||
        cat.id.includes('gain') ||
        cat.id.includes('accretion');

      const color = isLoss ? lossColor : isGain ? gainColor : neutralColor;

      return {
        name: cat.label || cat.id,
        areaKm2: Number(cat.areaKm2.toFixed(2)),
        color,
        kind: cat.kind,
      };
    });
  }, [categories, propItems, gainColor, lossColor, neutralColor]);

  const items = derivedItems;

  if (items.length === 0) {
    return (
      <div className="w-full h-full min-h-40 flex items-center justify-center text-xs font-data text-text-secondary border border-dashed border-hairline p-4">
        No categorical breakdown data available for this scene
      </div>
    );
  }

  const axisStroke = isDark ? '#1F2A38' : '#C7C4BC';
  const tickText = isDark ? '#8F99A3' : '#4A4E52';
  const yTickText = isDark ? '#E8EDF2' : '#1D2023';
  const gridStroke = isDark ? '#1F2A38' : '#C7C4BC';
  const tooltipBg = isDark ? '#0E131B' : '#F1F0EC';
  const tooltipBorder = isDark ? '#1F2A38' : '#C7C4BC';
  const tooltipText = isDark ? '#E8EDF2' : '#1D2023';

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <BarChart
        layout="vertical"
        data={items}
        margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
        <XAxis
          type="number"
          stroke={axisStroke}
          tick={{
            fill: tickText,
            fontSize: 11,
            fontFamily: 'var(--font-data)',
          }}
          axisLine={{ stroke: axisStroke }}
          tickLine={false}
          unit=" km²"
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={axisStroke}
          tick={{
            fill: yTickText,
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
          }}
          axisLine={{ stroke: axisStroke }}
          tickLine={false}
          width={130}
        />
        <Tooltip
          cursor={{ fill: axisStroke, opacity: 0.2 }}
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '2px',
            fontFamily: 'var(--font-data)',
            fontSize: '12px',
            color: tooltipText,
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
