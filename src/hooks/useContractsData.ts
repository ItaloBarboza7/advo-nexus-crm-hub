
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
      console.log("🚫 Dependências faltando para buscar contratos");
      setContracts([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log("📅 Buscando contratos para:", BrazilTimezone.formatDateForDisplay(selectedDate));

      const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
      
      // CORREÇÃO: Buscar contratos diretamente do esquema do tenant usando closed_by_user_id
      const sql = `
        SELECT 
          id, name, email, phone, value, status, 
          updated_at, closed_by_user_id
        FROM ${tenantSchema}.leads
        WHERE status = 'Contrato Fechado'
          AND closed_by_user_id = '${currentUser.id}'
          AND DATE(updated_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
        ORDER BY updated_at DESC
      `;

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sql
      });

      if (error) {
        console.error("❌ Erro na consulta:", error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      console.log("🔍 Dados de contratos recebidos:", data);

      // Processar e transformar os dados
      const contractsData = Array.isArray(data) ? data : [];
      
      const transformedContracts: ContractData[] = contractsData
        .filter((item: any) => {
          if (!item || typeof item !== 'object') {
            console.log("🚫 Contrato inválido ignorado:", item);
            return false;
          }
          
          const isUserContract = item.closed_by_user_id === currentUser.id;
          console.log(`🔍 Contrato ${item.name} - closed_by: ${item.closed_by_user_id}, current_user: ${currentUser.id}, match: ${isUserContract}`);
          
          return isUserContract;
        })
        .map((lead: any) => {
          const leadDate = new Date(lead.updated_at);
          
          return {
            id: lead.id || 'unknown',
            clientName: lead.name || 'Nome não informado',
            closedBy: currentUser.name,
            value: Number(lead.value) || 0,
            closedAt: leadDate,
            email: lead.email || undefined,
            phone: lead.phone || undefined
          };
        });

      console.log(`✅ Contratos processados (filtrados pelo usuário ${currentUser.name}):`, transformedContracts);
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
