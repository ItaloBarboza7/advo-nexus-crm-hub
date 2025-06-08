
import { useState, useEffect } from "react";
import { DashboardVisibilitySettings } from "@/components/settings/DashboardSettings";

const DASHBOARD_SETTINGS_KEY = 'dashboard-visibility-settings';

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardVisibilitySettings>({
    showStatsCards: true,
    showConversionChart: true,
    showConversionRate: true,
    showLeadsChart: true,
    showTeamResults: true,
    showActionChart: true,
  });

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(DASHBOARD_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Erro ao carregar configurações do dashboard:', error);
      }
    }
  }, []);

  // Salvar configurações no localStorage
  const updateSettings = (newSettings: DashboardVisibilitySettings) => {
    setSettings(newSettings);
    localStorage.setItem(DASHBOARD_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings,
  };
}
