
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, UserCheck, Target, UserX } from "lucide-react";
import { Lead } from "@/types/lead";

interface AnalysisStatsProps {
  leads: Lead[];
  yearlyLeads: Lead[];
  onCategoryChange: (category: string) => void;
  statusHistory: any[];
  hasLeadPassedThroughStatus: (leadId: string, statuses: string[]) => boolean;
  leadsViewMode: 'weekly' | 'monthly';
  contractsViewMode: 'weekly' | 'monthly';
  opportunitiesViewMode: 'weekly' | 'monthly';
  showLeadsChart: boolean;
  showContractsChart: boolean;
  showOpportunitiesChart: boolean;
}

export function AnalysisStats({ 
  leads, 
  yearlyLeads, 
  onCategoryChange, 
  statusHistory, 
  hasLeadPassedThroughStatus,
  leadsViewMode,
  contractsViewMode,
  opportunitiesViewMode,
  showLeadsChart,
  showContractsChart,
  showOpportunitiesChart
}: AnalysisStatsProps) {
  
  // Função corrigida para verificar se um lead é uma oportunidade (NOVA REGRA)
  const isOpportunityLead = (lead: Lead): boolean => {
    console.log(`🔍 [AnalysisStats] Verificando se ${lead.name} (${lead.status}) é oportunidade`);
    
    // NOVA REGRA: Oportunidades são leads que:
    // 1. NÃO estão em "Novo" (independente do histórico)
    // 2. Estão atualmente em "Proposta" ou "Reunião" OU passaram por eles (histórico)
    
    // PRIMEIRO: Excluir completamente leads com status "Novo"
    if (lead.status === "Novo") {
      console.log(`❌ [AnalysisStats] Lead ${lead.name} está em Novo - SEMPRE EXCLUÍDO`);
      return false;
    }
    
    // SEGUNDO: Se está em Proposta ou Reunião atualmente, incluir automaticamente
    if (lead.status === "Proposta" || lead.status === "Reunião") {
      console.log(`✅ [AnalysisStats] Lead ${lead.name} está atualmente em ${lead.status} - INCLUÍDO`);
      return true;
    }
    
    // TERCEIRO: Verificar se passou por Proposta/Reunião no histórico (incluindo finalizados)
    const hasPassedThroughTargetStatuses = hasLeadPassedThroughStatus(lead.id, ["Proposta", "Reunião"]);
    console.log(`📊 [AnalysisStats] Lead ${lead.name} (${lead.status}) passou por Proposta/Reunião: ${hasPassedThroughTargetStatuses}`);
    
    if (hasPassedThroughTargetStatuses) {
      console.log(`✅ [AnalysisStats] Lead ${lead.name} passou por Proposta/Reunião - INCLUÍDO mesmo estando em ${lead.status}`);
      return true;
    }
    
    console.log(`❌ [AnalysisStats] Lead ${lead.name} não passou por Proposta/Reunião - EXCLUÍDO`);
    return false;
  };

  const analysisStats = [
    {
      title: "Todos",
      value: leads.length.toString(),
      icon: Users,
      change: "+5%",
      changeType: "positive" as const,
      color: "bg-purple-100 text-purple-800",
      category: "all"
    },
    {
      title: "Novos Contratos",
      value: leads.filter(lead => lead.status === "Contrato Fechado").length.toString(),
      icon: UserCheck,
      change: "+18%",
      changeType: "positive" as const,
      color: "bg-green-100 text-green-800",
      category: "contratos"
    },
    {
      title: "Oportunidades",
      value: leads.filter(lead => isOpportunityLead(lead)).length.toString(),
      icon: Target,
      change: "+12%",
      changeType: "positive" as const,
      color: "bg-blue-100 text-blue-800",
      category: "oportunidades"
    },
    {
      title: "Perdas",
      value: leads.filter(lead => lead.status === "Perdido").length.toString(),
      icon: UserX,
      change: "-8%",
      changeType: "positive" as const,
      color: "bg-red-100 text-red-800",
      category: "perdas"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {analysisStats.map((stat, index) => (
        <Card 
          key={index} 
          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onCategoryChange(stat.category)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className={`h-4 w-4 mr-1 ${
                  stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${stat.color.split(' ')[0]}-100`}>
              <stat.icon className={`h-6 w-6 ${stat.color.split(' ')[1]}-600`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
