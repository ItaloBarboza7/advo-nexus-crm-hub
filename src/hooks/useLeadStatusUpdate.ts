
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

      // Primeiro, buscar o status atual do lead
      const getCurrentStatusSql = `SELECT status FROM ${schema}.leads WHERE id = '${leadId}'`;
      console.log('🔍 Buscando status atual:', getCurrentStatusSql);
      
      const { data: currentData, error: getCurrentError } = await supabase.rpc('exec_sql' as any, {
        sql: getCurrentStatusSql
      });

      if (getCurrentError) {
        console.error('❌ Erro ao buscar status atual:', getCurrentError);
        return false;
      }

      const currentStatus = Array.isArray(currentData) && currentData.length > 0 ? currentData[0].status : null;
      console.log('📋 Status atual do lead:', currentStatus, '-> Novo status:', newStatus);

      // Se o status for o mesmo, não fazer nada
      if (currentStatus === newStatus) {
        console.log('ℹ️ Status já é o mesmo, não há necessidade de atualizar');
        return true;
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

      // Se mudando para "Contrato Fechado", registrar quem fechou
      if (newStatus === "Contrato Fechado") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setClause += `, closed_by_user_id = '${user.id}'`;
        }
      }

      const updateSql = `UPDATE ${schema}.leads SET ${setClause} WHERE id = '${leadId}'`;
      console.log('🔧 useLeadStatusUpdate - Executando SQL de atualização:', updateSql);

      const { error: updateError } = await supabase.rpc('exec_sql' as any, {
        sql: updateSql
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar status do lead:', updateError);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o status do lead.",
          variant: "destructive"
        });
        return false;
      }

      // ⚠️ REMOVIDO: Não inserir manualmente no histórico pois o trigger já faz isso
      // O trigger track_lead_status_changes_trigger já cuida da inserção no histórico
      console.log('✅ Status atualizado com sucesso - histórico será inserido automaticamente pelo trigger');

      // Se for "Contrato Fechado", registrar também na tabela global
      if (newStatus === "Contrato Fechado") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: tenantIdData } = await supabase.rpc('get_tenant_id');
          const tenantId = tenantIdData || user.id;

          const contractClosureSql = `
            INSERT INTO public.contract_closures (lead_id, closed_by_user_id, tenant_id, closed_at)
            VALUES ('${leadId}', '${user.id}', '${tenantId}', now())
            ON CONFLICT DO NOTHING
          `;
          console.log('📊 Registrando fechamento de contrato:', contractClosureSql);

          const { error: closureError } = await supabase.rpc('exec_sql' as any, {
            sql: contractClosureSql
          });

          if (closureError) {
            console.error('⚠️ Erro ao registrar fechamento de contrato:', closureError);
          } else {
            console.log('✅ Fechamento de contrato registrado com sucesso');
          }
        }
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
