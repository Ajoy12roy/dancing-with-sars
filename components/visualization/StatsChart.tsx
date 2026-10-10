'use client';


import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ChartDataPoint } from '@/hooks/useChangeData';

interface StatsChartProps {
  data: ChartDataPoint[];
}

export default function StatsChart({ data }: StatsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
        <XAxis dataKey="category" stroke="var(--color-ink)" tick={{fill: 'var(--color-ink)', fontSize: 12, fontFamily: 'var(--font-data)'}} axisLine={false} tickLine={false} />
        <YAxis stroke="var(--color-ink)" tick={{fill: 'var(--color-ink)', fontSize: 12, fontFamily: 'var(--font-data)'}} axisLine={false} tickLine={false} />
        <Tooltip 
          cursor={{fill: 'var(--color-hairline)', opacity: 0.4}}
          contentStyle={{ backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-hairline)', borderRadius: '0px', color: 'var(--color-ink)' }}
          itemStyle={{ color: 'var(--color-ink)' }}
        />
        <Bar dataKey="value" radius={[0, 0, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'var(--color-teal)' : 'var(--color-rust)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
