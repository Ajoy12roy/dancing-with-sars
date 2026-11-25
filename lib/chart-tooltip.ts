/**
 * lib/chart-tooltip.ts
 *
 * Shared Recharts tooltip style helper using CSS variables so tooltip text,
 * item rows, and labels remain high-contrast in both light and dark themes.
 */

export interface CategoryTooltipStyles {
  contentStyle: {
    backgroundColor: string;
    border: string;
    borderRadius: string;
    fontFamily: string;
    fontSize: string;
    color: string;
    boxShadow: string;
  };
  itemStyle: {
    color: string;
  };
  labelStyle: {
    color: string;
    fontWeight: number;
  };
  wrapperStyle: {
    outline: string;
  };
}

/**
 * Returns Recharts <Tooltip> style props bound to CSS design tokens.
 */
export function getCategoryTooltipStyles(): CategoryTooltipStyles {
  return {
    contentStyle: {
      backgroundColor: 'var(--color-surface-2)',
      border: '1px solid var(--color-hairline)',
      borderRadius: '2px',
      fontFamily: 'var(--font-data)',
      fontSize: '12px',
      color: 'var(--color-ink)',
      boxShadow: 'none',
    },
    itemStyle: {
      color: 'var(--color-ink)',
    },
    labelStyle: {
      color: 'var(--color-ink)',
      fontWeight: 600,
    },
    wrapperStyle: {
      outline: 'none',
    },
  };
}
