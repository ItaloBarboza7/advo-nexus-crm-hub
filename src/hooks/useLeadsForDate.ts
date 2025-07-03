
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { BrazilTimezone } from '@/lib/timezone';

export interface LeadForDate {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  status: string;
  createdAt: Date;
  value?: number;
}

export function useLeadsForDate() {
  const [leads, setLeads] = useState<LeadForDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const { tenantSchema } = useTenantSchema();

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

  const fetchLeadsForDate = useCallback(async (selectedDate: Date) => {
    if (!selectedDate || !currentUser || !tenantSchema) {
      console.log("🚫 Dependências faltando para buscar leads");
      setLeads([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log("📅 Buscando leads cadastrados em:", BrazilTimezone.formatDateForDisplay(selectedDate));

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      
      // Corrigir a query para não usar user_id que não existe no esquema do tenant
      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, value
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
        ORDER BY created_at DESC
      `;

      console.log("📝 SQL Query useLeadsForDate:", sql);
      console.log("🔑 Current User ID:", currentUser.id);
      console.log("🏢 Tenant Schema:", tenantSchema);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      });

      if (error) {
        console.error("❌ Erro na consulta:", error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      console.log("🔍 Dados de leads recebidos:", data);

      // Processar e transformar os dados
      const leadsData = Array.isArray(data) ? data : [];
      
      const transformedLeads: LeadForDate[] = leadsData
        .filter((item: any) => item && typeof item === 'object')
        .map((lead: any) => {
          const leadDate = new Date(lead.created_at);
          
          return {
            id: lead.id || 'unknown',
            name: lead.name || 'Nome não informado',
            phone: lead.phone || '',
            email: lead.email || undefined,
            source: lead.source || undefined,
            status: lead.status || 'Novo',
            createdAt: leadDate,
            value: Number(lead.value) || undefined
          };
        });

      console.log("✅ Leads processados:", transformedLeads);
      setLeads(transformedLeads);
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar leads:', error);
      setError(error.message || "Erro ao carregar leads");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, tenantSchema]);

  return {
    leads,
    isLoading,
    error,
    currentUser,
    fetchLeadsForDate
  };
}
