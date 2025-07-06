
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { BrazilTimezone } from '@/lib/timezone';

export interface ContractData {
  id: string;
  clientName: string;
  closedBy: string;
  value: number;
  closedAt: Date;
  email?: string;
  phone?: string;
}

export function useContractsData() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
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
        
        console.log("✅ Usuário atual carregado para contratos:", userData);
        
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

  const fetchContractsForDate = useCallback(async (selectedDate: Date) => {
    if (!selectedDate || !currentUser || !tenantSchema) {
      console.log("🚫 Dependências faltando para buscar contratos:", {
        selectedDate: !!selectedDate,
        currentUser: !!currentUser,
        tenantSchema: !!tenantSchema
      });
      setContracts([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log("📅 Buscando contratos fechados em:", BrazilTimezone.formatDateForDisplay(selectedDate));
      console.log("🏢 Para todos os usuários do tenant");

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      console.log("📅 Data formatada para query:", dateString);
      
      // Removido filtro de closed_by_user_id para buscar todos os contratos do tenant
      const sql = `
        SELECT 
          l.id, l.name, l.email, l.phone, l.value, l.status, l.updated_at, l.closed_by_user_id,
          up.name as closed_by_name
        FROM ${tenantSchema}.leads l
        LEFT JOIN public.user_profiles up ON l.closed_by_user_id = up.user_id
        WHERE l.status = 'Contrato Fechado'
          AND DATE(l.updated_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
        ORDER BY l.updated_at DESC
      `;

      console.log("🔍 Executando SQL para contratos:", sql);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      });

      console.log("🔍 Dados brutos de contratos recebidos:", data);

      if (error) {
        console.error("❌ Erro na consulta exec_sql:", error);
        throw new Error(error.message || "Erro ao executar consulta");
      }

      let contractsData = [];
      
      if (Array.isArray(data)) {
        contractsData = data;
        console.log("✅ Query retornou array com", data.length, "itens");
      } else {
        console.log("⚠️ Query não retornou um array:", typeof data, data);
        contractsData = [];
      }
      
      const transformedContracts: ContractData[] = contractsData
        .filter((item: any) => {
          if (!item || typeof item !== 'object') {
            console.log("🚫 Contrato inválido ignorado:", item);
            return false;
          }
          return true;
        })
        .map((lead: any) => {
          console.log("🔄 Processando contrato:", lead);
          const leadDate = new Date(lead.updated_at);
          
          return {
            id: lead.id || 'unknown',
            clientName: lead.name || 'Nome não informado',
            closedBy: lead.closed_by_name || 'Usuário desconhecido',
            value: lead.value ? Number(lead.value) : 0,
            closedAt: leadDate,
            email: lead.email || undefined,
            phone: lead.phone || undefined
          };
        });

      console.log(`✅ ${transformedContracts.length} contratos processados de todos os usuários:`, transformedContracts);
      setContracts(transformedContracts);
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar contratos:', error);
      setError(error.message || "Erro ao carregar contratos");
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, tenantSchema]);

  return {
    contracts,
    isLoading,
    error,
    currentUser,
    fetchContractsForDate
  };
}
