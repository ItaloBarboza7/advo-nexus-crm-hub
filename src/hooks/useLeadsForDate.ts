
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { BrazilTimezone } from '@/lib/timezone';
import { DateRange } from 'react-day-picker';
import { Lead } from '@/types/lead';

export function useLeadsForDate() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const { tenantSchema, isLoading: schemaLoading, error: schemaError } = useTenantSchema();

  // Buscar usuário atual apenas uma vez
  useEffect(() => {
    let isMounted = true;
    
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("❌ Erro ao buscar usuário:", userError);
          if (isMounted) {
            setError("Erro de autenticação");
          }
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const userData = {
          id: user.id,
          name: profile?.name || user.email || 'Usuário'
        };
        
        console.log("✅ Usuário atual carregado:", userData);
        
        if (isMounted) {
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar usuário:", error);
        if (isMounted) {
          setError("Erro ao carregar dados do usuário");
        }
      }
    };

    getCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Função auxiliar para executar SQL com retry
  const executeWithRetry = async (sql: string, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Executando SQL:`, sql);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
          console.error(`❌ Erro na tentativa ${attempt}:`, error);
          if (attempt === maxRetries) {
            throw new Error(error.message || "Erro ao executar consulta");
          }
          // Aguardar antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        console.log(`✅ Sucesso na tentativa ${attempt}`);
        return data;
      } catch (error) {
        console.error(`❌ Erro inesperado na tentativa ${attempt}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  const fetchLeadsForDate = useCallback(async (selectedDate: Date) => {
    console.log("📅 fetchLeadsForDate chamado com:", {
      selectedDate: selectedDate ? BrazilTimezone.formatDateForDisplay(selectedDate) : 'null',
      currentUser: !!currentUser,
      tenantSchema,
      schemaLoading,
      schemaError
    });

    // Verificar se todas as dependências estão disponíveis
    if (!selectedDate || !currentUser) {
      console.log("🚫 Dependências básicas faltando:", {
        selectedDate: !!selectedDate,
        currentUser: !!currentUser
      });
      setLeads([]);
      return;
    }

    // Aguardar o schema estar disponível
    if (schemaLoading) {
      console.log("⏳ Aguardando carregamento do schema...");
      return;
    }

    if (schemaError) {
      console.error("❌ Erro no schema, não é possível continuar:", schemaError);
      setError(`Erro no schema: ${schemaError}`);
      return;
    }

    if (!tenantSchema) {
      console.log("🚫 Schema do tenant ainda não disponível");
      setError("Schema do tenant não disponível");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log("📅 Buscando leads cadastrados em:", BrazilTimezone.formatDateForDisplay(selectedDate));
      console.log("🏢 Para todos os usuários do tenant");

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      console.log("📅 Data formatada para query:", dateString);
      
      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, updated_at, value, user_id, 
          action_type, action_group, description, state, loss_reason, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
        ORDER BY created_at DESC
      `;

      const data = await executeWithRetry(sql);

      let leadsData = [];
      
      if (Array.isArray(data)) {
        leadsData = data;
        console.log("✅ Query retornou array com", data.length, "itens");
      } else {
        console.log("⚠️ Query não retornou um array:", typeof data, data);
        leadsData = [];
      }
      
      const transformedLeads: Lead[] = leadsData
        .filter((item: any) => {
          if (!item || typeof item !== 'object') {
            console.log("🚫 Item inválido ignorado:", item);
            return false;
          }
          return true;
        })
        .map((lead: any) => {
          console.log("🔄 Processando lead:", lead);
          
          return {
            id: lead.id || 'unknown',
            name: lead.name || 'Nome não informado',
            phone: lead.phone || '',
            email: lead.email || null,
            source: lead.source || null,
            status: lead.status || 'Novo',
            created_at: lead.created_at || new Date().toISOString(),
            updated_at: lead.updated_at || new Date().toISOString(),
            value: lead.value ? Number(lead.value) : null,
            user_id: lead.user_id || currentUser.id,
            action_type: lead.action_type || null,
            action_group: lead.action_group || null,
            description: lead.description || null,
            state: lead.state || null,
            loss_reason: lead.loss_reason || null,
            closed_by_user_id: lead.closed_by_user_id || null
          } as Lead;
        });

      console.log(`✅ ${transformedLeads.length} leads processados de todos os usuários:`, transformedLeads);
      setLeads(transformedLeads);
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar leads:', error);
      setError(error.message || "Erro ao carregar leads");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, tenantSchema, schemaLoading, schemaError]);

  const fetchLeadsForDateRange = useCallback(async (dateRange: DateRange) => {
    console.log("📅 fetchLeadsForDateRange chamado com:", {
      dateRange,
      currentUser: !!currentUser,
      tenantSchema,
      schemaLoading,
      schemaError
    });

    if (!dateRange.from || !currentUser) {
      console.log("🚫 Dependências básicas faltando para período:", {
        dateRange,
        currentUser: !!currentUser
      });
      setLeads([]);
      return;
    }

    // Aguardar o schema estar disponível
    if (schemaLoading) {
      console.log("⏳ Aguardando carregamento do schema para período...");
      return;
    }

    if (schemaError) {
      console.error("❌ Erro no schema para período:", schemaError);
      setError(`Erro no schema: ${schemaError}`);
      return;
    }

    if (!tenantSchema) {
      console.log("🚫 Schema do tenant não disponível para período");
      setError("Schema do tenant não disponível");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const fromDate = BrazilTimezone.formatDateForQuery(dateRange.from);
      const toDate = dateRange.to ? BrazilTimezone.formatDateForQuery(dateRange.to) : fromDate;
      
      console.log("📅 Buscando leads para período:", {
        from: BrazilTimezone.formatDateForDisplay(dateRange.from),
        to: dateRange.to ? BrazilTimezone.formatDateForDisplay(dateRange.to) : BrazilTimezone.formatDateForDisplay(dateRange.from),
        fromDate,
        toDate
      });

      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, updated_at, value, user_id, 
          action_type, action_group, description, state, loss_reason, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY created_at DESC
      `;

      const data = await executeWithRetry(sql);

      const leadsData = Array.isArray(data) ? data : [];
      
      const transformedLeads: Lead[] = leadsData
        .filter((item: any) => item && typeof item === 'object')
        .map((lead: any) => ({
          id: lead.id || 'unknown',
          name: lead.name || 'Nome não informado',
          phone: lead.phone || '',
          email: lead.email || null,
          source: lead.source || null,
          status: lead.status || 'Novo',
          created_at: lead.created_at || new Date().toISOString(),
          updated_at: lead.updated_at || new Date().toISOString(),
          value: lead.value ? Number(lead.value) : null,
          user_id: lead.user_id || currentUser.id,
          action_type: lead.action_type || null,
          action_group: lead.action_group || null,
          description: lead.description || null,
          state: lead.state || null,
          loss_reason: lead.loss_reason || null,
          closed_by_user_id: lead.closed_by_user_id || null
        } as Lead));

      console.log(`✅ ${transformedLeads.length} leads encontrados no período de todos os usuários`);
      setLeads(transformedLeads);
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar leads por período:', error);
      setError(error.message || "Erro ao carregar leads");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, tenantSchema, schemaLoading, schemaError]);

  return {
    leads,
    isLoading,
    error,
    currentUser,
    fetchLeadsForDate,
    fetchLeadsForDateRange,
    // Expor estados do schema para controle externo
    schemaLoading,
    schemaError,
    tenantSchema
  };
}
