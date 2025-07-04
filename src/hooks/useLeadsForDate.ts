
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
  user_id?: string;
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

  const fetchLeadsForDate = useCallback(async (selectedDate: Date) => {
    if (!selectedDate || !currentUser || !tenantSchema) {
      console.log("🚫 Dependências faltando para buscar leads:", {
        selectedDate: !!selectedDate,
        currentUser: !!currentUser,
        tenantSchema: !!tenantSchema
      });
      setLeads([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log("📅 Buscando leads cadastrados em:", BrazilTimezone.formatDateForDisplay(selectedDate));
      console.log("👤 Para usuário:", currentUser.name, "(ID:", currentUser.id, ")");

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      console.log("📅 Data formatada para query:", dateString);
      
      // Try exec_sql first
      const sql = `
        SELECT 
          id, name, phone, email, source, status, created_at, value, user_id
        FROM ${tenantSchema}.leads
        WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
          AND user_id = '${currentUser.id}'
        ORDER BY created_at DESC
      `;

      console.log("🔍 Executando SQL para leads:", sql);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      });

      console.log("🔍 Dados brutos de leads recebidos:", data);
      console.log("🔍 Tipo dos dados:", typeof data);
      console.log("🔍 É array?", Array.isArray(data));

      let leadsData = [];
      
      // Check if exec_sql returned proper data
      if (Array.isArray(data)) {
        leadsData = data;
        console.log("✅ exec_sql retornou array com", data.length, "itens");
      } else if (data && typeof data === 'object' && 'affected_rows' in data) {
        console.log("⚠️ exec_sql retornou affected_rows, tentando fallback direto");
        
        // Fallback: Try direct query to tenant schema table
        try {
          const fallbackResult = await supabase
            .from(`${tenantSchema}.leads`)
            .select('id, name, phone, email, source, status, created_at, value, user_id')
            .eq('user_id', currentUser.id)
            .gte('created_at', BrazilTimezone.startOfDay(selectedDate).toISOString())
            .lt('created_at', BrazilTimezone.endOfDay(selectedDate).toISOString())
            .order('created_at', { ascending: false });

          if (fallbackResult.error) {
            console.error("❌ Erro no fallback direto:", fallbackResult.error);
          } else {
            leadsData = fallbackResult.data || [];
            console.log("✅ Fallback direto funcionou, encontrados", leadsData.length, "leads");
          }
        } catch (fallbackError) {
          console.error("❌ Erro no fallback direto:", fallbackError);
        }
      } else {
        console.log("⚠️ Dados não são um array:", typeof data, data);
        leadsData = [];
      }

      if (error) {
        console.error("❌ Erro na consulta exec_sql:", error);
        // Don't throw here, we might have fallback data
      }
      
      const transformedLeads: LeadForDate[] = leadsData
        .filter((item: any) => {
          if (!item || typeof item !== 'object') {
            console.log("🚫 Item inválido ignorado:", item);
            return false;
          }
          return true;
        })
        .map((lead: any) => {
          console.log("🔄 Processando lead:", lead);
          const leadDate = new Date(lead.created_at);
          
          return {
            id: lead.id || 'unknown',
            name: lead.name || 'Nome não informado',
            phone: lead.phone || '',
            email: lead.email || undefined,
            source: lead.source || undefined,
            status: lead.status || 'Novo',
            createdAt: leadDate,
            value: lead.value ? Number(lead.value) : undefined,
            user_id: lead.user_id
          };
        });

      console.log(`✅ ${transformedLeads.length} leads processados para ${currentUser.name}:`, transformedLeads);
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
