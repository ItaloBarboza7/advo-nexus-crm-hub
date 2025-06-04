import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, User, FileText, Tag, DollarSign, Clock, Plus, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { LeadStatusHistory } from "@/types/leadStatusHistory";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditLead?: (lead: Lead) => void;
}

const LEAD_STATUSES = [
  { id: "Novo", title: "Novo", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { id: "Proposta", title: "Proposta", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { id: "Reunião", title: "Reunião", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { id: "Perdido", title: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300" },
];

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

export function LeadDetailsDialog({ lead, open, onOpenChange, onEditLead }: LeadDetailsDialogProps) {
  const [statusHistory, setStatusHistory] = useState<LeadStatusHistory[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tempActionType, setTempActionType] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customActionGroups, setCustomActionGroups] = useState<string[]>([]);
  const [customActionTypes, setCustomActionTypes] = useState<string[]>([]);
  const { toast } = useToast();
  const { actionGroupOptions, getActionTypeOptions } = useFilterOptions();

  const fetchStatusHistory = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de status:', error);
        return;
      }

      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar histórico:', error);
    }
  };

  useEffect(() => {
    if (lead && open) {
      fetchStatusHistory(lead.id);
    }
  }, [lead, open]);

  if (!lead) return null;

  const getStatusColor = (status: string) => {
    const statusConfig = LEAD_STATUSES.find(s => s.id === status);
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const updateLeadField = async (field: string, value: string, actionType?: string) => {
    try {
      const updateData: any = { [field]: value };
      
      if (field === 'action_group') {
        updateData.action_type = actionType || null;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead!.id);

      if (error) {
        console.error('Erro ao atualizar campo:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o campo.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Campo atualizado com sucesso.",
      });
      
      Object.assign(lead!, updateData);
      return true;
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditingField(field);
    if (field === 'action_group') {
      setTempValue(lead?.action_group || "");
      setTempActionType(lead?.action_type || "");
    } else {
      setTempValue(lead?.[field as keyof Lead] as string || "");
    }
  };

  const handleFieldSave = async () => {
    if (!editingField) return;
    
    let success = false;
    
    if (editingField === 'action_group') {
      success = await updateLeadField(editingField, tempValue, tempActionType);
    } else {
      success = await updateLeadField(editingField, tempValue);
    }
    
    if (success) {
      setEditingField(null);
      setTempValue("");
      setTempActionType("");
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue("");
    setTempActionType("");
    setShowNewOptionInput(null);
    setNewOptionValue("");
  };

  const handleAddNewOption = async (field: string) => {
    if (!newOptionValue.trim()) return;

    if (field === 'source') {
      setCustomSources(prev => [...prev, newOptionValue.trim()]);
    } else if (field === 'action_group') {
      setCustomActionGroups(prev => [...prev, newOptionValue.trim()]);
    } else if (field === 'action_type') {
      setCustomActionTypes(prev => [...prev, newOptionValue.trim()]);
    }

    setTempValue(newOptionValue.trim());
    const success = await updateLeadField(field, newOptionValue.trim());
    
    if (success) {
      setNewOptionValue("");
      setShowNewOptionInput(null);
      setEditingField(null);
      toast({
        title: "Opção adicionada!",
        description: `"${newOptionValue}" foi adicionado às opções.`,
      });
    }
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
    if (!tempValue) return [];
    const defaultTypes = getActionTypeOptions(tempValue);
    const customTypes = customActionTypes.map(type => ({
      value: type,
      label: type
    }));
    
    return [...defaultTypes, ...customTypes];
  };

  const renderEditableField = (field: string, label: string, value: string, options?: Array<{value: string, label: string}>) => {
    const isEditing = editingField === field;
    const isShowingNewOption = showNewOptionInput === field;

    return (
      <div className="relative">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{label}:</span>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              {options ? (
                <Select value={tempValue} onValueChange={setTempValue}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
              )}
              <Button size="sm" variant="ghost" onClick={handleFieldSave} className="h-6 w-6 p-0">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleFieldCancel} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
              {options && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNewOptionInput(field)}
                  className="h-6 w-6 p-0"
                  title="Adicionar nova opção"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="flex-1">{value || 'Não informado'}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFieldEdit(field)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {isShowingNewOption && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50">
            <div className="space-y-3">
              <Input
                placeholder={`Nova opção para ${label.toLowerCase()}...`}
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption(field)}
                className="text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
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
                  size="sm"
                  onClick={() => handleAddNewOption(field)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActionGroupField = () => {
    const isEditing = editingField === 'action_group';
    const availableActionTypes = getAvailableActionTypes();

    return (
      <div className="space-y-3">
        <div className="group relative">
          {renderEditableField('action_group', 'Grupo de Ação', lead?.action_group || '', getActionGroupOptionsForSelect())}
        </div>
        
        {/* Campo Tipo de Ação - aparece quando há um grupo selecionado */}
        {(lead?.action_group || (isEditing && tempValue)) && (
          <div className="group relative">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Tipo de Ação:</span>
              {editingField === 'action_type' ? (
                <div className="flex items-center gap-2 flex-1">
                  <Select value={tempActionType} onValueChange={setTempActionType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione o tipo específico" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableActionTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={handleFieldSave} className="h-6 w-6 p-0">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleFieldCancel} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewOptionInput('action_type')}
                    className="h-6 w-6 p-0"
                    title="Adicionar nova opção"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="flex-1">
                    {lead?.action_type ? 
                      getActionTypeOptions(lead.action_group || '').find(t => t.value === lead.action_type)?.label || lead.action_type
                      : 'Não informado'
                    }
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingField('action_type');
                      setTempActionType(lead?.action_type || "");
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
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
    );
  };

  const handleEditClick = () => {
    console.log("🔄 LeadDetailsDialog - handleEditClick chamado");
    console.log("📊 Lead atual:", lead);
    console.log("🎯 onEditLead function:", onEditLead);
    
    if (onEditLead && lead) {
      console.log("✅ Chamando onEditLead com lead:", lead.name);
      onEditLead(lead);
    } else {
      console.error("❌ onEditLead não está disponível ou lead é null");
    }
  };

  const getCompleteHistory = () => {
    const history = [...statusHistory];
    
    // Adicionar a criação do lead ao histórico se não houver histórico ou se o mais antigo não for a criação
    const hasCreationEntry = history.some(h => h.old_status === null);
    
    if (!hasCreationEntry) {
      history.push({
        id: `creation-${lead.id}`,
        lead_id: lead.id,
        old_status: null,
        new_status: lead.status,
        changed_at: lead.created_at,
        created_at: lead.created_at
      });
    }
    
    return history.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  };

  const completeHistory = getCompleteHistory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-blue-600 dark:bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-semibold">
              {getInitials(lead.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{lead.name}</h2>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(lead.value)}</span>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Informações de Contato */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações de Contato
            </h3>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Phone className="h-4 w-4" />
                <span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="h-4 w-4" />
                <span>{lead.state || 'Estado não informado'}</span>
              </div>
            </div>
          </div>

          {/* Informações Comerciais */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações Comerciais
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Valor Potencial:</span>
                <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(lead.value)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Status:</span>
                <Badge className={getStatusColor(lead.status)} variant="outline">
                  {lead.status}
                </Badge>
              </div>
              {lead.loss_reason && lead.status === "Perdido" && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Motivo da Perda:</span>
                  <span className="text-red-600 dark:text-red-400">{lead.loss_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Informações Adicionais
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Fonte:</span>
                <span>{lead.source || 'Não informado'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Grupo de Ação:</span>
                <span>{lead.action_group || 'Não informado'}</span>
              </div>

              {lead.action_type && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Tipo de Ação:</span>
                  <span>{lead.action_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          {lead.description && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descrição
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{lead.description}</p>
            </div>
          )}

          {/* Histórico de Status */}
          {completeHistory.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Status
              </h3>
              <div className="space-y-3">
                {completeHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between text-sm border-l-2 border-blue-200 dark:border-blue-600 pl-3">
                    <div>
                      {history.old_status ? (
                        <>
                          <span className="text-gray-600 dark:text-gray-400">{history.old_status} → </span>
                          <Badge className={getStatusColor(history.new_status)} variant="outline">
                            {history.new_status}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">Lead criado em</span>
                      )}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">{formatDate(history.changed_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Fechar
          </Button>
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            onClick={handleEditClick}
          >
            Editar Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
