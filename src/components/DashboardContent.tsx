import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, UserX, DollarSign, TrendingUp, Target } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";

export function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const stats = [
    {
      title: "Leads",
      value: "347",
      icon: Users,
      change: "+12%",
      changeType: "positive" as const,
    },
    {
      title: "Propostas/Reuniões",
      value: "89",
      icon: UserPlus,
      change: "+8%",
      changeType: "positive" as const,
    },
    {
      title: "Perdas",
      value: "23",
      icon: UserX,
      change: "-15%",
      changeType: "positive" as const,
    },
    {
      title: "Vendas",
      value: "65",
      icon: DollarSign,
      change: "+22%",
      changeType: "positive" as const,
    },
  ];

  const teamResults = [
    {
      id: 1,
      name: "Maria Silva",
      leads: 45,
      proposals: 12,
      sales: 8,
      conversion: "18%",
    },
    {
      id: 2,
      name: "João Santos",
      leads: 38,
      proposals: 15,
      sales: 11,
      conversion: "29%",
    },
    {
      id: 3,
      name: "Ana Costa",
      leads: 52,
      proposals: 18,
      sales: 14,
      conversion: "27%",
    },
  ];

  const conversionData = {
    totalLeads: 347,
    proposals: 89,
    sales: 65,
    proposalRate: "25.6%",
    salesRate: "18.7%",
    overallConversion: "73.0%",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Análise de leads e performance de vendas</p>
        </div>
        <DateFilter date={dateRange} setDate={setDateRange} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
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
              <div className="bg-blue-100 p-3 rounded-lg">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Results */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Resultado do Time</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver detalhes
            </button>
          </div>
          <div className="space-y-4">
            {teamResults.map((member) => (
              <div key={member.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{member.name}</h4>
                    <div className="grid grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium text-blue-600">{member.leads}</span>
                        <p className="text-xs">Leads</p>
                      </div>
                      <div>
                        <span className="font-medium text-orange-600">{member.proposals}</span>
                        <p className="text-xs">Propostas</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">{member.sales}</span>
                        <p className="text-xs">Vendas</p>
                      </div>
                      <div>
                        <span className="font-medium text-purple-600">{member.conversion}</span>
                        <p className="text-xs">Conversão</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Conversion Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Taxa de Conversão</h3>
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-blue-600">{conversionData.overallConversion}</p>
                <p className="text-sm text-gray-600">Taxa Geral de Conversão</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de Leads</span>
                  <span className="font-medium">{conversionData.totalLeads}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Propostas Geradas</span>
                  <div className="text-right">
                    <span className="font-medium">{conversionData.proposals}</span>
                    <span className="text-xs text-orange-600 ml-2">({conversionData.proposalRate})</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Vendas Realizadas</span>
                  <div className="text-right">
                    <span className="font-medium">{conversionData.sales}</span>
                    <span className="text-xs text-green-600 ml-2">({conversionData.salesRate})</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: conversionData.overallConversion }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Meta: 75% | Atual: {conversionData.overallConversion}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
