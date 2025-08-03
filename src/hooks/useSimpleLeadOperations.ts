import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useLeadOperationsMonitoring } from '@/hooks/useLeadOperationsMonitoring';

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

interface LeadUpdateData {
  name?: string;
  email?: string | null;
  phone?: string;
  state?: string | null;
  source?: string | null;
  status?: string;
  action_group?: string | null;
  action_type?: string | null;
  value?: number | null;
  description?: string | null;
  loss_reason?: string | null;
}

export function useSimpleLeadOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();
  const { trackCreation, trackUpdate, trackDeletion } = useLeadOperationsMonitoring();

  const createLead = useCallback(async (leadData: LeadCreateData): Promise<boolean> => {
    const startTime = Date.now();
    try {
      setIsLoading(true);
      console.log('🔄 useSimpleLeadOperations - Criando lead...');
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Schema do tenant não disponível');
        trackCreation(false, Date.now() - startTime, 'Schema do tenant não disponível');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ Usuário não autenticado');
        trackCreation(false, Date.now() - startTime, 'Usuário não autenticado');
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive"
        });
        return false;
      }

      // Construir campos e valores para insert
      const fields = ['name', 'phone', 'user_id'];
      const values = [
        `'${leadData.name.replace(/'/g, "''")}'`,
        `'${leadData.phone.replace(/'/g, "''")}'`,
        `'${user.id}'`
      ];
      
      // Adicionar campos opcionais
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

      const sql = `INSERT INTO ${schema}.leads (${fields.join(', ')}) VALUES (${values.join(', ')})`;
      console.log('🔧 SQL de criação:', sql);

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error('❌ Erro ao criar lead:', error);
        trackCreation(false, Date.now() - startTime, error.message);
        toast({
          title: "Erro",
          description: "Não foi possível criar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log('✅ Lead criado com sucesso');
      trackCreation(true, Date.now() - startTime);
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso.",
      });
      return true;
    } catch (error: any) {
      console.error('❌ Erro inesperado ao criar lead:', error);
      trackCreation(false, Date.now() - startTime, error.message);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao criar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast, trackCreation]);

  const updateLead = useCallback(async (leadId: string, updates: LeadUpdateData, context: 'kanban' | 'list' = 'list'): Promise<boolean> => {
    const startTime = Date.now();
    try {
      setIsLoading(true);
      console.log(`🔄 useSimpleLeadOperations - Atualizando lead ${leadId}:`, updates);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Schema do tenant não disponível');
        trackUpdate(leadId, false, Date.now() - startTime, context, 'Schema do tenant não disponível');
        return false;
      }

      // Construir a query de update
      const setParts: string[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          setParts.push(`${key} = NULL`);
        } else if (typeof value === 'string') {
          setParts.push(`${key} = '${value.replace(/'/g, "''")}'`);
        } else if (typeof value === 'number') {
          setParts.push(`${key} = ${value}`);
        }
      });

      setParts.push('updated_at = now()');

      const sql = `UPDATE ${schema}.leads SET ${setParts.join(', ')} WHERE id = '${leadId}'`;
      console.log('🔧 SQL de atualização:', sql);

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error('❌ Erro ao atualizar lead:', error);
        trackUpdate(leadId, false, Date.now() - startTime, context, error.message);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log(`✅ Lead ${leadId} atualizado com sucesso`);
      trackUpdate(leadId, true, Date.now() - startTime, context);
      return true;
    } catch (error: any) {
      console.error('❌ Erro inesperado ao atualizar lead:', error);
      trackUpdate(leadId, false, Date.now() - startTime, context, error.message);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast, trackUpdate]);

  const deleteLead = useCallback(async (leadId: string, context: 'kanban' | 'list' = 'list'): Promise<boolean> => {
    const startTime = Date.now();
    try {
      setIsLoading(true);
      console.log(`🗑️ useSimpleLeadOperations - Deletando lead ${leadId}... (context: ${context})`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Schema do tenant não disponível');
        trackDeletion(leadId, false, Date.now() - startTime, context, 'Schema do tenant não disponível');
        toast({
          title: "Erro",
          description: "Schema do tenant não disponível.",
          variant: "destructive"
        });
        return false;
      }

      // SQL simples e direto para exclusão - igual ao que funciona no Kanban
      const sql = `DELETE FROM ${schema}.leads WHERE id = '${leadId}'`;
      console.log('🔧 SQL de exclusão:', sql);

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error('❌ Erro ao excluir lead:', error);
        trackDeletion(leadId, false, Date.now() - startTime, context, error.message);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o lead.",
          variant: "destructive"
        });
        return false;
      }

      console.log(`✅ Lead ${leadId} excluído com sucesso`);
      trackDeletion(leadId, true, Date.now() - startTime, context);
      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso.",
      });
      return true;
    } catch (error: any) {
      console.error('❌ Erro inesperado ao excluir lead:', error);
      trackDeletion(leadId, false, Date.now() - startTime, context, error.message);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast, trackDeletion]);

  return {
    createLead,
    updateLead,
    deleteLead,
    isLoading
  };
}
