
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useTenantFilterOptions } from "@/hooks/useTenantFilterOptions";
import { useTenantLeadOperations } from "@/hooks/useTenantLeadOperations";

interface NewLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
}

const BRAZILIAN_STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
  "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
  "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
  "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
  "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
];

const initialFormData = {
  name: "",
  phone: "",
  email: "",
  description: "",
  source: "",
  state: "",
  actionGroup: "",
  actionType: ""
};

export function NewLeadForm({ open, onOpenChange, onLeadCreated }: NewLeadFormProps) {
  const [formData, setFormData] = useState({ ...initialFormData });
  const [showNewActionGroupInput, setShowNewActionGroupInput] = useState(false);
  const [showNewActionTypeInput, setShowNewActionTypeInput] = useState(false);
  const [showNewSourceInput, setShowNewSourceInput] = useState(false);
  const [newActionGroup, setNewActionGroup] = useState("");
  const [newActionType, setNewActionType] = useState("");
  const [newSource, setNewSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    sourceOptions, 
    actionGroupOptions, 
    getActionTypeOptions, 
    loading,
    refreshData,
    addActionGroup,
    addActionType,
    addLeadSource
  } = useTenantFilterOptions();

  const { createLead } = useTenantLeadOperations();
  
  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);
  
  const resetForm = () => {
    setFormData({ ...initialFormData });
    setShowNewActionGroupInput(false);
    setShowNewActionTypeInput(false);
    setShowNewSourceInput(false);
    setNewActionGroup("");
    setNewActionType("");
    setNewSource("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica - email agora é opcional
    if (!formData.name || !formData.phone) {
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await createLead({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        description: formData.description || undefined,
        source: formData.source || undefined,
        state: formData.state || undefined,
        action_group: formData.actionGroup || undefined,
        action_type: formData.actionType || undefined,
      });

      if (success) {
        resetForm();
        onOpenChange(false);
        onLeadCreated?.();
      }
    } catch (error) {
      console.error('❌ Erro inesperado no formulário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Se mudou o grupo de ação, limpar o tipo de ação
    if (field === 'actionGroup') {
      setFormData(prev => ({
        ...prev,
        actionType: ""
      }));
    }
  };

  const handleAddCustomActionGroup = async () => {
    if (newActionGroup.trim()) {
      const name = newActionGroup.toLowerCase().replace(/\s+/g, '-');
      const description = newActionGroup.trim();
      
      const success = await addActionGroup(name, description);
      if (success) {
        setFormData(prev => ({ ...prev, actionGroup: name }));
        setNewActionGroup("");
        setShowNewActionGroupInput(false);
      }
    }
  };

  const handleAddCustomActionType = async () => {
    if (newActionType.trim() && formData.actionGroup) {
      const name = newActionType.toLowerCase().replace(/\s+/g, '-');
      const actionGroup = actionGroupOptions.find(group => group.value === formData.actionGroup);
      
      if (actionGroup) {
        const success = await addActionType(name, actionGroup.value);
        if (success) {
          setFormData(prev => ({ ...prev, actionType: name }));
          setNewActionType("");
          setShowNewActionTypeInput(false);
        }
      }
    }
  };

  const handleAddCustomSource = async () => {
    if (newSource.trim()) {
      const name = newSource.toLowerCase().replace(/\s+/g, '-');
      const label = newSource.trim();
      
      const success = await addLeadSource(name, label);
      if (success) {
        setFormData(prev => ({ ...prev, source: name }));
        setNewSource("");
        setShowNewSourceInput(false);
      }
    }
  };

  const getAvailableActionTypes = () => {
    if (!formData.actionGroup) return [];
    return getActionTypeOptions(formData.actionGroup);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando opções...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nome completo"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(11) 99999-9999"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@exemplo.com (opcional)"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descreva as necessidades do lead..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Origem do Lead</Label>
              <div className="flex gap-2">
                <Select value={formData.source} onValueChange={(value) => handleInputChange("source", value)} disabled={isSubmitting}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewSourceInput(true)}
                  className="px-3"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="actionGroup">Grupo de Ação</Label>
              <div className="flex gap-2">
                <Select value={formData.actionGroup} onValueChange={(value) => handleInputChange("actionGroup", value)} disabled={isSubmitting}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionGroupOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewActionGroupInput(true)}
                  className="px-3"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Campo Tipo de Ação - aparece quando há um grupo selecionado */}
          {formData.actionGroup && (
            <div className="space-y-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <div className="flex gap-2">
                <Select value={formData.actionType} onValueChange={(value) => handleInputChange("actionType", value)} disabled={isSubmitting}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o tipo específico" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableActionTypes().map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewActionTypeInput(true)}
                  className="px-3"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {showNewSourceInput && (
            <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
              <Label htmlFor="newSource">Nova Fonte de Lead</Label>
              <div className="space-y-3">
                <Input
                  id="newSource"
                  placeholder="Digite a nova fonte..."
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSource()}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewSourceInput(false);
                      setNewSource("");
                    }}
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddCustomSource}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showNewActionGroupInput && (
            <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
              <Label htmlFor="newActionGroup">Novo Grupo de Ação</Label>
              <div className="space-y-3">
                <Input
                  id="newActionGroup"
                  placeholder="Digite o novo grupo de ação..."
                  value={newActionGroup}
                  onChange={(e) => setNewActionGroup(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomActionGroup()}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewActionGroupInput(false);
                      setNewActionGroup("");
                    }}
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddCustomActionGroup}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showNewActionTypeInput && (
            <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
              <Label htmlFor="newActionType">Novo Tipo de Ação</Label>
              <div className="space-y-3">
                <Input
                  id="newActionType"
                  placeholder="Digite o novo tipo de ação..."
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomActionType()}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewActionTypeInput(false);
                      setNewActionType("");
                    }}
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddCustomActionType}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
