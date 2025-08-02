
import { useState, useEffect } from "react";
import { useSubscriptionDetails } from "./useSubscriptionDetails";

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
  const {
    status,
    isLoading,
    error,
    isPending,
    plan
  } = useSubscriptionDetails();

  const [isBlocked, setIsBlocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    if (isLoading || isPending) {
      setIsBlocked(false);
      setShowWarning(false);
      return;
    }

    // Determine if user should be blocked
    let blocked = false;
    let warning = false;
    let reason = "";

    switch (status) {
      case "inactive":
      case "canceled":
      case "unpaid":
        blocked = true;
        warning = true;
        reason = "Sua assinatura está inativa. Regularize para continuar usando o sistema.";
        break;
      
      case "past_due":
        blocked = true;
        warning = true;
        reason = "Seu pagamento está em atraso. Atualize seu método de pagamento para continuar.";
        break;
      
      case "error":
        if (error) {
          blocked = true;
          warning = true;
          reason = "Erro ao verificar assinatura. Entre em contato com o suporte.";
        }
        break;
      
      case "active":
      case "trialing":
        blocked = false;
        warning = false;
        break;
      
      default:
        // For unknown status, show warning but don't block
        if (!plan || plan === "Nenhum plano ativo") {
          blocked = true;
          warning = true;
          reason = "Nenhuma assinatura ativa encontrada. Ative seu plano para usar o sistema.";
        }
        break;
    }

    setIsBlocked(blocked);
    setShowWarning(warning);
    setBlockReason(reason);
  }, [status, isLoading, isPending, error, plan]);

  const canAccessFeature = (feature: string): boolean => {
    // If subscription is loading or pending, allow access temporarily
    if (isLoading || isPending) {
      return true;
    }

    // If not blocked, allow all access
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
