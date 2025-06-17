
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { supabase } from "@/integrations/supabase/client";

export function useLeadStatusUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const updateLeadStatus = async (
    leadId: string, 
    newStatus: string, 
    lossReason?: string
  ): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`🔄 useLeadStatusUpdate - Atualizando status do lead ${leadId} para ${newStatus} no esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }
      
      // Preparar os dados para atualização
      let setClause = `status = '${newStatus.replace(/'/g, "''")}', updated_at = now()`;
      
      // Se está mudando para "Perdido", definir o motivo da perda
      if (newStatus === "Perdido" && lossReason) {
        setClause += `, loss_reason = '${lossReason.replace(/'/g, "''")}'`;
      }
      
      // SEMPRE limpar o motivo da perda quando NÃO está indo para "Perdido"
      if (newStatus !== "Perdido") {
        setClause += `, loss_reason = NULL`;
      }

      const sql = `UPDATE ${schema}.leads SET ${setClause} WHERE id = '${leadId}'`;
      console.log('🔧 useLeadStatusUpdate - Executando SQL:', sql);

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: sql
      });

      if (error) {
        console.error('❌ Erro ao atualizar status do lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso.",
      });

      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o status.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateLeadStatus,
    isUpdating
  };
}
