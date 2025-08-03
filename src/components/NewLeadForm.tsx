import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useOptimizedFormOptions } from "@/hooks/useOptimizedFormOptions";
import { useNewOptionHandler } from "@/hooks/useNewOptionHandler";
import { useFormDataManager } from "@/hooks/useFormDataManager";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedTenantLeadOperations } from "@/hooks/useEnhancedTenantLeadOperations";

interface NewLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
}

export function NewLeadForm({ open, onOpenChange, onLeadCreated }: NewLeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { createLead } = useEnhancedTenantLeadOperations();
  
  const { 
    formData, 
    handleInputChange, 
    resetForm, 
    validateForm,
    setFormData 
  } = useFormDataManager();

  const {
    sources,
    actionGroups,
    actionTypes,
    states,
    isLoading: optionsLoading
  } = useOptimizedFormOptions();

  const {
    isAddingNewSource,
    isAddingNewActionGroup, 
    isAddingNewActionType,
    newSourceName,
    newActionGroupName,
    newActionTypeName,
    handleNewSourceSubmit,
    handleNewActionGroupSubmit,
    handleNewActionTypeSubmit,
    setIsAddingNewSource,
    setIsAddingNewActionGroup,
    setIsAddingNewActionType,
    setNewSourceName,
    setNewActionGroupName,
    setNewActionTypeName
  } = useNewOptionHandler();

  const filteredActionTypes = actionTypes.filter(type => 
    type.action_group_id === actionGroups.find(group => group.name === formData.action_group)?.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Erro de validação",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 NewLeadForm - Iniciando criação de lead:', formData);
    setIsSubmitting(true);

    try {
      const leadData = {
        name: formData.name.trim(),
        email: formData.email ? formData.email.trim() : undefined,
        phone: formData.phone.trim(),
        state: formData.state || undefined,
        source: formData.source || undefined,
        action_group: formData.action_group || undefined,
        action_type: formData.action_type || undefined,
        value: formData.value || undefined,
        description: formData.description ? formData.description.trim() : undefined,
      };

      console.log('📝 NewLeadForm - Dados do lead preparados:', leadData);
      
      const startTime = Date.now();
      const success = await createLead(leadData);
      const creationTime = Date.now() - startTime;
      
      console.log(`⏱️ NewLeadForm - Criação levou ${creationTime}ms, sucesso: ${success}`);

      if (success) {
        console.log('✅ NewLeadForm - Lead criado com sucesso, resetando form e fechando dialog');
        resetForm();
        onOpenChange(false);
        
        // Enhanced callback with verification and retry logic
        if (onLeadCreated) {
          console.log('🔄 NewLeadForm - Executando callback de lead criado com delay estratégico');
          
          // Add strategic delay to ensure database consistency
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Execute callback with retry logic
          let retries = 3;
          while (retries > 0) {
            try {
              console.log(`🔄 NewLeadForm - Tentativa ${4 - retries} de refresh dos dados`);
              await onLeadCreated();
              console.log('✅ NewLeadForm - Callback executado com sucesso');
              break;
            } catch (error) {
              retries--;
              console.error(`❌ NewLeadForm - Erro no callback (tentativas restantes: ${retries}):`, error);
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
        }

        toast({
          title: "Sucesso",
          description: "Lead criado com sucesso!",
        });
      } else {
        console.error('❌ NewLeadForm - Falha na criação do lead');
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ NewLeadForm - Erro inesperado na criação:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Preencha as informações do novo lead abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nome do lead"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Fonte</Label>
              {isAddingNewSource ? (
                <div className="flex gap-2">
                  <Input
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="Nome da nova fonte"
                  />
                  <Button type="button" onClick={handleNewSourceSubmit} size="sm">
                    Salvar
                  </Button>
                  <Button type="button" onClick={() => setIsAddingNewSource(false)} variant="outline" size="sm">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select value={formData.source} onValueChange={(value) => {
                  if (value === "add_new") {
                    setIsAddingNewSource(true);
                  } else {
                    setFormData(prev => ({ ...prev, source: value }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.name} value={source.name}>
                        {source.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new">+ Adicionar nova fonte</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action_group">Grupo de Ação</Label>
              {isAddingNewActionGroup ? (
                <div className="flex gap-2">
                  <Input
                    value={newActionGroupName}
                    onChange={(e) => setNewActionGroupName(e.target.value)}
                    placeholder="Nome do novo grupo"
                  />
                  <Button type="button" onClick={handleNewActionGroupSubmit} size="sm">
                    Salvar
                  </Button>
                  <Button type="button" onClick={() => setIsAddingNewActionGroup(false)} variant="outline" size="sm">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select value={formData.action_group} onValueChange={(value) => {
                  if (value === "add_new") {
                    setIsAddingNewActionGroup(true);
                  } else {
                    setFormData(prev => ({ ...prev, action_group: value, action_type: "" }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionGroups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new">+ Adicionar novo grupo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="action_type">Tipo de Ação</Label>
              {isAddingNewActionType ? (
                <div className="flex gap-2">
                  <Input
                    value={newActionTypeName}
                    onChange={(e) => setNewActionTypeName(e.target.value)}
                    placeholder="Nome do novo tipo"
                  />
                  <Button type="button" onClick={handleNewActionTypeSubmit} size="sm">
                    Salvar
                  </Button>
                  <Button type="button" onClick={() => setIsAddingNewActionType(false)} variant="outline" size="sm">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select 
                  value={formData.action_type} 
                  onValueChange={(value) => {
                    if (value === "add_new") {
                      setIsAddingNewActionType(true);
                    } else {
                      setFormData(prev => ({ ...prev, action_type: value }));
                    }
                  }}
                  disabled={!formData.action_group}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.action_group ? "Selecione o tipo" : "Primeiro selecione um grupo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredActionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new">+ Adicionar novo tipo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$)</Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              value={formData.value || ""}
              onChange={handleInputChange}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Observações sobre o lead..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || optionsLoading}>
              {isSubmitting ? "Criando..." : "Criar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
