
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
    console.log("💳 useSubscriptionDetails - Iniciando verificação de assinatura...");
    
    setDetails(d => ({ ...d, isLoading: true, error: undefined }));

    try {
      // Wait for user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log("👤 Usuário não autenticado");
        setDetails(d => ({ 
          ...d, 
          isLoading: false, 
          error: "Usuário não autenticado" 
        }));
        return;
      }

      console.log("👤 Usuário autenticado:", user.email);

      // Determine effective user ID (admin for members)
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('parent_user_id, email')
        .eq('user_id', user.id)
        .single();

      const effectiveUserId = userProfile?.parent_user_id || user.id;
      const isMember = !!userProfile?.parent_user_id;

      console.log("📊 Determinando usuário efetivo:", {
        originalUserId: user.id,
        effectiveUserId,
        isMember
      });

      // Check local subscription data using effective user ID
      console.log("📊 Buscando dados locais da assinatura...");
      const { data: localSubscription, error: localError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      const now = new Date();
      let needsRefresh = false;

      if (localError) {
        console.log("⚠️ Dados locais não encontrados:", localError.message);
        needsRefresh = true;
      } else if (localSubscription) {
        // Check if data is stale or inconsistent
        const lastChecked = new Date(localSubscription.last_checked);
        const isDataStale = now.getTime() - lastChecked.getTime() > (5 * 60 * 1000);
        
        const subscriptionEnd = localSubscription.subscription_end ? 
          new Date(localSubscription.subscription_end) : null;
        const hasActivePeriod = subscriptionEnd && subscriptionEnd > now;
        const isInconsistent = !localSubscription.subscribed && hasActivePeriod;

        if (isDataStale || isInconsistent) {
          console.log("🔄 Dados precisam ser atualizados");
          needsRefresh = true;
        }
      }

      if (needsRefresh) {
        // Update subscription data
        console.log("🔄 Atualizando dados da assinatura via Stripe...");
        const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-subscription');

        if (checkError || !checkResult?.success) {
          console.error("❌ Erro ao verificar assinatura:", checkError || checkResult);
          setDetails({
            plan: "Erro ao carregar",
            amount: 0,
            cardBrand: "",
            cardLast4: "",
            cardExp: "",
            status: "error",
            isLoading: false,
            error: checkResult?.error || "Erro ao verificar assinatura",
            debugInfo: { error: checkError || checkResult, source: "check_subscription_error" }
          });
          return;
        }

        // Use updated data
        const subscriptionEnd = checkResult.subscription_end ? 
          new Date(checkResult.subscription_end) : null;
        const hasActiveAccess = checkResult.subscribed || 
          (subscriptionEnd && subscriptionEnd > now);

        await updateDetailsWithData(checkResult, hasActiveAccess, "fresh_check", {
          is_member: checkResult.is_member,
          effective_user_id: checkResult.effective_user_id
        });
      } else {
        // Use local data
        const subscriptionEnd = localSubscription.subscription_end ? 
          new Date(localSubscription.subscription_end) : null;
        const hasActiveAccess = localSubscription.subscribed || 
          (subscriptionEnd && subscriptionEnd > now);

        console.log("✅ Usando dados locais:", {
          subscribed: localSubscription.subscribed,
          subscription_end: subscriptionEnd,
          hasActiveAccess,
          effectiveUserId,
          isMember
        });

        await updateDetailsWithData(localSubscription, hasActiveAccess, "local_data", {
          is_member: isMember,
          effective_user_id: effectiveUserId
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

  const updateDetailsWithData = async (subscriptionData: any, hasActiveAccess: boolean, source: string, extraInfo?: any) => {
    if (hasActiveAccess) {
      // Get card details if subscription is active
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
        plan: subscriptionData.subscription_tier || "Plano Ativo",
        amount: subscriptionData.subscription_tier?.includes("Mensal") ? 15700 : 9900,
        cardBrand,
        cardLast4,
        cardExp: cardExpMonth && cardExpYear ? `${cardExpMonth}/${cardExpYear}` : "",
        status: "active",
        isLoading: false,
        error: undefined,
        debugInfo: {
          source,
          subscribed: subscriptionData.subscribed,
          subscription_end: subscriptionData.subscription_end,
          is_member_delegated: extraInfo?.is_member || false,
          effective_user_id: extraInfo?.effective_user_id,
          last_checked: subscriptionData.last_checked
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
          source,
          subscribed: subscriptionData.subscribed,
          subscription_end: subscriptionData.subscription_end,
          is_member_delegated: extraInfo?.is_member || false,
          effective_user_id: extraInfo?.effective_user_id,
          last_checked: subscriptionData.last_checked
        }
      });
    }
  };

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
