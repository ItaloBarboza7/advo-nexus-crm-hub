
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

interface EditLeadFormProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: () => void;
}

const LEAD_STATUSES = [
  { id: "Novo", title: "Novo" },
  { id: "Proposta", title: "Proposta" },
  { id: "Reunião", title: "Reunião" },
  { id: "Contrato Fechado", title: "Contrato Fechado" },
  { id: "Perdido", title: "Perdido" },
  { id: "Finalizado", title: "Finalizado" },
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

export function EditLeadForm({ lead, open, onOpenChange, onLeadUpdated }: EditLeadFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
    source: "",
    status: "",
    action_type: "",
    value: "",
    description: "",
    loss_reason: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showNewOptionInput, setShowNewOptionInput] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [customSources, setCustomSources] = useState<string[]>([]);
  const [customActionTypes, setCustomActionTypes] = useState<string[]>([]);
  const { toast } = useToast();

  // Update form data when lead changes
  useEffect(() => {
    if (lead && open) {
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        state: lead.state || "",
        source: lead.source || "",
        status: lead.status || "",
        action_type: lead.action_type || "",
        value: lead.value?.toString() || "",
        description: lead.description || "",
        loss_reason: lead.loss_reason || "",
      });
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddNewOption = (field: string) => {
    if (!newOptionValue.trim()) return;

    if (field === 'source') {
      setCustomSources(prev => [...prev, newOptionValue.trim()]);
    } else if (field === 'action_type') {
      setCustomActionTypes(prev => [...prev, newOptionValue.trim()]);
    }

    handleInputChange(field, newOptionValue.trim());
    setNewOptionValue("");
    setShowNewOptionInput(null);
    
    toast({
      title: "Opção adicionada!",
      description: `"${newOptionValue}" foi adicionado às opções.`,
    });
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

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="action_type">Tipo de Ação</Label>
              <div className="flex gap-2">
                <Select value={formData.action_type} onValueChange={(value) => handleInputChange('action_type', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o tipo de ação" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg max-h-60 overflow-y-auto z-50">
                    {getActionTypeOptions().map((option) => (
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
            <div className="space-y-2">
              <Label htmlFor="loss_reason">Motivo da Perda</Label>
              <Input
                id="loss_reason"
                value={formData.loss_reason}
                onChange={(e) => handleInputChange('loss_reason', e.target.value)}
                placeholder="Motivo da perda do lead"
              />
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
              onClick={() => onOpenChange(false)}
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
