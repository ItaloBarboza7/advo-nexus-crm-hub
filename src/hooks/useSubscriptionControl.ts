
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
        // Verificar status da assinatura localmente
        const { data: localSubscription, error: localError } = await supabase
          .from('subscribers')
          .select('subscribed, subscription_end, last_checked')
          .single();

        if (localError) {
          console.log("⚠️ Dados locais não encontrados, atualizando...");
          
          // Tentar atualizar via check-subscription
          const { data: checkResult } = await supabase.functions.invoke('check-subscription');
          
          if (checkResult?.success) {
            // Usar resultado da verificação
            const hasActiveSubscription = checkResult.subscribed;
            
            setIsBlocked(!hasActiveSubscription);
            setShowWarning(!hasActiveSubscription);
            setBlockReason(hasActiveSubscription ? "" : "Nenhuma assinatura ativa encontrada. Ative seu plano para continuar.");
            setIsLoading(false);
            return;
          }
        }

        if (localSubscription) {
          const hasActiveSubscription = localSubscription.subscribed;
          
          // Verificar se a assinatura não expirou (se houver data de fim)
          const isExpired = localSubscription.subscription_end && 
            new Date(localSubscription.subscription_end) < new Date();
          
          const isActiveAndNotExpired = hasActiveSubscription && !isExpired;
          
          setIsBlocked(!isActiveAndNotExpired);
          setShowWarning(!isActiveAndNotExpired);
          
          if (!hasActiveSubscription) {
            setBlockReason("Nenhuma assinatura ativa encontrada. Ative seu plano para continuar.");
          } else if (isExpired) {
            setBlockReason("Sua assinatura expirou. Renove seu plano para continuar.");
          } else {
            setBlockReason("");
          }
          
          setIsLoading(false);
        } else {
          // Sem dados locais e falha na verificação
          setIsBlocked(true);
          setShowWarning(true);
          setBlockReason("Não foi possível verificar o status da assinatura. Tente novamente.");
          setIsLoading(false);
        }
        
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
    // Se ainda está carregando, permitir acesso temporário
    if (isLoading) {
      return true;
    }

    // Se não está bloqueado, permitir acesso total
    if (!isBlocked) {
      return true;
    }

    // Se está bloqueado, verificar se este recurso específico deve ser bloqueado
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
