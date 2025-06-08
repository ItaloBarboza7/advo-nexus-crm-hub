import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface EditLeadFormProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: () => void;
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
}

const BRAZILIAN_STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
  "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
  "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
  "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
  "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
];

const DEFAULT_SOURCES = [
  "website", "google-ads", "facebook", "linkedin", "indicacao", "evento", "telefone", "outros"
];

interface LossReason {
  id: string;
  reason: string;
}

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
  
  // Estado para armazenar os dados originais do lead
  const [originalLeadData, setOriginalLeadData] = useState<Lead | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customActionGroups, setCustomActionGroups] = useState<string[]>([]);
  const [customActionTypes, setCustomActionTypes] = useState<string[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const { toast } = useToast();
  const { actionGroupOptions, getActionTypeOptions } = useFilterOptions();

  const fetchKanbanColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar colunas do Kanban:', error);
        return;
      }

      setKanbanColumns(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar colunas:', error);
    }
  };

  const fetchLossReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason', { ascending: true });

      if (error) {
        console.error('Erro ao buscar motivos de perda:', error);
        return;
      }

      setLossReasons(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar motivos de perda:', error);
    }
  };

  // Update form data when lead changes
  useEffect(() => {
    if (lead && open) {
      console.log("🔄 EditLeadForm - Carregando dados do lead:", lead);
      
      // Salvar dados originais do lead
      setOriginalLeadData(lead);
      
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
        loss_reason: lead.loss_reason || "",
      };
      
      console.log("📋 EditLeadForm - Dados iniciais do formulário:", initialData);
      setFormData(initialData);
    }
  }, [lead, open]);

  useEffect(() => {
    if (open) {
      fetchKanbanColumns();
      fetchLossReasons();
    }
  }, [open]);

  // Função para restaurar dados originais
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

  // Função para lidar com o fechamento do modal
  const handleClose = () => {
    console.log("❌ EditLeadForm - Fechando modal sem salvar");
    
    // Restaurar dados originais
    restoreOriginalData();
    
    // Limpar estados auxiliares
    setShowNewOptionInput(null);
    setNewOptionValue("");
    
    // Fechar modal
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    console.log("💾 EditLeadForm - Salvando lead com dados:", formData);

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
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
        })
        .eq('id', lead.id);

      if (error) {
        console.error('Erro ao atualizar lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return;
      }

      console.log("✅ EditLeadForm - Lead atualizado com sucesso");

      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso.",
      });

      onLeadUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro inesperado ao atualizar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 EditLeadForm - Alterando ${field} para:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === 'action_group') {
      setFormData(prev => ({
        ...prev,
        action_type: ""
      }));
    }
  };

  const handleAddNewOption = async (field: string) => {
    if (!newOptionValue.trim()) return;

    if (field === 'source') {
      setCustomSources(prev => [...prev, newOptionValue.trim()]);
      handleInputChange(field, newOptionValue.trim());
    } else if (field === 'action_group') {
      setCustomActionGroups(prev => [...prev, newOptionValue.trim()]);
      handleInputChange(field, newOptionValue.trim());
    } else if (field === 'action_type') {
      setCustomActionTypes(prev => [...prev, newOptionValue.trim()]);
      handleInputChange(field, newOptionValue.trim());
    } else if (field === 'loss_reason') {
      try {
        const { error } = await supabase
          .from('loss_reasons')
          .insert({ reason: newOptionValue.trim() });

        if (error) {
          console.error('Erro ao adicionar motivo de perda:', error);
          toast({
            title: "Erro",
            description: "Não foi possível adicionar o novo motivo.",
            variant: "destructive"
          });
          return;
        }

        await fetchLossReasons();
        handleInputChange(field, newOptionValue.trim());
        
        toast({
          title: "Sucesso",
          description: "Novo motivo de perda adicionado com sucesso.",
        });
      } catch (error) {
        console.error('Erro inesperado ao adicionar motivo:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
        return;
      }
    }

    setNewOptionValue("");
    setShowNewOptionInput(null);
  };

  const getSourceOptions = () => {
    const defaultOptions = DEFAULT_SOURCES.map(source => ({
      value: source,
      label: source === "website" ? "Website" : 
             source === "google-ads" ? "Google Ads" :
             source === "facebook" ? "Facebook" :
             source === "linkedin" ? "LinkedIn" :
             source === "indicacao" ? "Indicação" :
             source === "evento" ? "Evento" :
             source === "telefone" ? "Telefone" : "Outros"
    }));
    
    const customOptions = customSources.map(source => ({
      value: source,
      label: source
    }));
    
    return [...defaultOptions, ...customOptions];
  };

  const getActionGroupOptionsForSelect = () => {
    const defaultOptions = actionGroupOptions;
    const customOptions = customActionGroups.map(group => ({
      value: group,
      label: group
    }));
    
    return [...defaultOptions, ...customOptions];
  };

  const getAvailableActionTypes = () => {
    if (!formData.action_group) return [];
    const defaultTypes = getActionTypeOptions(formData.action_group);
    const customTypes = customActionTypes.map(type => ({
      value: type,
      label: type
    }));
    
    return [...defaultTypes, ...customTypes];
  };

  if (!lead) return null;

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
                    {getSourceOptions().map((option) => (
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg z-50">
                  {kanbanColumns.map((column) => (
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
                    {getActionGroupOptionsForSelect().map((option) => (
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
                      {getAvailableActionTypes().map((option) => (
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
