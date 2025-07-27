
import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useLossReasonsGlobal } from "@/hooks/useLossReasonsGlobal";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { useTenantLeadOperations } from "@/hooks/useTenantLeadOperations";
import { supabase } from "@/integrations/supabase/client";

interface EditLeadFormProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: () => void;
}

const BRAZILIAN_STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
  "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
  "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
  "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
  "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
];

export function EditLeadForm({ lead, open, onOpenChange, onLeadUpdated }: EditLeadFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
    source: "",
    status: "",
    action_group: "",
    action_type: "",
    value: "",
    description: "",
    loss_reason: "",
  });
  
  const [originalLeadData, setOriginalLeadData] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  
  const { toast } = useToast();
  
  // Memoizar os hooks para evitar re-execução desnecessária
  const { 
    sourceOptions, 
    actionGroupOptions, 
    getActionTypeOptions, 
    actionGroups,
    loading: optionsLoading,
    refreshData 
  } = useFilterOptions();
  
  const { lossReasons, addLossReason } = useLossReasonsGlobal();
  
  // Carregar colunas do Kanban apenas uma vez quando o modal abre
  const { columns: kanbanColumns, isLoading: kanbanLoading } = useKanbanColumns();
  
  const { updateLead } = useTenantLeadOperations();

  // Memoizar as colunas do Kanban para evitar re-renderizações
  const memoizedKanbanColumns = useMemo(() => kanbanColumns, [kanbanColumns]);

  // Inicializar dados apenas quando o modal abrir com um lead válido
  useEffect(() => {
    if (lead && open && !optionsLoading && !kanbanLoading && !isDataInitialized) {
      console.log("🔄 EditLeadForm - Inicializando dados do lead:", lead.name);
      
      setOriginalLeadData(lead);
      
      let initialLossReason = lead.loss_reason ?? "";
      if (
        !initialLossReason ||
        initialLossReason.trim().toLowerCase() === "outros" ||
        initialLossReason.trim() === ""
      ) {
        initialLossReason = "Outros";
      }

      const initialData = {
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        state: lead.state || "",
        source: lead.source || "",
        status: lead.status || "",
        action_group: lead.action_group || "",
        action_type: lead.action_type || "",
        value: lead.value?.toString() || "",
        description: lead.description || "",
        loss_reason: initialLossReason,
      };

      setFormData(initialData);
      setIsDataInitialized(true);
    }
  }, [lead, open, optionsLoading, kanbanLoading, isDataInitialized]);

  // Reset quando o modal fechar
  useEffect(() => {
    if (!open) {
      console.log("❌ EditLeadForm - Modal fechado, resetando estados...");
      setIsDataInitialized(false);
      setShowNewOptionInput(null);
      setNewOptionValue("");
      setFormData({
        name: "",
        email: "",
        phone: "",
        state: "",
        source: "",
        status: "",
        action_group: "",
        action_type: "",
        value: "",
        description: "",
        loss_reason: "",
      });
    }
  }, [open]);

  const restoreOriginalData = () => {
    if (originalLeadData) {
      const restoredData = {
        name: originalLeadData.name || "",
        email: originalLeadData.email || "",
        phone: originalLeadData.phone || "",
        state: originalLeadData.state || "",
        source: originalLeadData.source || "",
        status: originalLeadData.status || "",
        action_group: originalLeadData.action_group || "",
        action_type: originalLeadData.action_type || "",
        value: originalLeadData.value?.toString() || "",
        description: originalLeadData.description || "",
        loss_reason: originalLeadData.loss_reason || "",
      };
      
      console.log("🔄 EditLeadForm - Restaurando dados originais:", restoredData);
      setFormData(restoredData);
    }
  };

  const handleClose = () => {
    console.log("❌ EditLeadForm - Fechando modal sem salvar");
    restoreOriginalData();
    setShowNewOptionInput(null);
    setNewOptionValue("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    console.log("💾 EditLeadForm - Salvando lead com dados:", formData);

    setIsLoading(true);
    try {
      const success = await updateLead(lead.id, {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        state: formData.state || null,
        source: formData.source || null,
        status: formData.status,
        action_group: formData.action_group || null,
        action_type: formData.action_type || null,
        value: formData.value ? parseFloat(formData.value) : null,
        description: formData.description || null,
        loss_reason: formData.loss_reason || null,
      });

      if (success) {
        console.log("✅ EditLeadForm - Lead atualizado com sucesso");
        toast({
          title: "Sucesso",
          description: "Lead atualizado com sucesso.",
        });
        onLeadUpdated();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Otimizar a função de mudança de input para evitar re-renderizações desnecessárias
  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 EditLeadForm - Alterando ${field} para:`, value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Limpar action_type quando action_group mudar
      if (field === 'action_group') {
        newData.action_type = "";
      }
      
      return newData;
    });
  };

  const handleAddNewOption = async (field: string) => {
    if (!newOptionValue.trim()) return;

    if (field === 'source') {
      try {
        const { error } = await supabase
          .from('lead_sources')
          .insert([
            {
              name: newOptionValue.toLowerCase().replace(/\s+/g, '-'),
              label: newOptionValue.trim()
            }
          ]);

        if (error) {
          console.error('Erro ao adicionar fonte:', error);
          toast({
            title: "Erro",
            description: "Não foi possível adicionar a nova fonte.",
            variant: "destructive"
          });
          return;
        }

        await refreshData();
        handleInputChange(field, newOptionValue.toLowerCase().replace(/\s+/g, '-'));
        
        toast({
          title: "Sucesso",
          description: "Nova fonte adicionada com sucesso.",
        });
      } catch (error) {
        console.error('Erro inesperado ao adicionar fonte:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
        return;
      }
    } else if (field === 'action_group') {
      try {
        const { error } = await supabase
          .from('action_groups')
          .insert([
            {
              name: newOptionValue.toLowerCase().replace(/\s+/g, '-'),
              description: newOptionValue.trim()
            }
          ]);

        if (error) {
          console.error('Erro ao adicionar grupo de ação:', error);
          toast({
            title: "Erro",
            description: "Não foi possível adicionar o novo grupo.",
            variant: "destructive"
          });
          return;
        }

        await refreshData();
        handleInputChange(field, newOptionValue.toLowerCase().replace(/\s+/g, '-'));
        
        toast({
          title: "Sucesso",
          description: "Novo grupo de ação adicionado com sucesso.",
        });
      } catch (error) {
        console.error('Erro inesperado ao adicionar grupo:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
        return;
      }
    } else if (field === 'action_type') {
      try {
        const actionGroup = actionGroups.find(group => group.name === formData.action_group);
        if (!actionGroup) {
          toast({
            title: "Erro",
            description: "Selecione um grupo de ação primeiro.",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('action_types')
          .insert([
            {
              name: newOptionValue.toLowerCase().replace(/\s+/g, '-'),
              action_group_id: actionGroup.id
            }
          ]);

        if (error) {
          console.error('Erro ao adicionar tipo de ação:', error);
          toast({
            title: "Erro",
            description: "Não foi possível adicionar o novo tipo.",
            variant: "destructive"
          });
          return;
        }

        await refreshData();
        handleInputChange(field, newOptionValue.toLowerCase().replace(/\s+/g, '-'));
        
        toast({
          title: "Sucesso",
          description: "Novo tipo de ação adicionado com sucesso.",
        });
      } catch (error) {
        console.error('Erro inesperado ao adicionar tipo:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
        return;
      }
    } else if (field === 'loss_reason') {
      const success = await addLossReason(newOptionValue.trim());
      
      if (success) {
        handleInputChange(field, newOptionValue.trim());
        toast({
          title: "Sucesso",
          description: "Novo motivo de perda adicionado com sucesso.",
        });
      }
    }

    setNewOptionValue("");
    setShowNewOptionInput(null);
  };

  if (!lead) return null;

  // Mostrar loading apenas durante a inicialização
  if (optionsLoading || kanbanLoading || !isDataInitialized) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lead - {lead.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead - {lead.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="state">Estado</Label>
              <div className="flex gap-2">
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg max-h-60 overflow-y-auto z-50">
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="source">Fonte</Label>
              <div className="flex gap-2">
                <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg max-h-60 overflow-y-auto z-50">
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewOptionInput('source')}
                  className="px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {showNewOptionInput === 'source' && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50">
                  <div className="space-y-3">
                    <Input
                      placeholder="Nova fonte..."
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('source')}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewOptionInput(null);
                          setNewOptionValue("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewOption('source')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg z-50">
                  {memoizedKanbanColumns.map((column) => (
                    <SelectItem key={column.id} value={column.name}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="action_group">Grupo de Ação</Label>
              <div className="flex gap-2">
                <Select value={formData.action_group} onValueChange={(value) => handleInputChange('action_group', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o grupo de ação" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg max-h-60 overflow-y-auto z-50">
                    {actionGroupOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewOptionInput('action_group')}
                  className="px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {showNewOptionInput === 'action_group' && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50">
                  <div className="space-y-3">
                    <Input
                      placeholder="Novo grupo de ação..."
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('action_group')}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewOptionInput(null);
                          setNewOptionValue("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewOption('action_group')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {formData.action_group && (
              <div className="space-y-2 relative">
                <Label htmlFor="action_type">Tipo de Ação</Label>
                <div className="flex gap-2">
                  <Select value={formData.action_type} onValueChange={(value) => handleInputChange('action_type', value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o tipo específico" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg max-h-60 overflow-y-auto z-50">
                      {getActionTypeOptions(formData.action_group).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewOptionInput('action_type')}
                    className="px-2"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showNewOptionInput === 'action_type' && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50">
                    <div className="space-y-3">
                      <Input
                        placeholder="Novo tipo de ação..."
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('action_type')}
                        className="text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowNewOptionInput(null);
                            setNewOptionValue("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddNewOption('action_type')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="value">Valor Potencial (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
              />
            </div>
          </div>

          {formData.status === "Perdido" && (
            <div className="space-y-2 relative">
              <Label htmlFor="loss_reason">Motivo da Perda</Label>
              <div className="flex gap-2">
                <Select value={formData.loss_reason} onValueChange={(value) => handleInputChange('loss_reason', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o motivo da perda" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg max-h-60 overflow-y-auto z-50">
                    {lossReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.reason}>
                        {reason.reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewOptionInput('loss_reason')}
                  className="px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {showNewOptionInput === 'loss_reason' && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50">
                  <div className="space-y-3">
                    <Input
                      placeholder="Novo motivo da perda..."
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('loss_reason')}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewOptionInput(null);
                          setNewOptionValue("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewOption('loss_reason')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Adicione uma descrição para este lead..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
