import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanySettings } from "@/components/CompanySettings";
import { DashboardSettings } from "@/components/DashboardSettings";
import { TeamSettings } from "@/components/TeamSettings";
import { KanbanSettings } from "@/components/KanbanSettings";
import { GeneralSettings } from "@/components/GeneralSettings";

type Tab = 'company' | 'dashboard' | 'team' | 'kanban' | 'settings';

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState<Tab>('company');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie configurações do sistema, equipe e empresa</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        <Button
          variant={activeTab === 'company' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('company')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Empresa
        </Button>
        <Button
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('dashboard')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Dashboard
        </Button>
        <Button
          variant={activeTab === 'team' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('team')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Equipe
        </Button>
        <Button
          variant={activeTab === 'kanban' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('kanban')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Quadro Kanban
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Ações
        </Button>
      </div>

      {activeTab === 'company' && <CompanySettings />}
      {activeTab === 'dashboard' && <DashboardSettings />}
      {activeTab === 'team' && <TeamSettings />}
      {activeTab === 'kanban' && <KanbanSettings />}
      {activeTab === 'settings' && <GeneralSettings />}
    </div>
  );
}
