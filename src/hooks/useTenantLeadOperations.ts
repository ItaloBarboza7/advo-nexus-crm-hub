
import { useToast } from "@/hooks/use-toast";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { supabase } from "@/integrations/supabase/client";

interface LeadData {
  name: string;
  phone: string;
  email?: string;
  description?: string;
  source?: string;
  state?: string;
  action_group?: string;
  action_type?: string;
}

export function useTenantLeadOperations() {
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const createLead = async (leadData: LeadData) => {
    try {
      console.log("🔄 useTenantLeadOperations - Criando lead no esquema do tenant...", leadData);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        toast({
          title: "Erro",
          description: "Não foi possível obter o esquema do tenant.",
          variant: "destructive"
        });
        return false;
      }

      // Construir os campos e valores dinamicamente
      const fields = ['name', 'phone', 'status'];
      const values = [`'${leadData.name}'`, `'${leadData.phone}'`, `'Novo'`];

      if (leadData.email) {
        fields.push('email');
        values.push(`'${leadData.email}'`);
      }

      if (leadData.description) {
        fields.push('description');
        values.push(`'${leadData.description.replace(/'/g, "''")}'`);
      }

      if (leadData.source) {
        fields.push('source');
        values.push(`'${leadData.source}'`);
      }

      if (leadData.state) {
        fields.push('state');
        values.push(`'${leadData.state}'`);
      }

      if (leadData.action_group) {
        fields.push('action_group');
        values.push(`'${leadData.action_group}'`);
      }

      if (leadData.action_type) {
        fields.push('action_type');
        values.push(`'${leadData.action_type}'`);
      }

      const sql = `INSERT INTO ${schema}.leads (${fields.join(', ')}) VALUES (${values.join(', ')})`;
      console.log("🔍 SQL gerado:", sql);

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

      console.log(`✅ useTenantLeadOperations - Lead criado com sucesso no esquema ${schema}`);
      toast({
        title: "Sucesso!",
        description: "Lead criado com sucesso!",
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
    }
  };

  return {
    createLead
  };
}
