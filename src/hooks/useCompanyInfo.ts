
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
        console.log('Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      console.log('[CompanyInfo] Buscando informações da empresa para usuário:', user.id);

      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[CompanyInfo] Erro ao buscar informações da empresa:', error);
        setIsLoading(false);
        return;
      }

      if (!data) {
        console.warn('[CompanyInfo] Nenhuma informação de empresa encontrada para este usuário:', user.id);
      } else {
        console.log('[CompanyInfo] Informações da empresa encontradas:', data);
      }
      setCompanyInfo(data || null);
    } catch (error) {
      console.error('[CompanyInfo] Erro inesperado ao buscar informações da empresa:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Exposed refresh function for manual reload
  const refreshCompanyInfo = () => {
    fetchCompanyInfo();
  };

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

      console.log('[CompanyInfo] Atualizando informações da empresa:', updatedInfo);

      // Primeiro, verificar se já existe um registro para este usuário
      const { data: existingCompany, error: checkError } = await supabase
        .from('company_info')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[CompanyInfo] Erro ao verificar empresa existente:', checkError);
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
        console.log('[CompanyInfo] Atualizando registro existente:', existingCompany.id);
        const { error: updateError } = await supabase
          .from('company_info')
          .update(updatedInfo)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Criar novo registro
        console.log('[CompanyInfo] Criando novo registro');
        const { error: insertError } = await supabase
          .from('company_info')
          .insert({
            user_id: user.id,
            ...updatedInfo
          });
        error = insertError;
      }

      if (error) {
        console.error('[CompanyInfo] Erro ao atualizar informações da empresa:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar as informações da empresa.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Sucesso",
        description: "Informações da empresa atualizadas com sucesso.",
      });

      // Atualizar estado local
      if (existingCompany) {
        setCompanyInfo(prevInfo => 
          prevInfo ? { ...prevInfo, ...updatedInfo } : null
        );
      } else {
        // Buscar o registro recém-criado para obter o ID
        await fetchCompanyInfo();
      }
      
      return true;
    } catch (error) {
      console.error('[CompanyInfo] Erro inesperado ao atualizar informações da empresa:', error);
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

  return {
    companyInfo,
    isLoading,
    fetchCompanyInfo,
    refreshCompanyInfo,
    updateCompanyInfo
  };
}
