
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useLeadsDebugger } from '@/hooks/useLeadsDebugger';
import { 
  LeadRecord, 
  toLeadRecordArray, 
  toStatusResult,
  toCountResultArray
} from '@/utils/typeGuards';

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

export function useEnhancedTenantLeadOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const { addDebugLog, startOperation, endOperation } = useLeadsDebugger();

  // Enhanced lead creation with verification
  const createLead = useCallback(async (leadData: LeadCreateData): Promise<boolean> => {
    try {
      setIsLoading(true);
      startOperation('create_lead_enhanced');
      
      addDebugLog('create_lead_start', { leadData: { ...leadData, phone: '***' } }, true);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        endOperation('create_lead_enhanced', { error: 'No tenant schema' }, false);
        return false;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        endOperation('create_lead_enhanced', { error: 'User not authenticated' }, false);
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive"
        });
        return false;
      }

      // Build insert query with all available fields
      const fields = ['name', 'phone', 'user_id'];
      const values = [
        `'${leadData.name.replace(/'/g, "''")}'`, 
        `'${leadData.phone.replace(/'/g, "''")}'`, 
        `'${user.id}'`
      ];
      
      // Add optional fields
      const optionalFields = ['email', 'state', 'source', 'action_group', 'action_type', 'value', 'description'];
      optionalFields.forEach(field => {
        const value = leadData[field as keyof LeadCreateData];
        if (value !== undefined && value !== null && value !== '') {
          fields.push(field);
          if (typeof value === 'string') {
            values.push(`'${value.replace(/'/g, "''")}'`);
          } else {
            values.push(value.toString());
          }
        }
      });

      // Create lead without RETURNING clause since exec_sql for INSERT doesn't support it properly
      const sql = `
        INSERT INTO ${schema}.leads (${fields.join(', ')})
        VALUES (${values.join(', ')})
      `;

      addDebugLog('create_lead_sql', { sql: sql.replace(/'\d+'/g, "'***'") }, true);

      const { data, error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        endOperation('create_lead_enhanced', { error, sql: 'redacted' }, false);
        console.error('❌ Erro ao criar lead:', error);
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead.",
          variant: "destructive"
        });
        return false;
      }

      // Check if INSERT was successful (exec_sql returns { affected_rows: number } for INSERTs)
      if (!data || (typeof data === 'object' && 'affected_rows' in data && data.affected_rows === 0)) {
        endOperation('create_lead_enhanced', { error: 'No rows affected', data }, false);
        toast({
          title: "Erro",
          description: "Lead não foi criado.",
          variant: "destructive"
        });
        return false;
      }

      addDebugLog('create_lead_insert_result', { data }, true);

      // Query the most recently created lead for this user to verify creation
      const verificationSql = `
        SELECT id, name, phone, created_at 
        FROM ${schema}.leads 
        WHERE user_id = '${user.id}' 
        AND name = '${leadData.name.replace(/'/g, "''")}'
        AND phone = '${leadData.phone.replace(/'/g, "''")}'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const { data: verificationData, error: verificationError } = await supabase.rpc('exec_sql', { 
        sql: verificationSql 
      });

      const verificationResult = toLeadRecordArray(verificationData || []);
      if (verificationError || verificationResult.length === 0) {
        endOperation('create_lead_enhanced', { 
          verificationError, 
          verificationData,
          message: 'Lead creation verification failed' 
        }, false);
        
        toast({
          title: "Aviso",
          description: "Lead pode ter sido criado mas verificação falhou. Recarregue a página.",
          variant: "destructive"
        });
        return false;
      }

      const createdLead = verificationResult[0];

      endOperation('create_lead_enhanced', { 
        createdLead: { id: createdLead.id, name: createdLead.name },
        verified: true 
      }, true);
      
      addDebugLog('create_lead_success', { 
        leadId: createdLead.id, 
        leadName: createdLead.name 
      }, true);
      
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      
      return true;
    } catch (error: any) {
      endOperation('create_lead_enhanced', { error: error.message }, false);
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
  }, [tenantSchema, ensureTenantSchema, toast, addDebugLog, startOperation, endOperation]);

  // Enhanced delete operation with comprehensive verification
  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      startOperation('delete_lead_enhanced');
      
      addDebugLog('delete_lead_start', { leadId }, true);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        endOperation('delete_lead_enhanced', { error: 'No tenant schema' }, false);
        return false;
      }

      // Step 1: Verify lead exists and get its current data
      const checkSql = `SELECT id, name, status FROM ${schema}.leads WHERE id = '${leadId}'`;
      const { data: existingLead, error: checkError } = await supabase.rpc('exec_sql', { sql: checkSql });

      if (checkError) {
        endOperation('delete_lead_enhanced', { checkError }, false);
        addDebugLog('delete_lead_check_error', { leadId, checkError }, false);
        return false;
      }

      const existingLeadData = toLeadRecordArray(existingLead || []);
      if (existingLeadData.length === 0) {
        endOperation('delete_lead_enhanced', { error: 'Lead not found', leadId }, false);
        addDebugLog('delete_lead_not_found', { leadId }, false);
        toast({
          title: "Erro",
          description: "Lead não encontrado.",
          variant: "destructive"
        });
        return false;
      }

      const leadInfo = existingLeadData[0];
      addDebugLog('delete_lead_found', { leadInfo }, true);

      // Step 2: Check for any database triggers that might interfere
      const triggersSql = `
        SELECT trigger_name, action_statement 
        FROM information_schema.triggers 
        WHERE trigger_schema = '${schema}' 
        AND table_name = 'leads' 
        AND event_manipulation = 'DELETE'
      `;
      
      const { data: triggers } = await supabase.rpc('exec_sql', { sql: triggersSql });
      addDebugLog('delete_triggers_check', { triggers }, true);

      // Step 3: Attempt the deletion
      const deleteSql = `DELETE FROM ${schema}.leads WHERE id = '${leadId}'`;
      addDebugLog('delete_lead_executing', { sql: deleteSql }, true);
      
      const { data: deleteResult, error: deleteError } = await supabase.rpc('exec_sql', { sql: deleteSql });

      if (deleteError) {
        endOperation('delete_lead_enhanced', { deleteError, sql: deleteSql }, false);
        addDebugLog('delete_lead_error', { leadId, deleteError }, false);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o lead.",
          variant: "destructive"
        });
        return false;
      }

      // Step 4: Multiple verification methods
      
      // Method 1: Check if lead still exists
      const verify1Sql = `SELECT COUNT(*) as count FROM ${schema}.leads WHERE id = '${leadId}'`;
      const { data: verify1Data, error: verify1Error } = await supabase.rpc('exec_sql', { sql: verify1Sql });
      
      // Method 2: Check if lead status was changed instead of deleted
      const verify2Sql = `SELECT id, status FROM ${schema}.leads WHERE id = '${leadId}'`;
      const { data: verify2Data, error: verify2Error } = await supabase.rpc('exec_sql', { sql: verify2Sql });

      const verify1Result = toCountResultArray(verify1Data || []);
      const verify2Result = toLeadRecordArray(verify2Data || []);

      const stillExists = !verify1Error && verify1Result.length > 0 && verify1Result[0].count > 0;
      const statusChanged = !verify2Error && verify2Result.length > 0 && 
                           verify2Result[0].status !== leadInfo.status;

      addDebugLog('delete_verification', {
        stillExists,
        statusChanged,
        originalStatus: leadInfo.status,
        currentStatus: verify2Result?.[0]?.status,
        verify1Data,
        verify2Data
      }, !stillExists);

      if (stillExists) {
        if (statusChanged) {
          endOperation('delete_lead_enhanced', { 
            error: 'Lead status changed instead of deleted',
            originalStatus: leadInfo.status,
            newStatus: verify2Result[0].status 
          }, false);
          
          toast({
            title: "Erro",
            description: `Lead não foi excluído. Status foi alterado para "${verify2Result[0].status}".`,
            variant: "destructive"
          });
        } else {
          endOperation('delete_lead_enhanced', { error: 'Lead still exists after delete' }, false);
          
          toast({
            title: "Erro",
            description: "Lead não foi excluído corretamente.",
            variant: "destructive"
          });
        }
        return false;
      }

      // Step 5: Success confirmation
      endOperation('delete_lead_enhanced', { 
        leadId, 
        leadName: leadInfo.name,
        verified: true,
        deleteResult 
      }, true);
      
      addDebugLog('delete_lead_success', { leadId, leadName: leadInfo.name }, true);
      
      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso.",
      });
      
      return true;
    } catch (error: any) {
      endOperation('delete_lead_enhanced', { error: error.message }, false);
      console.error('❌ Erro inesperado ao excluir lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast, addDebugLog, startOperation, endOperation]);

  // Enhanced update with better status tracking
  const updateLead = useCallback(async (leadId: string, leadData: LeadUpdateData): Promise<boolean> => {
    try {
      setIsLoading(true);
      startOperation('update_lead_enhanced');
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        endOperation('update_lead_enhanced', { error: 'No tenant schema' }, false);
        return false;
      }

      // Build update query
      const updates: string[] = [];
      
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
      
      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        endOperation('update_lead_enhanced', { error, sql: 'redacted' }, false);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      // ⚠️ REMOVIDO: Não inserir manualmente no histórico de status
      // O trigger track_lead_status_changes_trigger já cuida disso automaticamente

      // Handle contract closure tracking apenas se status mudou para "Contrato Fechado"
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
          
          await supabase.rpc('exec_sql', { sql: contractClosureSql });
        }
      }

      endOperation('update_lead_enhanced', { leadId, updatedFields: Object.keys(leadData) }, true);
      return true;
    } catch (error: any) {
      endOperation('update_lead_enhanced', { error: error.message }, false);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast, addDebugLog, startOperation, endOperation]);

  return {
    createLead,
    updateLead,
    deleteLead,
    isLoading
  };
}
