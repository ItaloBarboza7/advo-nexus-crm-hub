
import { useState, useEffect } from 'react';

export interface DashboardComponent {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

const defaultComponents: DashboardComponent[] = [
  {
    id: 'stats-cards',
    name: 'Cards de Estatísticas',
    description: 'Exibe leads, propostas/reuniões, perdas e vendas',
    visible: true
  },
  {
    id: 'conversion-chart',
    name: 'Gráfico de Conversão',
    description: 'Taxa de conversão por dia/mês',
    visible: true
  },
  {
    id: 'conversion-rate',
    name: 'Taxa de Conversão Central',
    description: 'Painel central com métricas de conversão',
    visible: true
  },
  {
    id: 'leads-chart',
    name: 'Gráfico de Novos Leads',
    description: 'Leads novos por dia/mês',
    visible: true
  },
  {
    id: 'team-results',
    name: 'Resultado do Time',
    description: 'Performance individual dos membros da equipe',
    visible: true
  },
  {
    id: 'action-chart',
    name: 'Gráfico de Oportunidades por Ação',
    description: 'Oportunidades por tipo/grupo de ação',
    visible: true
  }
];

const STORAGE_KEY = 'dashboard-settings';

export const useDashboardSettings = () => {
  const [components, setComponents] = useState<DashboardComponent[]>(defaultComponents);
  const [tempComponents, setTempComponents] = useState<DashboardComponent[]>(defaultComponents);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedComponents = JSON.parse(saved);
        setComponents(savedComponents);
        setTempComponents(savedComponents);
      } catch (error) {
        console.error('Erro ao carregar configurações do dashboard:', error);
      }
    }
  }, []);

  const updateTempComponentVisibility = (componentId: string, visible: boolean) => {
    const updatedComponents = tempComponents.map(comp =>
      comp.id === componentId ? { ...comp, visible } : comp
    );
    setTempComponents(updatedComponents);
  };

  const toggleTempComponentVisibility = (componentId: string) => {
    const component = tempComponents.find(comp => comp.id === componentId);
    if (component) {
      updateTempComponentVisibility(componentId, !component.visible);
    }
  };

  const saveDashboardSettings = () => {
    setComponents(tempComponents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempComponents));
  };

  const resetTempSettings = () => {
    setTempComponents(components);
  };

  // Manter compatibilidade com código existente
  const updateComponentVisibility = (componentId: string, visible: boolean) => {
    updateTempComponentVisibility(componentId, visible);
  };

  const toggleComponentVisibility = (componentId: string) => {
    toggleTempComponentVisibility(componentId);
  };

  return {
    components: tempComponents, // Usar tempComponents para mostrar na interface
    actualComponents: components, // Componentes realmente salvos
    updateComponentVisibility,
    toggleComponentVisibility,
    saveDashboardSettings,
    resetTempSettings
  };
};
