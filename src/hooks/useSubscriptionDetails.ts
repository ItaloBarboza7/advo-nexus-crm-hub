
import { useState, useEffect, useCallback } from "react";
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
  isPending?: boolean;
  debugInfo?: any;
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

  const [refreshCount, setRefreshCount] = useState(0);

  const getSubDetails = useCallback(async () => {
    console.log("💳 useSubscriptionDetails - Iniciando verificação local de assinatura...");
    
    setDetails(d => ({ ...d, isLoading: true, error: undefined }));

    try {
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

      // 1. Primeiro, tentar buscar dados locais na tabela subscribers
      console.log("📊 Buscando dados locais da assinatura...");
      const { data: localSubscription, error: localError } = await supabase
        .from('subscribers')
        .select('*')
        .single();

      if (localError) {
        console.log("⚠️ Dados locais não encontrados:", localError.message);
      }

      // Verificar se os dados locais são recentes (menos de 5 minutos)
      const isDataFresh = localSubscription && 
        new Date(localSubscription.last_checked).getTime() > Date.now() - (5 * 60 * 1000);

      if (localSubscription && isDataFresh) {
        console.log("✅ Usando dados locais da assinatura:", localSubscription);
        
        // Se tem assinatura ativa localmente
        if (localSubscription.subscribed) {
          // Buscar detalhes do cartão via Stripe (apenas se necessário)
          let cardBrand = "";
          let cardLast4 = "";
          let cardExpMonth = "";
          let cardExpYear = "";

          try {
            const { data: stripeData } = await supabase.functions.invoke('get-stripe-details');
            if (stripeData?.success && stripeData.card_brand) {
              cardBrand = stripeData.card_brand;
              cardLast4 = stripeData.card_last4;
              cardExpMonth = stripeData.exp_month;
              cardExpYear = stripeData.exp_year;
            }
          } catch (error) {
            console.log("⚠️ Erro ao buscar detalhes do cartão:", error);
          }

          setDetails({
            plan: localSubscription.subscription_tier || "Plano Ativo",
            amount: localSubscription.subscription_tier?.includes("Mensal") ? 15700 : 9900,
            cardBrand,
            cardLast4,
            cardExp: cardExpMonth && cardExpYear ? `${cardExpMonth}/${cardExpYear}` : "",
            status: "active",
            isLoading: false,
            error: undefined,
            debugInfo: {
              source: "local_data",
              last_checked: localSubscription.last_checked,
              is_member_delegated: false // Será determinado pelo RLS automaticamente
            }
          });
          return;
        } else {
          // Dados locais indicam que não há assinatura
          setDetails({
            plan: "Nenhum plano ativo",
            amount: 0,
            cardBrand: "",
            cardLast4: "",
            cardExp: "",
            status: "inactive",
            isLoading: false,
            error: undefined,
            debugInfo: {
              source: "local_data",
              last_checked: localSubscription.last_checked
            }
          });
          return;
        }
      }

      // 2. Se não há dados locais ou estão desatualizados, atualizar via check-subscription
      console.log("🔄 Atualizando dados da assinatura via Stripe...");
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-subscription');

      if (checkError) {
        console.error("❌ Erro ao verificar assinatura:", checkError);
        setDetails({
          plan: "Erro ao carregar",
          amount: 0,
          cardBrand: "",
          cardLast4: "",
          cardExp: "",
          status: "error",
          isLoading: false,
          error: "Erro ao verificar assinatura. Tente novamente.",
          debugInfo: { error: checkError, source: "check_subscription_error" }
        });
        return;
      }

      if (!checkResult?.success) {
        console.error("❌ Falha na verificação:", checkResult);
        setDetails({
          plan: "Erro ao carregar",
          amount: 0,
          cardBrand: "",
          cardLast4: "",
          cardExp: "",
          status: "error",
          isLoading: false,
          error: checkResult?.error || "Falha na verificação da assinatura",
          debugInfo: { checkResult, source: "check_subscription_failed" }
        });
        return;
      }

      // 3. Dados atualizados com sucesso - usar resultado
      if (checkResult.subscribed) {
        // Buscar detalhes do cartão se necessário
        let cardBrand = "";
        let cardLast4 = "";
        let cardExpMonth = "";
        let cardExpYear = "";

        try {
          const { data: stripeData } = await supabase.functions.invoke('get-stripe-details');
          if (stripeData?.success && stripeData.card_brand) {
            cardBrand = stripeData.card_brand;
            cardLast4 = stripeData.card_last4;
            cardExpMonth = stripeData.exp_month;
            cardExpYear = stripeData.exp_year;
          }
        } catch (error) {
          console.log("⚠️ Erro ao buscar detalhes do cartão:", error);
        }

        setDetails({
          plan: checkResult.subscription_tier || "Plano Ativo",
          amount: checkResult.subscription_tier?.includes("Mensal") ? 15700 : 9900,
          cardBrand,
          cardLast4,
          cardExp: cardExpMonth && cardExpYear ? `${cardExpMonth}/${cardExpYear}` : "",
          status: "active",
          isLoading: false,
          error: undefined,
          debugInfo: {
            source: "fresh_check",
            is_member_delegated: checkResult.is_member,
            effective_user_id: checkResult.effective_user_id,
            last_checked: checkResult.last_checked
          }
        });
      } else {
        setDetails({
          plan: "Nenhum plano ativo",
          amount: 0,
          cardBrand: "",
          cardLast4: "",
          cardExp: "",
          status: "inactive",
          isLoading: false,
          error: undefined,
          debugInfo: {
            source: "fresh_check",
            is_member_delegated: checkResult.is_member,
            effective_user_id: checkResult.effective_user_id,
            last_checked: checkResult.last_checked
          }
        });
      }
      
    } catch (error) {
      console.error("❌ Erro inesperado ao verificar assinatura:", error);
      
      setDetails({
        plan: "Erro ao carregar",
        amount: 0,
        cardBrand: "",
        cardLast4: "",
        cardExp: "",
        status: "error",
        isLoading: false,
        error: "Erro de conexão. Tente novamente.",
        debugInfo: { 
          error: error instanceof Error ? error.message : String(error),
          source: "unexpected_error"
        }
      });
    }
  }, []);

  // Manual refresh function
  const refreshSubscription = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    setRefreshCount(prev => prev + 1);
    getSubDetails();
  }, [getSubDetails]);

  useEffect(() => {
    getSubDetails();
  }, [getSubDetails, refreshCount]);

  return {
    ...details,
    refreshSubscription
  };
}
