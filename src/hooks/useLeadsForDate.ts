
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const { tenantSchema } = useTenantSchema();
  
  // Refs para controle de estado e prevenção de condições de corrida
  const isMountedRef = useRef(true);
  const currentRequestRef = useRef<string | null>(null);
  const lastSuccessfulDataRef = useRef<Lead[]>([]);

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

  // Limpar referências quando componente for desmontado
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLeadsForDate = useCallback(async (selectedDate: Date) => {
    if (!selectedDate || !currentUser || !tenantSchema) {
      console.log("🚫 Dependências faltando para buscar leads:", {
        selectedDate: !!selectedDate,
        currentUser: !!currentUser,
        tenantSchema: !!tenantSchema
      });
      // Manter dados anteriores se disponíveis
      if (lastSuccessfulDataRef.current.length === 0) {
        setLeads([]);
      }
      return;
    }

    const requestId = `date_${selectedDate.getTime()}_${Date.now()}`;
    currentRequestRef.current = requestId;

    try {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      console.log("📅 Buscando leads cadastrados em:", BrazilTimezone.formatDateForDisplay(selectedDate));

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      
      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, updated_at, value, user_id, 
          action_type, action_group, description, state, loss_reason, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
        ORDER BY created_at DESC
      `;

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      });

      // Verificar se esta requisição ainda é válida
      if (!isMountedRef.current || currentRequestRef.current !== requestId) {
        console.log("🚫 Requisição cancelada ou substituída");
        return;
      }

      if (error) {
        console.error("❌ Erro na consulta:", error);
        throw new Error(error.message || "Erro ao executar consulta");
      }

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

      console.log(`✅ ${transformedLeads.length} leads processados`);
      
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setLeads(transformedLeads);
        lastSuccessfulDataRef.current = transformedLeads;
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar leads:', error);
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setError(error.message || "Erro ao carregar leads");
        // Manter dados anteriores em caso de erro
        if (lastSuccessfulDataRef.current.length > 0) {
          setLeads(lastSuccessfulDataRef.current);
        } else {
          setLeads([]);
        }
      }
    } finally {
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [currentUser, tenantSchema]);

  const fetchLeadsForDateRange = useCallback(async (dateRange: DateRange) => {
    if (!dateRange.from || !currentUser || !tenantSchema) {
      console.log("🚫 Dependências faltando para buscar leads por período");
      // Manter dados anteriores se disponíveis
      if (lastSuccessfulDataRef.current.length === 0) {
        setLeads([]);
      }
      return;
    }

    const requestId = `range_${dateRange.from.getTime()}_${dateRange.to?.getTime() || 0}_${Date.now()}`;
    currentRequestRef.current = requestId;

    try {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      const fromDate = BrazilTimezone.formatDateForQuery(dateRange.from);
      const toDate = dateRange.to ? BrazilTimezone.formatDateForQuery(dateRange.to) : fromDate;
      
      console.log("📅 Buscando leads para período:", { fromDate, toDate });

      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, updated_at, value, user_id, 
          action_type, action_group, description, state, loss_reason, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY created_at DESC
      `;

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      });

      // Verificar se esta requisição ainda é válida
      if (!isMountedRef.current || currentRequestRef.current !== requestId) {
        console.log("🚫 Requisição de período cancelada ou substituída");
        return;
      }

      if (error) {
        console.error("❌ Erro na consulta de período:", error);
        throw new Error(error.message || "Erro ao executar consulta");
      }

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

      console.log(`✅ ${transformedLeads.length} leads encontrados no período`);
      
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setLeads(transformedLeads);
        lastSuccessfulDataRef.current = transformedLeads;
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar leads por período:', error);
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setError(error.message || "Erro ao carregar leads");
        // Manter dados anteriores em caso de erro
        if (lastSuccessfulDataRef.current.length > 0) {
          setLeads(lastSuccessfulDataRef.current);
        } else {
          setLeads([]);
        }
      }
    } finally {
      if (isMountedRef.current && currentRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [currentUser, tenantSchema]);

  return {
    leads,
    isLoading,
    error,
    currentUser,
    fetchLeadsForDate,
    fetchLeadsForDateRange
  };
}
