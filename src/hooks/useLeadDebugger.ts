
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSchema } from '@/hooks/useTenantSchema';

interface LeadDebugInfo {
  leadExists: boolean;
  leadData?: any;
  columnExists: boolean;
  columnData?: any;
  statusHistory?: any[];
  schemaInfo?: any;
}

export function useLeadDebugger() {
  const [debugInfo, setDebugInfo] = useState<LeadDebugInfo | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const { toast } = useToast();
  const { tenantSchema, ensureTenantSchema } = useTenantSchema();

  const debugLead = useCallback(async (leadName: string) => {
    try {
      setIsDebugging(true);
      console.log(`🔍 LeadDebugger - Iniciando debug do lead: ${leadName}`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return;
      }

      const info: LeadDebugInfo = {
        leadExists: false,
        columnExists: false
      };

      // 1. Verificar se o lead existe e obter seus dados
      console.log('🔍 Verificando existência do lead...');
      const { data: leadData, error: leadError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.leads WHERE name = '${leadName}'`
      });

      if (leadError) {
        console.error('❌ Erro ao buscar lead:', leadError);
      } else {
        const leads = Array.isArray(leadData) ? leadData : [];
        info.leadExists = leads.length > 0;
        info.leadData = leads[0] || null;
        console.log(`📊 Lead encontrado: ${info.leadExists}`, info.leadData);
      }

      // 2. Se o lead existe, verificar se a coluna do seu status existe
      if (info.leadExists && info.leadData?.status) {
        console.log(`🔍 Verificando coluna do status: ${info.leadData.status}`);
        const { data: columnData, error: columnError } = await supabase.rpc('exec_sql' as any, {
          sql: `SELECT * FROM ${schema}.kanban_columns WHERE name = '${info.leadData.status}'`
        });

        if (columnError) {
          console.error('❌ Erro ao buscar coluna:', columnError);
        } else {
          const columns = Array.isArray(columnData) ? columnData : [];
          info.columnExists = columns.length > 0;
          info.columnData = columns[0] || null;
          console.log(`📊 Coluna encontrada: ${info.columnExists}`, info.columnData);
        }
      }

      // 3. Obter histórico de status do lead
      if (info.leadExists && info.leadData?.id) {
        console.log('🔍 Buscando histórico de status...');
        const { data: historyData, error: historyError } = await supabase.rpc('exec_sql' as any, {
          sql: `SELECT * FROM ${schema}.lead_status_history WHERE lead_id = '${info.leadData.id}' ORDER BY changed_at DESC LIMIT 10`
        });

        if (historyError) {
          console.error('❌ Erro ao buscar histórico:', historyError);
        } else {
          info.statusHistory = Array.isArray(historyData) ? historyData : [];
          console.log(`📊 Histórico de status:`, info.statusHistory);
        }
      }

      // 4. Obter informações do esquema
      console.log('🔍 Verificando informações do esquema...');
      const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.kanban_columns ORDER BY order_position`
      });

      if (schemaError) {
        console.error('❌ Erro ao buscar colunas do esquema:', schemaError);
      } else {
        info.schemaInfo = {
          schema: schema,
          columns: Array.isArray(schemaData) ? schemaData : [],
          totalColumns: Array.isArray(schemaData) ? schemaData.length : 0
        };
        console.log(`📊 Informações do esquema:`, info.schemaInfo);
      }

      setDebugInfo(info);

      // Mostrar resumo do debug
      const summary = [];
      summary.push(`Lead "${leadName}" ${info.leadExists ? 'EXISTE' : 'NÃO EXISTE'}`);
      if (info.leadExists) {
        summary.push(`Status atual: "${info.leadData?.status}"`);
        summary.push(`Coluna "${info.leadData?.status}" ${info.columnExists ? 'EXISTE' : 'NÃO EXISTE'}`);
        summary.push(`Histórico de status: ${info.statusHistory?.length || 0} entradas`);
      }
      summary.push(`Esquema: ${schema} com ${info.schemaInfo?.totalColumns || 0} colunas`);

      toast({
        title: "Debug Concluído",
        description: summary.join(' | '),
      });

      return info;
    } catch (error) {
      console.error('❌ Erro inesperado durante debug:', error);
      toast({
        title: "Erro no Debug",
        description: "Ocorreu um erro durante a análise.",
        variant: "destructive"
      });
    } finally {
      setIsDebugging(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast]);

  const fixOrphanedLead = useCallback(async (leadName: string, targetStatus: string = 'Proposta') => {
    try {
      setIsDebugging(true);
      console.log(`🔧 LeadDebugger - Corrigindo lead órfão: ${leadName} -> ${targetStatus}`);
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return false;
      }

      // 1. Primeiro verificar se o lead existe
      const { data: leadData, error: leadError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.leads WHERE name = '${leadName}'`
      });

      if (leadError || !Array.isArray(leadData) || leadData.length === 0) {
        console.error('❌ Lead não encontrado:', leadError);
        toast({
          title: "Erro",
          description: "Lead não encontrado.",
          variant: "destructive"
        });
        return false;
      }

      const lead = leadData[0];
      const oldStatus = lead.status;

      // 2. Verificar se o status de destino existe
      const { data: columnData, error: columnError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${schema}.kanban_columns WHERE name = '${targetStatus}'`
      });

      if (columnError || !Array.isArray(columnData) || columnData.length === 0) {
        console.error('❌ Coluna de destino não encontrada:', columnError);
        toast({
          title: "Erro",
          description: `Coluna "${targetStatus}" não existe.`,
          variant: "destructive"
        });
        return false;
      }

      // 3. Atualizar o status do lead
      const { error: updateError } = await supabase.rpc('exec_sql' as any, {
        sql: `UPDATE ${schema}.leads SET status = '${targetStatus}', updated_at = now() WHERE id = '${lead.id}'`
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar lead:', updateError);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o lead.",
          variant: "destructive"
        });
        return false;
      }

      // 4. Adicionar entrada no histórico
      const { error: historyError } = await supabase.rpc('exec_sql' as any, {
        sql: `INSERT INTO ${schema}.lead_status_history (lead_id, old_status, new_status) VALUES ('${lead.id}', '${oldStatus}', '${targetStatus}')`
      });

      if (historyError) {
        console.error('⚠️ Erro ao inserir histórico (não crítico):', historyError);
      }

      console.log(`✅ Lead "${leadName}" corrigido: ${oldStatus} -> ${targetStatus}`);
      toast({
        title: "Lead Corrigido",
        description: `Lead "${leadName}" movido de "${oldStatus}" para "${targetStatus}".`,
      });

      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao corrigir lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao corrigir o lead.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsDebugging(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast]);

  const listOrphanedLeads = useCallback(async () => {
    try {
      setIsDebugging(true);
      console.log('🔍 LeadDebugger - Buscando leads órfãos...');
      
      const schema = tenantSchema || await ensureTenantSchema();
      if (!schema) {
        console.error('❌ Não foi possível obter o esquema do tenant');
        return [];
      }

      // Buscar leads cujo status não corresponde a nenhuma coluna existente
      const { data: orphanedData, error } = await supabase.rpc('exec_sql' as any, {
        sql: `
          SELECT l.*, 'ORPHANED' as issue_type
          FROM ${schema}.leads l
          LEFT JOIN ${schema}.kanban_columns kc ON l.status = kc.name
          WHERE kc.name IS NULL
        `
      });

      if (error) {
        console.error('❌ Erro ao buscar leads órfãos:', error);
        return [];
      }

      const orphanedLeads = Array.isArray(orphanedData) ? orphanedData : [];
      console.log(`📊 Encontrados ${orphanedLeads.length} leads órfãos:`, orphanedLeads);

      toast({
        title: "Análise Concluída",
        description: `Encontrados ${orphanedLeads.length} leads órfãos.`,
      });

      return orphanedLeads;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar leads órfãos:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante a busca.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsDebugging(false);
    }
  }, [tenantSchema, ensureTenantSchema, toast]);

  return {
    debugInfo,
    isDebugging,
    debugLead,
    fixOrphanedLead,
    listOrphanedLeads
  };
}
