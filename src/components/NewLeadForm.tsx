
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

const DEFAULT_ACTION_TYPES = [
  "consultoria", "contratos", "trabalhista", "compliance", 
  "tributario", "civil", "criminal", "outros"
];

export function NewLeadForm({ open, onOpenChange, onLeadCreated }: NewLeadFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    description: "",
    source: "",
    state: "",
    actionType: ""
  });

  const [customActionTypes, setCustomActionTypes] = useState<string[]>([]);
  const [newActionType, setNewActionType] = useState("");
  const [showNewActionInput, setShowNewActionInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

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
  };

  const handleAddCustomAction = () => {
    if (newActionType.trim() && !DEFAULT_ACTION_TYPES.includes(newActionType.toLowerCase()) && !customActionTypes.includes(newActionType)) {
      setCustomActionTypes(prev => [...prev, newActionType.trim()]);
      setFormData(prev => ({ ...prev, actionType: newActionType.trim() }));
      setNewActionType("");
      setShowNewActionInput(false);
      toast({
        title: "Ação adicionada!",
        description: `"${newActionType}" foi adicionado às opções.`,
      });
    }
  };

  const allActionTypes = [
    ...DEFAULT_ACTION_TYPES.map(type => ({ value: type, label: type === "consultoria" ? "Consultoria Jurídica" : type === "contratos" ? "Contratos" : type === "trabalhista" ? "Trabalhista" : type === "compliance" ? "Compliance" : type === "tributario" ? "Tributário" : type === "civil" ? "Civil" : type === "criminal" ? "Criminal" : "Outros" })),
    ...customActionTypes.map(type => ({ value: type, label: type }))
  ];

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

            <div className="space-y-2">
              <Label htmlFor="actionType">Tipo de Ação</Label>
              <div className="flex gap-2">
                <Select value={formData.actionType} onValueChange={(value) => handleInputChange("actionType", value)} disabled={isSubmitting}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {allActionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewActionInput(true)}
                  className="px-3"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {showNewActionInput && (
            <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
              <Label htmlFor="newActionType">Novo Tipo de Ação</Label>
              <div className="space-y-3">
                <Input
                  id="newActionType"
                  placeholder="Digite o novo tipo de ação..."
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomAction()}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewActionInput(false);
                      setNewActionType("");
                    }}
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddCustomAction}
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
