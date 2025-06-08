
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, BarChart3, LineChart, TrendingUp, Users, Target } from "lucide-react";

interface DashboardSettingsProps {
  onSettingsChange?: (settings: DashboardVisibilitySettings) => void;
}

export interface DashboardVisibilitySettings {
  showStatsCards: boolean;
  showConversionChart: boolean;
  showConversionRate: boolean;
  showLeadsChart: boolean;
  showTeamResults: boolean;
  showActionChart: boolean;
}

export function DashboardSettings({ onSettingsChange }: DashboardSettingsProps) {
  const [settings, setSettings] = useState<DashboardVisibilitySettings>({
    showStatsCards: true,
    showConversionChart: true,
    showConversionRate: true,
    showLeadsChart: true,
    showTeamResults: true,
    showActionChart: true,
  });

  const handleSettingChange = (key: keyof DashboardVisibilitySettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const dashboardComponents = [
    {
      key: 'showStatsCards' as keyof DashboardVisibilitySettings,
      title: 'Cards de Estatísticas',
      description: 'Leads, Propostas/Reuniões, Perdas, Vendas',
      icon: TrendingUp,
    },
    {
      key: 'showConversionChart' as keyof DashboardVisibilitySettings,
      title: 'Gráfico de Conversão',
      description: 'Conversão por Dia da Semana/Mês',
      icon: LineChart,
    },
    {
      key: 'showConversionRate' as keyof DashboardVisibilitySettings,
      title: 'Taxa de Conversão Central',
      description: 'Painel central com taxa geral de conversão',
      icon: Target,
    },
    {
      key: 'showLeadsChart' as keyof DashboardVisibilitySettings,
      title: 'Gráfico de Leads Novos',
      description: 'Leads Novos por Dia da Semana/Mês',
      icon: Users,
    },
    {
      key: 'showTeamResults' as keyof DashboardVisibilitySettings,
      title: 'Resultado do Time',
      description: 'Performance individual dos membros',
      icon: Users,
    },
    {
      key: 'showActionChart' as keyof DashboardVisibilitySettings,
      title: 'Gráfico de Oportunidades por Ação',
      description: 'Oportunidades por Tipo/Grupo de Ação',
      icon: BarChart3,
    },
  ];

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-6">
        <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
          <Settings className="h-6 w-6 text-blue-600" />
          Configurações do Dashboard
        </CardTitle>
        <p className="text-gray-600 text-sm">
          Configure a visibilidade dos componentes do dashboard
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-6">
          {dashboardComponents.map((component) => (
            <div key={component.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <component.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor={component.key} className="text-base font-medium text-gray-900 cursor-pointer">
                    {component.title}
                  </Label>
                  <p className="text-sm text-gray-600">{component.description}</p>
                </div>
              </div>
              <Switch
                id={component.key}
                checked={settings[component.key]}
                onCheckedChange={(checked) => handleSettingChange(component.key, checked)}
              />
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Informação</p>
              <p className="text-sm text-blue-700">
                As alterações de visibilidade serão aplicadas imediatamente no dashboard. 
                Você pode sempre reativar os componentes quando necessário.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
