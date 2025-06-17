
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

export function useTenantLeadOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

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
    updateLead,
    isLoading
  };
}
