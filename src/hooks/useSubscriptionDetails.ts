
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
    console.log("💳 useSubscriptionDetails - Iniciando busca de detalhes da assinatura...");
    
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
      console.log("📊 Metadados do usuário:", user.user_metadata);

      // Chamar função edge melhorada 'get-stripe-details'
      const { data, error } = await supabase.functions.invoke('get-stripe-details');
      
      console.log("📊 Resposta da função get-stripe-details:", { data, error });
      
      if (error) {
        console.error("❌ Erro ao buscar detalhes do Stripe:", error);
        setDetails(d => ({ 
          ...d, 
          isLoading: false, 
          error: `Erro ao carregar dados da assinatura: ${error.message}`,
          debugInfo: { error, timestamp: new Date().toISOString() }
        }));
        return;
      }

      if (!data || typeof data !== 'object') {
        console.log("📝 Dados de assinatura não encontrados");
        setDetails({
          plan: "Nenhum plano ativo",
          amount: 0,
          cardBrand: "",
          cardLast4: "",
          cardExp: "",
          status: "inactive",
          isLoading: false,
          error: undefined,
          debugInfo: { noData: true, timestamp: new Date().toISOString() }
        });
        return;
      }

      // Store debug information
      const debugInfo = {
        rawResponse: data,
        timestamp: new Date().toISOString(),
        userMetadata: user.user_metadata
      };

      // Handle pending/processing state
      if (data.isPending) {
        console.log("⏳ Assinatura sendo processada:", data);
        setDetails({
          plan: data.plan_name || "Processando...",
          amount: data.amount || 0,
          cardBrand: data.card_brand || "",
          cardLast4: data.card_last4 || "",
          cardExp: data.exp_month && data.exp_year ? `${data.exp_month}/${data.exp_year}` : "",
          status: data.status || "processing",
          isLoading: false,
          subscriptionId: data.subscription_id,
          isPending: true,
          error: undefined,
          debugInfo
        });
        return;
      }

      // Tratar resposta da função melhorada
      if (!data.success || !data.hasSubscription) {
        console.log("📝 Sem assinatura ativa:", data.message || "Usuário sem plano ativo");
        setDetails({
          plan: data.plan_name || "Nenhum plano ativo",
          amount: data.amount || 0,
          cardBrand: data.card_brand || "",
          cardLast4: data.card_last4 || "",
          cardExp: data.exp_month && data.exp_year ? `${data.exp_month}/${data.exp_year}` : "",
          status: data.status || "inactive",
          isLoading: false,
          error: undefined,
          debugInfo
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
        isPending: false,
        error: undefined,
        debugInfo
      });
      
    } catch (error) {
      console.error("❌ Erro inesperado ao buscar detalhes da assinatura:", error);
      
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
          timestamp: new Date().toISOString()
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

  // Auto-refresh for pending subscriptions - IMPROVED TIMING
  useEffect(() => {
    if (details.isPending || details.status === 'processing') {
      console.log("⏰ Setting up auto-refresh for pending subscription");
      const interval = setInterval(() => {
        console.log("🔄 Auto-refresh triggered for pending subscription");
        getSubDetails();
      }, 15000); // Increased to 15 seconds to reduce API calls

      return () => {
        console.log("🛑 Clearing auto-refresh interval");
        clearInterval(interval);
      };
    }
  }, [details.isPending, details.status, getSubDetails]);

  return {
    ...details,
    refreshSubscription
  };
}
