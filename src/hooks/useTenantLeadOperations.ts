
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';

interface LeadUpdateData {
  name: string;
  email: string | null;
  phone: string;
  state: string | null;
  source: string | null;
  status: string;
  action_group: string | null;
  action_type: string | null;
  value: number | null;
  description: string | null;
  loss_reason: string | null;
}

interface LeadCreateData {
  name: string;
  email?: string;
  phone: string;
  state?: string;
  source?: string;
  action_group?: string;
  action_type?: string;
  value?: number;
  description?: string;
}

export function useTenantLeadOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const createLead = async (leadData: LeadCreateData): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log(`🔄 useTenantLeadOperations - Criando lead no esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      // Construir a query de insert
      const fields = [];
      const values = [];
      
      // Sempre incluir user_id para tracking
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fields.push('user_id');
        values.push(`'${user.id}'`);
      }
      
      fields.push('name', 'phone');
      values.push(`'${leadData.name.replace(/'/g, "''")}'`, `'${leadData.phone.replace(/'/g, "''")}'`);
      
      if (leadData.email) {
        fields.push('email');
        values.push(`'${leadData.email.replace(/'/g, "''")}'`);
      }
      
      if (leadData.state) {
        fields.push('state');
        values.push(`'${leadData.state.replace(/'/g, "''")}'`);
      }
      
      if (leadData.source) {
        fields.push('source');
        values.push(`'${leadData.source.replace(/'/g, "''")}'`);
      }
      
      if (leadData.action_group) {
        fields.push('action_group');
        values.push(`'${leadData.action_group.replace(/'/g, "''")}'`);
      }
      
      if (leadData.action_type) {
        fields.push('action_type');
        values.push(`'${leadData.action_type.replace(/'/g, "''")}'`);
      }
      
      if (leadData.value) {
        fields.push('value');
        values.push(leadData.value.toString());
      }
      
      if (leadData.description) {
        fields.push('description');
        values.push(`'${leadData.description.replace(/'/g, "''")}'`);
      }

      const sql = `
        INSERT INTO ${schema}.leads (${fields.join(', ')})
        VALUES (${values.join(', ')})
      `;

      console.log('🔧 useTenantLeadOperations - Executando SQL de criação:', sql);

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: sql
      });

      if (error) {
        console.error('❌ Erro ao criar lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ useTenantLeadOperations - Lead criado com sucesso');
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao criar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao criar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (leadId: string, leadData: LeadUpdateData): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log(`🔄 useTenantLeadOperations - Atualizando lead ${leadId} no esquema do tenant...`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      // Primeiro, buscar o status atual do lead para registro no histórico
      let currentStatus = null;
      if (leadData.status) {
        const getCurrentStatusSql = `SELECT status FROM ${schema}.leads WHERE id = '${leadId}'`;
        console.log('🔍 Buscando status atual:', getCurrentStatusSql);
        
        const { data: currentData, error: getCurrentError } = await supabase.rpc('exec_sql' as any, {
          sql: getCurrentStatusSql
        });

        if (!getCurrentError && Array.isArray(currentData) && currentData.length > 0) {
          currentStatus = currentData[0].status;
        }
      }

      // Construir a query de update
      const updates = [];
      
      Object.entries(leadData).forEach(([key, value]) => {
        if (value === null) {
          updates.push(`${key} = NULL`);
        } else if (typeof value === 'string') {
          updates.push(`${key} = '${value.replace(/'/g, "''")}'`);
        } else {
          updates.push(`${key} = ${value}`);
        }
      });

      updates.push(`updated_at = now()`);

      const sql = `UPDATE ${schema}.leads SET ${updates.join(', ')} WHERE id = '${leadId}'`;
      console.log('🔧 useTenantLeadOperations - Executando SQL:', sql);

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: sql
      });

      if (error) {
        console.error('❌ Erro ao atualizar lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      // Se o status mudou, registrar no histórico manualmente
      if (leadData.status && currentStatus && currentStatus !== leadData.status) {
        const historyInsertSql = `
          INSERT INTO ${schema}.lead_status_history (lead_id, old_status, new_status, changed_at)
          VALUES ('${leadId}', '${currentStatus.replace(/'/g, "''")}', '${leadData.status.replace(/'/g, "''")}', now())
        `;
        console.log('📝 Inserindo histórico de status:', historyInsertSql);

        const { error: historyError } = await supabase.rpc('exec_sql' as any, {
          sql: historyInsertSql
        });

        if (historyError) {
          console.error('⚠️ Erro ao inserir histórico:', historyError);
        } else {
          console.log('✅ Histórico de status inserido com sucesso');
        }

        // Se mudou para "Contrato Fechado", registrar também na tabela global
        if (leadData.status === "Contrato Fechado") {
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
      }

      console.log('✅ useTenantLeadOperations - Lead atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createLead,
    updateLead,
    isLoading
  };
}
