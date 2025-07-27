
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { useTenantLeadOperations } from "@/hooks/useTenantLeadOperations";
import { useOptimizedFormOptions } from "@/hooks/useOptimizedFormOptions";
import { useFormDataManager } from "@/hooks/useFormDataManager";
import { useNewOptionHandler } from "@/hooks/useNewOptionHandler";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);
  
  const { toast } = useToast();
  const { updateLead } = useTenantLeadOperations();
  
  // Use optimized hooks
  const {
    isReady,
    sourceOptions,
    actionGroupOptions,
    actionGroups,
    lossReasons,
    kanbanColumns,
    getActionTypeOptions,
    refreshData,
    addLossReason
  } = useOptimizedFormOptions();
  
  const {
    formData,
    initializeFormData,
    updateField,
    resetFormData,
    restoreOriginalData
  } = useFormDataManager();
  
  const {
    showNewOptionInput,
    setShowNewOptionInput,
    newOptionValue,
    setNewOptionValue,
    handleAddNewOption,
    closeNewOptionInput
  } = useNewOptionHandler();

  // Initialize form data only once when modal opens with valid lead and options are ready
  useEffect(() => {
    if (lead && open && isReady && !initializationRef.current) {
      console.log("🚀 EditLeadForm - Initializing with optimized data");
      initializeFormData(lead);
      setIsInitialized(true);
      initializationRef.current = true;
    }
  }, [lead, open, isReady, initializeFormData]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      console.log("❌ EditLeadForm - Modal closed, resetting");
      resetFormData();
      closeNewOptionInput();
      setIsInitialized(false);
      initializationRef.current = false;
    }
  }, [open, resetFormData, closeNewOptionInput]);

  const handleClose = () => {
    console.log("❌ EditLeadForm - Closing modal");
    restoreOriginalData();
    closeNewOptionInput();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    console.log("💾 EditLeadForm - Submitting form");
    setIsSubmitting(true);

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
        console.log("✅ EditLeadForm - Lead updated successfully");
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
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  // Show loading only during initial data loading
  if (!isReady || !isInitialized) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lead - {lead.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados...</p>
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
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select value={formData.state} onValueChange={(value) => updateField('state', value)}>
                <SelectTrigger>
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

            <div className="space-y-2 relative">
              <Label htmlFor="source">Fonte</Label>
              <div className="flex gap-2">
                <Select value={formData.source} onValueChange={(value) => updateField('source', value)}>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('source', (value) => updateField('source', value), refreshData)}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={closeNewOptionInput}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewOption('source', (value) => updateField('source', value), refreshData)}
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
              <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
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
                <Select value={formData.action_group} onValueChange={(value) => updateField('action_group', value)}>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('action_group', (value) => updateField('action_group', value), refreshData)}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={closeNewOptionInput}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewOption('action_group', (value) => updateField('action_group', value), refreshData)}
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
                  <Select value={formData.action_type} onValueChange={(value) => updateField('action_type', value)}>
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
                        onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('action_type', (value) => updateField('action_type', value), refreshData, addLossReason, actionGroups)}
                        className="text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={closeNewOptionInput}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddNewOption('action_type', (value) => updateField('action_type', value), refreshData, addLossReason, actionGroups)}
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
                onChange={(e) => updateField('value', e.target.value)}
              />
            </div>
          </div>

          {formData.status === "Perdido" && (
            <div className="space-y-2 relative">
              <Label htmlFor="loss_reason">Motivo da Perda</Label>
              <div className="flex gap-2">
                <Select value={formData.loss_reason} onValueChange={(value) => updateField('loss_reason', value)}>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewOption('loss_reason', (value) => updateField('loss_reason', value), refreshData, addLossReason)}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={closeNewOptionInput}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddNewOption('loss_reason', (value) => updateField('loss_reason', value), refreshData, addLossReason)}
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
              onChange={(e) => updateField('description', e.target.value)}
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
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
