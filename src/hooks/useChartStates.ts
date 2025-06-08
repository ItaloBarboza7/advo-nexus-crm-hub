
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
    setLeadsViewMode(view);
    setShowLeadsChart(true);
  };

  const handleContractsViewChange = (view: 'weekly' | 'monthly') => {
    setContractsViewMode(view);
    setShowContractsChart(true);
  };

  const handleOpportunitiesViewChange = (view: 'weekly' | 'monthly') => {
    setOpportunitiesViewMode(view);
    setShowOpportunitiesChart(true);
  };

  const resetChartStates = () => {
    setShowLeadsChart(false);
    setShowContractsChart(false);
    setShowOpportunitiesChart(false);
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
    resetChartStates
  };
}
