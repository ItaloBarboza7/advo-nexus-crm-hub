
import { useState, useEffect } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCompanyInfo = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar informações da empresa:', error);
        return;
      }

      setCompanyInfo(data);
    } catch (error) {
      console.error('Erro inesperado ao buscar informações da empresa:', error);
    } finally {
      setIsLoading(false);
    }
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

      const { error } = await supabase
        .from('company_info')
        .upsert({
          user_id: user.id,
          ...updatedInfo
        });

      if (error) {
        console.error('Erro ao atualizar informações da empresa:', error);
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

      await fetchCompanyInfo(); // Recarregar dados
      return true;
    } catch (error) {
      console.error('Erro inesperado ao atualizar informações da empresa:', error);
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
  }, []);

  return {
    companyInfo,
    isLoading,
    fetchCompanyInfo,
    updateCompanyInfo
  };
}
