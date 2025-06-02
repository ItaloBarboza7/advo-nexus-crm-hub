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

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditLead?: (lead: Lead) => void;
}

const LEAD_STATUSES = [
  { id: "Novo", title: "Novo", color: "bg-blue-100 text-blue-800" },
  { id: "Proposta", title: "Proposta", color: "bg-purple-100 text-purple-800" },
  { id: "Reunião", title: "Reunião", color: "bg-orange-100 text-orange-800" },
  { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-green-100 text-green-800" },
  { id: "Perdido", title: "Perdido", color: "bg-red-100 text-red-800" },
  { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800" },
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

const DEFAULT_ACTION_TYPES = [
  "consultoria", "contratos", "trabalhista", "compliance", 
  "tributario", "civil", "criminal", "outros"
];

export function LeadDetailsDialog({ lead, open, onOpenChange, onEditLead }: LeadDetailsDialogProps) {
  const [statusHistory, setStatusHistory] = useState<LeadStatusHistory[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customActionTypes, setCustomActionTypes] = useState<string[]>([]);
  const { toast } = useToast();

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
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
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

  const updateLeadField = async (field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ [field]: value })
        .eq('id', lead.id);

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
      
      // Atualizar o lead localmente
      Object.assign(lead, { [field]: value });
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
    setTempValue(lead[field as keyof Lead] as string || "");
  };

  const handleFieldSave = async () => {
    if (!editingField) return;
    
    const success = await updateLeadField(editingField, tempValue);
    if (success) {
      setEditingField(null);
      setTempValue("");
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue("");
    setShowNewOptionInput(null);
    setNewOptionValue("");
  };

  const handleAddNewOption = async (field: string) => {
    if (!newOptionValue.trim()) return;

    if (field === 'source') {
      setCustomSources(prev => [...prev, newOptionValue.trim()]);
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

  const getActionTypeOptions = () => {
    const defaultOptions = DEFAULT_ACTION_TYPES.map(type => ({
      value: type,
      label: type === "consultoria" ? "Consultoria Jurídica" :
             type === "contratos" ? "Contratos" :
             type === "trabalhista" ? "Trabalhista" :
             type === "compliance" ? "Compliance" :
             type === "tributario" ? "Tributário" :
             type === "civil" ? "Civil" :
             type === "criminal" ? "Criminal" : "Outros"
    }));
    
    const customOptions = customActionTypes.map(type => ({
      value: type,
      label: type
    }));
    
    return [...defaultOptions, ...customOptions];
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

  const handleEditClick = () => {
    console.log("🔄 LeadDetailsDialog - handleEditClick chamado");
    console.log("📊 Lead atual:", lead);
    console.log("🎯 onEditLead function:", onEditLead);
    
    if (onEditLead && lead) {
      console.log("✅ Chamando onEditLead com lead:", lead.name);
      onEditLead(lead);
      console.log("🚪 Fechando dialog");
      onOpenChange(false);
    } else {
      console.error("❌ onEditLead não está disponível ou lead é null");
      console.error("onEditLead:", onEditLead);
      console.error("lead:", lead);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-semibold">
              {getInitials(lead.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(lead.value)}</span>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Informações de Contato */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações de Contato
            </h3>
            <div className="space-y-3">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{lead.phone}</span>
              </div>
              {/* Estado editável */}
              <div className="group relative">
                <MapPin className="h-4 w-4 inline mr-2" />
                {renderEditableField('state', 'Estado', lead.state || '', BRAZILIAN_STATES.map(state => ({ value: state, label: state })))}
              </div>
            </div>
          </div>

          {/* Informações Comerciais */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações Comerciais
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Valor Potencial:</span>
                <span className="text-green-600 font-semibold">{formatCurrency(lead.value)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Status:</span>
                <Badge className={getStatusColor(lead.status)} variant="outline">
                  {lead.status}
                </Badge>
              </div>
              {lead.loss_reason && lead.status === "Perdido" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Motivo da Perda:</span>
                  <span className="text-red-600">{lead.loss_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Informações Adicionais
            </h3>
            <div className="space-y-3">
              {/* Fonte editável */}
              <div className="group relative">
                {renderEditableField('source', 'Fonte', lead.source || '', getSourceOptions())}
              </div>
              
              {/* Tipo de Ação editável */}
              <div className="group relative">
                {renderEditableField('action_type', 'Tipo de Ação', lead.action_type || '', getActionTypeOptions())}
              </div>
            </div>
          </div>

          {/* Descrição */}
          {lead.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descrição
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.description}</p>
            </div>
          )}

          {/* Histórico de Status Completo */}
          {completeHistory.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Status
              </h3>
              <div className="space-y-3">
                {completeHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between text-sm border-l-2 border-blue-200 pl-3">
                    <div>
                      {history.old_status ? (
                        <>
                          <span className="text-gray-600">{history.old_status} → </span>
                          <Badge className={getStatusColor(history.new_status)} variant="outline">
                            {history.new_status}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-gray-600">Lead criado em</span>
                      )}
                    </div>
                    <span className="text-gray-400">{formatDate(history.changed_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Fechar
          </Button>
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleEditClick}
          >
            Editar Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
