
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

      // Construir a query de update
      const updates = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(leadData).forEach(([key, value]) => {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      });

      updates.push(`updated_at = now()`);
      values.push(leadId); // Para a condição WHERE

      const sql = `
        UPDATE ${schema}.leads 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `;

      console.log('🔧 useTenantLeadOperations - Executando SQL:', sql);
      console.log('🔧 useTenantLeadOperations - Com valores:', values);

      const { error } = await supabase.rpc('exec_sql' as any, {
        sql: sql.replace(/\$\d+/g, (match, offset) => {
          const index = parseInt(match.substring(1)) - 1;
          const value = values[index];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          return String(value);
        })
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
