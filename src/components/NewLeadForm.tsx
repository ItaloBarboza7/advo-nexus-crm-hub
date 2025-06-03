
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFilterOptions } from "@/hooks/useFilterOptions";

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

export function NewLeadForm({ open, onOpenChange, onLeadCreated }: NewLeadFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    description: "",
    source: "",
    state: "",
    actionGroup: "",
    actionType: ""
  });

  const [customActionGroups, setCustomActionGroups] = useState<string[]>([]);
  const [showNewActionGroupInput, setShowNewActionGroupInput] = useState(false);
  const [newActionGroup, setNewActionGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { actionGroupOptions, getActionTypeOptions } = useFilterOptions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica - email agora é opcional
    if (!formData.name || !formData.phone) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios (Nome e Telefone).",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('leads')
        .insert([
          {
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            description: formData.description || null,
            source: formData.source || null,
            state: formData.state || null,
            action_group: formData.actionGroup || null,
            action_type: formData.actionType || null,
            status: "Novo"
          }
        ]);

      if (error) {
        console.error('Erro ao criar lead:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao criar o lead. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso!",
        description: "Lead criado com sucesso!",
      });

      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        description: "",
        source: "",
        state: "",
        actionGroup: "",
        actionType: ""
      });

      onOpenChange(false);
      onLeadCreated?.();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
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

  const handleAddCustomActionGroup = () => {
    if (newActionGroup.trim() && !actionGroupOptions.some(option => option.value === newActionGroup.toLowerCase()) && !customActionGroups.includes(newActionGroup)) {
      setCustomActionGroups(prev => [...prev, newActionGroup.trim()]);
      setFormData(prev => ({ ...prev, actionGroup: newActionGroup.trim() }));
      setNewActionGroup("");
      setShowNewActionGroupInput(false);
      toast({
        title: "Grupo adicionado!",
        description: `"${newActionGroup}" foi adicionado às opções.`,
      });
    }
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
    if (!formData.actionGroup) return [];
    return getActionTypeOptions(formData.actionGroup);
  };

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
              <Select value={formData.source} onValueChange={(value) => handleInputChange("source", value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="google-ads">Google Ads</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
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
                    {getActionGroupOptionsForSelect().map((option) => (
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

          {/* Campo Tipo e Ação - aparece quando há um grupo selecionado */}
          {formData.actionGroup && (
            <div className="space-y-2">
              <Label htmlFor="actionType">Tipo e Ação</Label>
              <Select value={formData.actionType} onValueChange={(value) => handleInputChange("actionType", value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo específico" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableActionTypes().map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
