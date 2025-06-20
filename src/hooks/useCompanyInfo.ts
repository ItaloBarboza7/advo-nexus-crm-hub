
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanyInfo {
  id: string;
  company_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
}

export function useCompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompanyInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[useCompanyInfo] Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      console.log('[useCompanyInfo] Buscando informações da empresa para usuário:', user.id);

      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useCompanyInfo] Erro ao buscar informações da empresa:', error);
        setIsLoading(false);
        return;
      }

      if (!data) {
        console.warn('[useCompanyInfo] Nenhuma informação de empresa encontrada para este usuário:', user.id);
      } else {
        console.log('[useCompanyInfo] Informações da empresa encontradas:', data);
      }
      setCompanyInfo(data || null);
    } catch (error) {
      console.error('[useCompanyInfo] Erro inesperado ao buscar informações da empresa:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para sincronizar informações da empresa com o perfil do usuário
  const syncUserProfile = async (email: string, phone: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[useCompanyInfo] Usuário não encontrado para sincronização');
        return false;
      }

      console.log('[useCompanyInfo] Sincronizando perfil do usuário com dados da empresa');

      // Verificar se já existe um perfil para este usuário
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[useCompanyInfo] Erro ao verificar perfil existente:', checkError);
        return false;
      }

      const profileData = {
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

      if (existingProfile) {
        // Atualizar perfil existente
        console.log('[useCompanyInfo] Atualizando perfil existente');
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) {
          console.error('[useCompanyInfo] Erro ao atualizar perfil:', error);
          return false;
        } else {
          console.log('[useCompanyInfo] Perfil sincronizado com sucesso');
          return true;
        }
      } else {
        // Criar novo perfil com dados básicos
        console.log('[useCompanyInfo] Criando novo perfil');
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
            ...profileData
          });

        if (error) {
          console.error('[useCompanyInfo] Erro ao criar perfil:', error);
          return false;
        } else {
          console.log('[useCompanyInfo] Perfil criado e sincronizado com sucesso');
          return true;
        }
      }
    } catch (error) {
      console.error('[useCompanyInfo] Erro inesperado na sincronização:', error);
      return false;
    }
  };

  // OTIMIZADO: Exposed refresh function for manual reload
  const refreshCompanyInfo = useCallback(async () => {
    console.log('[useCompanyInfo] Forçando atualização das informações da empresa');
    await fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  const updateCompanyInfo = async (updatedInfo: Omit<CompanyInfo, 'id'>) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return false;
      }

      console.log('[useCompanyInfo] Atualizando informações da empresa:', updatedInfo);

      // Primeiro, verificar se já existe um registro para este usuário
      const { data: existingCompany, error: checkError } = await supabase
        .from('company_info')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[useCompanyInfo] Erro ao verificar empresa existente:', checkError);
        toast({
          title: "Erro",
          description: "Não foi possível verificar as informações existentes.",
          variant: "destructive",
        });
        return false;
      }

      let error;
      if (existingCompany) {
        // Atualizar registro existente
        console.log('[useCompanyInfo] Atualizando registro existente:', existingCompany.id);
        const { error: updateError } = await supabase
          .from('company_info')
          .update(updatedInfo)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Criar novo registro
        console.log('[useCompanyInfo] Criando novo registro');
        const { error: insertError } = await supabase
          .from('company_info')
          .insert({
            user_id: user.id,
            ...updatedInfo
          });
        error = insertError;
      }

      if (error) {
        console.error('[useCompanyInfo] Erro ao atualizar informações da empresa:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar as informações da empresa.",
          variant: "destructive",
        });
        return false;
      }

      // Sincronizar perfil do usuário com email e telefone da empresa
      console.log('[useCompanyInfo] Iniciando sincronização do perfil...');
      const syncSuccess = await syncUserProfile(updatedInfo.email, updatedInfo.phone);

      if (!syncSuccess) {
        console.warn('[useCompanyInfo] Sincronização do perfil falhou, mas dados da empresa foram salvos');
      }

      toast({
        title: "Sucesso",
        description: "Informações da empresa atualizadas com sucesso.",
      });

      // OTIMIZADO: Atualizar estado local imediatamente
      const newCompanyInfo = existingCompany 
        ? { ...companyInfo, ...updatedInfo } as CompanyInfo
        : { ...updatedInfo, id: 'temp' } as CompanyInfo;
      
      setCompanyInfo(newCompanyInfo);

      // Buscar dados atualizados do banco
      setTimeout(() => {
        fetchCompanyInfo();
      }, 100);
      
      return true;
    } catch (error) {
      console.error('[useCompanyInfo] Erro inesperado ao atualizar informações da empresa:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao atualizar as informações.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  // OTIMIZADO: Configurar listener para mudanças em real-time
  useEffect(() => {
    const setupRealtimeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('[useCompanyInfo] Configurando listener para mudanças em tempo real');
      
      const channel = supabase
        .channel('company_and_profile_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'company_info',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[useCompanyInfo] Mudança na empresa detectada:', payload);
            // Recarregar dados quando houver mudança
            setTimeout(() => {
              fetchCompanyInfo();
            }, 100);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[useCompanyInfo] Mudança no perfil detectada:', payload);
            // Notificar sobre mudança no perfil para atualização do header
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('userProfileUpdated'));
            }, 50);
          }
        )
        .subscribe();

      return () => {
        console.log('[useCompanyInfo] Removendo listener');
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeListener();
  }, [fetchCompanyInfo]);

  return {
    companyInfo,
    isLoading,
    fetchCompanyInfo,
    refreshCompanyInfo,
    updateCompanyInfo
  };
}
