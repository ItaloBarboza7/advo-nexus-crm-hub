
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { BrazilTimezone } from '@/lib/timezone';

export function useLeadsForYear() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      return { id: user.id, name: profile?.name || 'Usuário' };
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      return null;
    }
  }, []);

  const fetchLeadsForCurrentYear = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("📅 useLeadsForYear - Buscando dados do ano atual completo");
      
      const user = await fetchCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      setCurrentUser(user);

      const now = BrazilTimezone.now();
      const startOfYear = new Date(now.getFullYear(), 0, 1); // 1º de janeiro
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // 31 de dezembro

      console.log("📅 useLeadsForYear - Período do ano:", {
        from: BrazilTimezone.formatDateForDisplay(startOfYear),
        to: BrazilTimezone.formatDateForDisplay(endOfYear)
      });

      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', startOfYear.toISOString())
        .lte('created_at', endOfYear.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const leadsData = data || [];
      console.log(`📊 useLeadsForYear - ${leadsData.length} leads encontrados para o ano atual`);
      
      setLeads(leadsData);
    } catch (error) {
      console.error('Erro ao buscar leads do ano:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  // Buscar dados automaticamente ao montar o componente
  useEffect(() => {
    fetchLeadsForCurrentYear();
  }, [fetchLeadsForCurrentYear]);

  return {
    leads,
    isLoading,
    error,
    currentUser,
    refetch: fetchLeadsForCurrentYear
  };
}
