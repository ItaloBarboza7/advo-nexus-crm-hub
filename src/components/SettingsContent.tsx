import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Users, Building, Columns, UserPlus, Settings, CreditCard, X, Check, Eye, EyeOff } from "lucide-react";
import { AddMemberModal } from "@/components/AddMemberModal";
import { EditMemberModal } from "@/components/EditMemberModal";
import { AddColumnDialog } from "@/components/AddColumnDialog";
import { AddActionGroupDialog } from "@/components/AddActionGroupDialog";
import { AddActionTypeDialog } from "@/components/AddActionTypeDialog";
import { AddLeadSourceDialog } from "@/components/AddLeadSourceDialog";
import { AddLossReasonDialog } from "@/components/AddLossReasonDialog";
import { EditCompanyModal } from "@/components/EditCompanyModal";
import { DeleteButton } from "@/components/DeleteButton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { SubscriptionAndPaymentPanel } from "@/components/SubscriptionAndPaymentPanel";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

interface DashboardComponent {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("company");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [isAddActionGroupDialogOpen, setIsAddActionGroupDialogOpen] = useState(false);
  const [isAddActionTypeDialogOpen, setIsAddActionTypeDialogOpen] = useState(false);
  const [isAddLeadSourceDialogOpen, setIsAddLeadSourceDialogOpen] = useState(false);
  const [isAddLossReasonDialogOpen, setIsAddLossReasonDialogOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: "Maria Silva", email: "maria@empresa.com", role: "Atendimento - SDR", avatar: "MS" },
    { id: 2, name: "João Santos", email: "joao@empresa.com", role: "Fechamento - Closer", avatar: "JS" },
    { id: 3, name: "Ana Costa", email: "ana@empresa.com", role: "Atendimento - SDR", avatar: "AC" },
  ]);

  const isAdmin = true;

  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);

  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");

  const { components, updateComponentVisibility } = useDashboardSettings();
  const [tempDashboardComponents, setTempDashboardComponents] = useState<DashboardComponent[]>(components);

  useEffect(() => {
    setTempDashboardComponents(components);
  }, [components]);

  const handleTempToggleComponentVisibility = (componentId: string) => {
    setTempDashboardComponents(prev =>
      prev.map(comp =>
        comp.id === componentId ? { ...comp, visible: !comp.visible } : comp
      )
    );
  };

  const { toast } = useToast();

  const handleSaveDashboardSettings = () => {
    tempDashboardComponents.forEach(comp => {
      const old = components.find(c => c.id === comp.id);
      if (old && old.visible !== comp.visible) {
        updateComponentVisibility(comp.id, comp.visible);
      }
    });
    toast({
      title: "Configurações salvas",
      description: "As configurações do dashboard foram salvas com sucesso.",
    });
  };

  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Configurações do Dashboard</h3>
        <p className="text-sm text-gray-600">Gerencie a visibilidade dos componentes do dashboard</p>
      </div>

      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Componentes Disponíveis</h4>
        <div className="space-y-4">
          {tempDashboardComponents.map((component) => (
            <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h5 className="font-medium text-gray-900">{component.name}</h5>
                <p className="text-sm text-gray-600">{component.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${component.visible ? 'text-green-600' : 'text-gray-600'}`}>
                  {component.visible ? 'Visível' : 'Oculto'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTempToggleComponentVisibility(component.id)}
                >
                  {component.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveDashboardSettings}>
            Salvar Configurações
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie configurações do sistema, equipe e empresa</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.title}
            </Button>
          ))}
        </div>

        {activeTab === "dashboard" && renderDashboardTab()}
      </Card>

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={handleAddMember}
      />

      <EditMemberModal
        isOpen={isEditMemberModalOpen}
        onClose={() => setIsEditMemberModalOpen(false)}
        member={editingMember}
        onMemberUpdated={handleUpdateMember}
      />

      <AddColumnDialog
        isOpen={isAddColumnDialogOpen}
        onClose={() => setIsAddColumnDialogOpen(false)}
        onAddColumn={handleAddColumn}
        maxOrder={kanbanColumns.length > 0 ? Math.max(...kanbanColumns.map(col => col.order_position)) : 0}
      />

      <AddActionGroupDialog
        isOpen={isAddActionGroupDialogOpen}
        onClose={() => setIsAddActionGroupDialogOpen(false)}
        onGroupAdded={refreshData}
      />

      <AddActionTypeDialog
        isOpen={isAddActionTypeDialogOpen}
        onClose={() => setIsAddActionTypeDialogOpen(false)}
        onTypeAdded={refreshData}
        actionGroups={actionGroups}
      />

      <AddLeadSourceDialog
        isOpen={isAddLeadSourceDialogOpen}
        onClose={() => setIsAddLeadSourceDialogOpen(false)}
        onSourceAdded={refreshData}
      />

      <AddLossReasonDialog
        isOpen={isAddLossReasonDialogOpen}
        onClose={() => setIsAddLossReasonDialogOpen(false)}
        onReasonAdded={handleAddLossReasonFromDialog}
      />

      <EditCompanyModal
        isOpen={isEditCompanyModalOpen}
        onClose={() => setIsEditCompanyModalOpen(false)}
        companyInfo={companyInfo}
        onSave={updateCompanyInfo}
        isLoading={isLoadingCompany}
      />
    </div>
  );
}
