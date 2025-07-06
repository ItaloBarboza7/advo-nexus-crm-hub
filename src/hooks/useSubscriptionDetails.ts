
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionDetails {
  plan: string;
  amount: number;
  cardBrand: string;
  cardLast4: string;
  cardExp: string;
  status: string;
  isLoading: boolean;
  error?: string;
  subscriptionId?: string;
}

export function useSubscriptionDetails() {
  const [details, setDetails] = useState<SubscriptionDetails>({
    plan: "",
    amount: 0,
    cardBrand: "",
    cardLast4: "",
    cardExp: "",
    status: "",
    isLoading: true,
  });

  useEffect(() => {
    getSubDetails();
    // eslint-disable-next-line
  }, []);

  async function getSubDetails() {
    setDetails(d => ({ ...d, isLoading: true, error: undefined }));

    try {
      console.log("💳 useSubscriptionDetails - Iniciando busca de detalhes da assinatura...");
      
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("❌ Erro de autenticação:", authError);
        setDetails(d => ({ 
          ...d, 
          isLoading: false, 
          error: "Erro de autenticação. Faça login novamente." 
        }));
        return;
      }

      if (!user) {
        console.log("👤 Usuário não autenticado");
        setDetails(d => ({ 
          ...d, 
          isLoading: false, 
          error: "Usuário não autenticado" 
        }));
        return;
      }

      console.log("👤 Usuário autenticado:", user.email);

      // Nova função edge chamada 'get-stripe-details'
      const { data, error } = await supabase.functions.invoke('get-stripe-details');
      
      console.log("📊 Resposta da função get-stripe-details:", { data, error });
      
      if (error) {
        console.error("❌ Erro ao buscar detalhes do Stripe:", error);
        
        // Para novos usuários que ainda não têm assinatura, não mostrar erro
        if (error.message?.includes('No customer found') || 
            error.message?.includes('Customer not found') ||
            error.message?.includes('No subscription found')) {
          console.log("📝 Novo usuário sem assinatura ativa, usando valores padrão");
          setDetails({
            plan: "Nenhum plano ativo",
            amount: 0,
            cardBrand: "",
            cardLast4: "",
            cardExp: "",
            status: "inactive",
            isLoading: false,
            error: undefined
          });
          return;
        }
        
        setDetails(d => ({ 
          ...d, 
          isLoading: false, 
          error: `Erro ao carregar dados da assinatura: ${error.message}` 
        }));
        return;
      }

      if (!data || typeof data !== 'object') {
        console.log("📝 Dados de assinatura não encontrados, usuário sem plano ativo");
        setDetails({
          plan: "Nenhum plano ativo",
          amount: 0,
          cardBrand: "",
          cardLast4: "",
          cardExp: "",
          status: "inactive",
          isLoading: false,
          error: undefined
        });
        return;
      }

      console.log("✅ Detalhes da assinatura carregados com sucesso:", data);
      
      setDetails({
        plan: data.plan_name || "Plano não identificado",
        amount: data.amount || 0,
        cardBrand: data.card_brand || "",
        cardLast4: data.card_last4 || "",
        cardExp: data.exp_month && data.exp_year ? `${data.exp_month}/${data.exp_year}` : "",
        status: data.status || "unknown",
        isLoading: false,
        subscriptionId: data.subscription_id,
        error: undefined
      });
      
    } catch (error) {
      console.error("❌ Erro inesperado ao buscar detalhes da assinatura:", error);
      
      // Para novos usuários, isso pode ser normal
      setDetails({
        plan: "Nenhum plano ativo",
        amount: 0,
        cardBrand: "",
        cardLast4: "",
        cardExp: "",
        status: "inactive",
        isLoading: false,
        error: undefined // Não mostrar erro para novos usuários
      });
    }
  }

  return details;
}
