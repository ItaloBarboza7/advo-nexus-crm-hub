
import { useState, useEffect } from 'react';

interface ChartPreferences {
  chartType: 'bar' | 'pie';
}

export function useChartPreferences(key: string) {
  const [preferences, setPreferences] = useState<ChartPreferences>(() => {
    try {
      const saved = localStorage.getItem(`chart-preferences-${key}`);
      return saved ? JSON.parse(saved) : { chartType: 'bar' };
    } catch {
      return { chartType: 'bar' };
    }
  });

  const updateChartType = (chartType: 'bar' | 'pie') => {
    const newPreferences = { ...preferences, chartType };
    setPreferences(newPreferences);
    localStorage.setItem(`chart-preferences-${key}`, JSON.stringify(newPreferences));
  };

  return {
    chartType: preferences.chartType,
    updateChartType
  };
}
