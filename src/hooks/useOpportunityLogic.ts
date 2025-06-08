
import { Lead } from "@/types/lead";

export const useOpportunityLogic = (
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean
) => {
  const isOpportunityLead = (lead: Lead): boolean => {
    console.log(`🔍 [useOpportunityLogic] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // NOVA REGRA: Oportunidades são leads que:
    // 1. NÃO estão em "Novo" (independente do histórico)
    // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [useOpportunityLogic] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [useOpportunityLogic] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // TERCEIRO: Verificar se passou por Proposta/Reunião no histórico (incluindo finalizados)
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [useOpportunityLogic] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    if (hasPassedThroughTargetStatuses) {
      console.log(`✅ [useOpportunityLogic] Lead ${lead.name} passou por Proposta/Reunião - INCLUÍDO mesmo estando em ${lead.status}`);
      return true;
    }
    
    console.log(`❌ [useOpportunityLogic] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
    return false;
  };

  return { isOpportunityLead };
};
