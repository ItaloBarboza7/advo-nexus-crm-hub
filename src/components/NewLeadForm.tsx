
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNewLeadFormOptions } from "@/hooks/useNewLeadFormOptions";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    isReady,
    loading,
    sourceOptions, 
    actionGroupOptions, 
    getActionTypeOptions
  } = useNewLeadFormOptions();

  const { createLead } = useTenantLeadOperations();
  
  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);
  
  const resetForm = () => {
    setFormData({ ...initialFormData });
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("🔄 NewLeadForm - Enviando dados do lead:", formData);
      
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
        console.log("✅ NewLeadForm - Lead criado com sucesso");
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
    
    if (field === 'actionGroup') {
      setFormData(prev => ({
        ...prev,
        actionType: ""
      }));
    }
  };

  const getAvailableActionTypes = () => {
    if (!formData.actionGroup) return [];
    return getActionTypeOptions(formData.actionGroup);
  };

  if (!isReady) {
    return (
      <Dialog open={open} onOpenChange={(newOpen) => !isSubmitting && onOpenChange(newOpen)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
    <Dialog open={open} onOpenChange={(newOpen) => !isSubmitting && onOpenChange(newOpen)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              <Select 
                value={formData.source} 
                onValueChange={(value) => handleInputChange("source", value)} 
                disabled={isSubmitting || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione a origem"} />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select 
                value={formData.state} 
                onValueChange={(value) => handleInputChange("state", value)} 
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionGroup">Grupo de Ação</Label>
              <Select 
                value={formData.actionGroup} 
                onValueChange={(value) => handleInputChange("actionGroup", value)} 
                disabled={isSubmitting || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione o grupo"} />
                </SelectTrigger>
                <SelectContent>
                  {actionGroupOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.actionGroup && (
            <div className="space-y-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <Select 
                value={formData.actionType} 
                onValueChange={(value) => handleInputChange("actionType", value)} 
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo específico" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableActionTypes().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700" 
              disabled={isSubmitting || !formData.name || !formData.phone}
            >
              {isSubmitting ? "Criando..." : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
