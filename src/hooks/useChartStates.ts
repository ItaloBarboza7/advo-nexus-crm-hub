
import { useState } from "react";

export function useChartStates() {
  // Estados separados para cada tipo de visualização
  const [leadsViewMode, setLeadsViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [contractsViewMode, setContractsViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [opportunitiesViewMode, setOpportunitiesViewMode] = useState<'weekly' | 'monthly'>('weekly');
  
  // Estados para controlar quando mostrar os gráficos
  const [showLeadsChart, setShowLeadsChart] = useState(false);
  const [showContractsChart, setShowContractsChart] = useState(false);
  const [showOpportunitiesChart, setShowOpportunitiesChart] = useState(false);

  // Handlers para mostrar gráficos quando o dropdown for usado
  const handleLeadsViewChange = (view: 'weekly' | 'monthly') => {
    console.log(`🔄 handleLeadsViewChange chamado com view: ${view}`);
    setLeadsViewMode(view);
    setShowLeadsChart(true);
    // Esconder outros gráficos quando leads for ativado
    setShowContractsChart(false);
    setShowOpportunitiesChart(false);
    console.log(`✅ showLeadsChart ativado, outros desativados`);
  };

  const handleContractsViewChange = (view: 'weekly' | 'monthly') => {
    console.log(`🔄 handleContractsViewChange chamado com view: ${view}`);
    setContractsViewMode(view);
    setShowContractsChart(true);
    // Esconder outros gráficos quando contratos for ativado
    setShowLeadsChart(false);
    setShowOpportunitiesChart(false);
    console.log(`✅ showContractsChart ativado, outros desativados`);
  };

  const handleOpportunitiesViewChange = (view: 'weekly' | 'monthly') => {
    console.log(`🔄 handleOpportunitiesViewChange chamado com view: ${view}`);
    setOpportunitiesViewMode(view);
    setShowOpportunitiesChart(true);
    // Esconder outros gráficos quando oportunidades for ativado
    setShowLeadsChart(false);
    setShowContractsChart(false);
    console.log(`✅ showOpportunitiesChart ativado, outros desativados`);
  };

  const resetChartStates = () => {
    console.log(`🔄 resetChartStates chamado - todos os gráficos serão desativados`);
    setShowLeadsChart(false);
    setShowContractsChart(false);
    setShowOpportunitiesChart(false);
  };

  const closeSpecificChart = (chartType: 'leads' | 'contracts' | 'opportunities') => {
    console.log(`🔄 closeSpecificChart chamado para: ${chartType}`);
    switch (chartType) {
      case 'leads':
        setShowLeadsChart(false);
        break;
      case 'contracts':
        setShowContractsChart(false);
        break;
      case 'opportunities':
        setShowOpportunitiesChart(false);
        break;
    }
  };

  return {
    leadsViewMode,
    contractsViewMode,
    opportunitiesViewMode,
    showLeadsChart,
    showContractsChart,
    showOpportunitiesChart,
    handleLeadsViewChange,
    handleContractsViewChange,
    handleOpportunitiesViewChange,
    resetChartStates,
    closeSpecificChart
  };
}
