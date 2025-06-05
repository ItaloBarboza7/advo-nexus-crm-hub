
interface ChartTitleProps {
  selectedCategory: string;
  chartType: 'lossReasons' | 'actionTypes' | 'actionGroups' | 'states';
}

export const getChartTitle = ({ selectedCategory, chartType }: ChartTitleProps): string => {
  const mainCategory = selectedCategory.split('-')[0];
  const subCategory = selectedCategory.includes('-') ? selectedCategory.split('-')[1] : null;

  if (chartType === 'lossReasons') {
    return "Motivos de Perda";
  }

  if (chartType === 'actionTypes') {
    if (mainCategory === 'contratos') {
      return "Tipo de Ação - Novos Contratos";
    } else if (mainCategory === 'oportunidades') {
      return "Tipo de Ação - Oportunidades";
    } else if (selectedCategory === 'perdas-tipo-acao') {
      return "Tipo de Ação - Perdas";
    }
    return "Tipo de Ação";
  }

  if (chartType === 'actionGroups') {
    if (mainCategory === 'contratos') {
      return "Grupo de Ação - Novos Contratos";
    } else if (mainCategory === 'oportunidades') {
      return "Grupo de Ação - Oportunidades";
    }
    return "Grupo de Ação";
  }

  if (chartType === 'states') {
    if (mainCategory === 'contratos') {
      return "Estados - Novos Contratos";
    } else if (mainCategory === 'oportunidades') {
      return "Estados - Oportunidades";
    } else if (mainCategory === 'perdas') {
      return "Estados - Perdas";
    }
    return "Distribuição por Estados";
  }

  return "Análise de Dados";
};
