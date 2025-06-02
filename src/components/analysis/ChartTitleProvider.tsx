
interface ChartTitleProviderProps {
  selectedCategory: string;
  chartType: 'actionTypes' | 'lossReasons' | 'states';
}

export function getChartTitle({ selectedCategory, chartType }: ChartTitleProviderProps): string {
  const mainCategory = selectedCategory.split('-')[0];
  
  if (chartType === 'actionTypes') {
    switch (mainCategory) {
      case 'contratos':
        return 'Tipos de ação de novos contratos';
      case 'oportunidades':
        return 'Tipo de ação geradas em novas oportunidades';
      case 'perdas':
        return 'Tipos de ações perdidas';
      default:
        return 'Tipos de Ação';
    }
  }
  
  if (chartType === 'lossReasons') {
    return 'Motivos de Perda';
  }
  
  if (chartType === 'states') {
    return 'Distribuição por Estados';
  }
  
  return '';
}
