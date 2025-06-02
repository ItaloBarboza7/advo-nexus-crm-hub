
import { Lead } from "@/types/lead";

export const useOpportunityLogic = (
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean
) => {
  const isOpportunityLead = (lead: Lead): boolean => {
    console.log(`🔍 [useOpportunityLogic] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [useOpportunityLogic] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Excluir leads com status final (Perdido/Contrato Fechado)
    if (lead.status === "Perdido" || lead.status === "Contrato Fechado") {
      console.log(`❌ [useOpportunityLogic] Lead ${lead.name} está em status final (${lead.status}) - EXCLUÍDO`);
      return false;
    }
    
    // TERCEIRO: Para leads em outros status, verificar se passaram por Proposta/Reunião
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [useOpportunityLogic] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    // Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [useOpportunityLogic] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // Para outros status, deve ter passado por Proposta/Reunião
    if (!hasPassedThroughTargetStatuses) {
      console.log(`❌ [useOpportunityLogic] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
      return false;
    }
    
    console.log(`✅ [useOpportunityLogic] Lead ${lead.name} passou por Proposta/Reunião e está em ${lead.status} - INCLUÍDO`);
    return true;
  };

  return { isOpportunityLead };
};
