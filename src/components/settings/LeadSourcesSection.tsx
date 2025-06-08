
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { AddLeadSourceDialog } from "@/components/AddLeadSourceDialog";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function LeadSourcesSection() {
  const { sourceOptions, loading, refreshData } = useFilterOptions();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const handleDeleteSource = async (sourceName: string) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .delete()
        .eq('name', sourceName);

      if (error) {
        console.error('Erro ao excluir fonte:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir a fonte.",
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Fonte excluída com sucesso.",
      });

      refreshData();
    } catch (error) {
      console.error('Erro inesperado ao excluir fonte:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fontes de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Fontes de Leads</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sourceOptions.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhuma fonte cadastrada.</p>
            ) : (
              sourceOptions.map((source) => (
                <div key={source.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{source.label}</span>
                  <DeleteButton
                    onDelete={() => handleDeleteSource(source.value)}
                    itemName={source.label}
                    itemType="fonte"
                    size="sm"
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AddLeadSourceDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSourceAdded={() => {
          refreshData();
          setShowAddDialog(false);
        }}
      />
    </>
  );
}
