
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionControlState {
  isBlocked: boolean;
  isLoading: boolean;
  showWarning: boolean;
  blockReason: string;
  canAccessFeature: (feature: string) => boolean;
}

const BLOCKED_FEATURES = [
  'create_lead',
  'edit_lead',
  'delete_lead',
  'kanban_operations',
  'analysis_access',
  'settings_access',
  'team_management',
  'calendar_access'
];

export function useSubscriptionControl(): SubscriptionControlState {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    async function checkSubscriptionStatus() {
      console.log("🔒 Verificando controle de acesso por assinatura...");
      
      try {
        // Wait for user authentication first
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.log("⚠️ Usuário não autenticado, aguardando...");
          setIsLoading(false);
          setIsBlocked(true);
          setShowWarning(true);
          setBlockReason("Faça login para acessar o sistema.");
          return;
        }

        console.log("👤 Usuário autenticado:", user.email);

        // Determine effective user ID (admin for members)
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('parent_user_id')
          .eq('user_id', user.id)
          .single();

        const effectiveUserId = userProfile?.parent_user_id || user.id;
        const isMember = !!userProfile?.parent_user_id;

        console.log("📊 Determinando usuário efetivo:", {
          originalUserId: user.id,
          effectiveUserId,
          isMember
        });

        // Check local subscription status using effective user ID
        const { data: localSubscription, error: localError } = await supabase
          .from('subscribers')
          .select('subscribed, subscription_end, last_checked')
          .eq('user_id', effectiveUserId)
          .single();

        const now = new Date();
        let needsRefresh = false;

        if (localError) {
          console.log("⚠️ Dados locais não encontrados:", localError.message);
          needsRefresh = true;
        } else if (localSubscription) {
          // Check if data is stale (older than 5 minutes)
          const lastChecked = new Date(localSubscription.last_checked);
          const isDataStale = now.getTime() - lastChecked.getTime() > (5 * 60 * 1000);
          
          // Check if there's an inconsistency: subscribed=false but subscription_end is in future
          const subscriptionEnd = localSubscription.subscription_end ? 
            new Date(localSubscription.subscription_end) : null;
          const hasActivePeriod = subscriptionEnd && subscriptionEnd > now;
          const isInconsistent = !localSubscription.subscribed && hasActivePeriod;
          
          console.log("📊 Status dos dados locais:", {
            subscribed: localSubscription.subscribed,
            subscription_end: subscriptionEnd,
            hasActivePeriod,
            isDataStale,
            isInconsistent,
            effectiveUserId
          });

          if (isDataStale || isInconsistent) {
            console.log("🔄 Dados precisam ser atualizados");
            needsRefresh = true;
          }
        }

        if (needsRefresh) {
          console.log("🔄 Atualizando status da assinatura via Stripe...");
          const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-subscription');
          
          if (checkError) {
            console.error("❌ Erro ao verificar assinatura:", checkError);
            setIsBlocked(true);
            setShowWarning(true);
            setBlockReason("Erro ao verificar assinatura. Tente novamente.");
            setIsLoading(false);
            return;
          }

          if (!checkResult?.success) {
            console.error("❌ Falha na verificação:", checkResult);
            setIsBlocked(true);
            setShowWarning(true);
            setBlockReason(checkResult?.error || "Falha na verificação da assinatura");
            setIsLoading(false);
            return;
          }

          // Use updated data from check-subscription
          const hasActiveAccess = checkResult.subscribed || 
            (checkResult.subscription_end && new Date(checkResult.subscription_end) > now);

          console.log("✅ Dados atualizados:", {
            subscribed: checkResult.subscribed,
            subscription_end: checkResult.subscription_end,
            hasActiveAccess,
            is_member: checkResult.is_member,
            effective_user_id: checkResult.effective_user_id
          });

          setIsBlocked(!hasActiveAccess);
          setShowWarning(!hasActiveAccess);
          setBlockReason(hasActiveAccess ? "" : "Assinatura inativa. Ative seu plano para continuar.");
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

          setIsBlocked(!hasActiveAccess);
          setShowWarning(!hasActiveAccess);
          
          if (!hasActiveAccess) {
            if (!localSubscription.subscribed && !subscriptionEnd) {
              setBlockReason("Nenhuma assinatura ativa encontrada. Ative seu plano para continuar.");
            } else if (subscriptionEnd && subscriptionEnd <= now) {
              setBlockReason("Sua assinatura expirou. Renove seu plano para continuar.");
            } else {
              setBlockReason("Assinatura inativa. Ative seu plano para continuar.");
            }
          } else {
            setBlockReason("");
          }
        }
        
        setIsLoading(false);
        
      } catch (error) {
        console.error("❌ Erro ao verificar controle de assinatura:", error);
        setIsBlocked(true);
        setShowWarning(true);
        setBlockReason("Erro ao verificar assinatura. Entre em contato com o suporte.");
        setIsLoading(false);
      }
    }

    checkSubscriptionStatus();
  }, []);

  const canAccessFeature = (feature: string): boolean => {
    // If still loading, allow access temporarily
    if (isLoading) {
      return true;
    }

    // If not blocked, allow access
    if (!isBlocked) {
      return true;
    }

    // If blocked, check if this specific feature should be blocked
    return !BLOCKED_FEATURES.includes(feature);
  };

  return {
    isBlocked,
    isLoading,
    showWarning,
    blockReason,
    canAccessFeature
  };
}
