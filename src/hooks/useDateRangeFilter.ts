
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export interface FilterableByDate {
  created_at: string;
  updated_at?: string;
}

export function useDateRangeFilter<T extends FilterableByDate>(
  data: T[],
  dateField: keyof T = 'created_at'
) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange | undefined>();

  const filteredData = useMemo(() => {
    if (!appliedDateRange?.from || !appliedDateRange?.to) {
      return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField] as string);
      return itemDate >= appliedDateRange.from! && itemDate <= appliedDateRange.to!;
    });
  }, [data, appliedDateRange, dateField]);

  const handleDateRangeApply = (range: DateRange | undefined) => {
    console.log("📅 useDateRangeFilter - Aplicando filtro de período:", range);
    setAppliedDateRange(range);
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    setAppliedDateRange(undefined);
  };

  const getDisplayTitle = (baseTitle: string) => {
    if (appliedDateRange?.from && appliedDateRange?.to) {
      return `${baseTitle} - Período: ${appliedDateRange.from.toLocaleDateString('pt-BR')} a ${appliedDateRange.to.toLocaleDateString('pt-BR')}`;
    }
    return baseTitle;
  };

  return {
    dateRange,
    setDateRange,
    appliedDateRange,
    filteredData,
    handleDateRangeApply,
    clearDateRange,
    getDisplayTitle,
    hasActiveFilter: !!(appliedDateRange?.from && appliedDateRange?.to)
  };
}
