import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserX, DollarSign, TrendingUp, Target, BarChart3 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [conversionView, setConversionView] = useState<'weekly' | 'monthly'>('weekly');
  const [leadsView, setLeadsView] = useState<'weekly' | 'monthly'>('weekly');
  const [proposalsView, setProposalsView] = useState<'weekly' | 'monthly'>('weekly');

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
      score: "85",
    },
    {
      id: 2,
      name: "João Santos",
      leads: 38,
      proposals: 15,
      sales: 11,
      score: "92",
    },
    {
      id: 3,
      name: "Ana Costa",
      leads: 52,
      proposals: 18,
      sales: 14,
      score: "88",
    },
  ];

  const conversionData = [
    {
      totalLeads: 347,
      opportunities: 89,
      sales: 65,
      opportunityRate: "25.6%",
      salesRate: "18.7%",
      overallConversion: "73.0%",
    },
  ];

  const weeklyConversionData = [
    { day: "Segunda", sales: 12, conversion: 18.5 },
    { day: "Terça", sales: 9, conversion: 14.2 },
    { day: "Quarta", sales: 15, conversion: 23.1 },
    { day: "Quinta", sales: 11, conversion: 16.9 },
    { day: "Sexta", sales: 8, conversion: 12.3 },
    { day: "Sábado", sales: 6, conversion: 9.2 },
    { day: "Domingo", sales: 4, conversion: 6.1 },
  ];

  const monthlyConversionData = [
    { month: "Jan", sales: 95, conversion: 18.2 },
    { month: "Fev", sales: 87, conversion: 16.8 },
    { month: "Mar", sales: 102, conversion: 19.4 },
    { month: "Abr", sales: 78, conversion: 15.1 },
    { month: "Mai", sales: 118, conversion: 22.3 },
    { month: "Jun", sales: 92, conversion: 17.9 },
    { month: "Jul", sales: 105, conversion: 20.1 },
    { month: "Ago", sales: 88, conversion: 16.7 },
    { month: "Set", sales: 97, conversion: 18.6 },
    { month: "Out", sales: 112, conversion: 21.4 },
    { month: "Nov", sales: 89, conversion: 17.2 },
    { month: "Dez", sales: 94, conversion: 18.8 },
  ];

  const weeklyLeadsData = [
    { day: "Segunda", leads: 52 },
    { day: "Terça", leads: 48 },
    { day: "Quarta", leads: 65 },
    { day: "Quinta", leads: 43 },
    { day: "Sexta", leads: 38 },
    { day: "Sábado", leads: 28 },
    { day: "Domingo", leads: 15 },
  ];

  const monthlyLeadsData = [
    { month: "Jan", leads: 285 },
    { month: "Fev", leads: 267 },
    { month: "Mar", leads: 312 },
    { month: "Abr", leads: 241 },
    { month: "Mai", leads: 389 },
    { month: "Jun", leads: 298 },
    { month: "Jul", leads: 325 },
    { month: "Ago", leads: 276 },
    { month: "Set", leads: 301 },
    { month: "Out", leads: 342 },
    { month: "Nov", leads: 287 },
    { month: "Dez", leads: 295 },
  ];

  const weeklyProposalsData = [
    { day: "Segunda", proposals: 14 },
    { day: "Terça", proposals: 12 },
    { day: "Quarta", proposals: 18 },
    { day: "Quinta", proposals: 11 },
    { day: "Sexta", proposals: 9 },
    { day: "Sábado", proposals: 7 },
    { day: "Domingo", proposals: 4 },
  ];

  const monthlyProposalsData = [
    { month: "Jan", proposals: 73 },
    { month: "Fev", proposals: 68 },
    { month: "Mar", proposals: 82 },
    { month: "Abr", proposals: 59 },
    { month: "Mai", proposals: 95 },
    { month: "Jun", proposals: 76 },
    { month: "Jul", proposals: 84 },
    { month: "Ago", proposals: 71 },
    { month: "Set", proposals: 78 },
    { month: "Out", proposals: 89 },
    { month: "Nov", proposals: 74 },
    { month: "Dez", proposals: 77 },
  ];

  const actionTypeData = [
    { type: "Marketing Digital", opportunities: 45, closures: 28 },
    { type: "Vendas Diretas", opportunities: 38, closures: 22 },
    { type: "Parcerias", opportunities: 32, closures: 18 },
    { type: "Referências", opportunities: 28, closures: 15 },
    { type: "Cold Calling", opportunities: 22, closures: 8 },
  ];

  const chartConfig = {
    conversion: {
      label: "Taxa de Conversão (%)",
      color: "#3b82f6",
    },
    leads: {
      label: "Leads",
      color: "#10b981",
    },
    proposals: {
      label: "Propostas",
      color: "#f59e0b",
    },
    opportunities: {
      label: "Oportunidades",
      color: "#8b5cf6",
    },
    closures: {
      label: "Fechamentos",
      color: "#ef4444",
    },
  };

  const getConversionData = () => {
    return conversionView === 'weekly' ? weeklyConversionData : monthlyConversionData;
  };

  const getLeadsData = () => {
    return leadsView === 'weekly' ? weeklyLeadsData : monthlyLeadsData;
  };

  const getProposalsData = () => {
    return proposalsView === 'weekly' ? weeklyProposalsData : monthlyProposalsData;
  };

  const getConversionDataKey = () => {
    return conversionView === 'weekly' ? 'day' : 'month';
  };

  const getLeadsDataKey = () => {
    return leadsView === 'weekly' ? 'day' : 'month';
  };

  const getProposalsDataKey = () => {
    return proposalsView === 'weekly' ? 'day' : 'month';
  };

  const getBestConversionPeriod = () => {
    const data = getConversionData();
    const best = data.reduce((prev, current) => 
      current.conversion > prev.conversion ? current : prev
    );
    const periodKey = conversionView === 'weekly' ? 'day' : 'month';
    const periodValue = best[periodKey as keyof typeof best];
    const suffix = conversionView === 'weekly' ? '-feira' : '';
    return `${periodValue}${suffix} (${best.conversion}%)`;
  };

  const getBestLeadsPeriod = () => {
    const data = getLeadsData();
    const best = data.reduce((prev, current) => 
      current.leads > prev.leads ? current : prev
    );
    const periodKey = leadsView === 'weekly' ? 'day' : 'month';
    const periodValue = best[periodKey as keyof typeof best];
    const suffix = leadsView === 'weekly' ? '-feira' : '';
    return `${periodValue}${suffix} (${best.leads} leads)`;
  };

  const getBestProposalsPeriod = () => {
    const data = getProposalsData();
    const best = data.reduce((prev, current) => 
      current.proposals > prev.proposals ? current : prev
    );
    const periodKey = proposalsView === 'weekly' ? 'day' : 'month';
    const periodValue = best[periodKey as keyof typeof best];
    const suffix = proposalsView === 'weekly' ? '-feira' : '';
    return `${periodValue}${suffix} (${best.proposals} propostas)`;
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <span className="font-medium text-purple-600">{member.score}</span>
                        <p className="text-xs">Pontuação</p>
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
                <p className="text-3xl font-bold text-blue-600">{conversionData[0].overallConversion}</p>
                <p className="text-sm text-gray-600">Taxa Geral de Conversão</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de Leads</span>
                  <span className="font-medium">{conversionData[0].totalLeads}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Oportunidades Geradas</span>
                  <div className="text-right">
                    <span className="font-medium">{conversionData[0].opportunities}</span>
                    <span className="text-xs text-orange-600 ml-2">({conversionData[0].opportunityRate})</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Vendas Realizadas</span>
                  <div className="text-right">
                    <span className="font-medium">{conversionData[0].sales}</span>
                    <span className="text-xs text-green-600 ml-2">({conversionData[0].salesRate})</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: conversionData[0].overallConversion }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Meta: 75% | Atual: {conversionData[0].overallConversion}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Weekly Conversion Chart */}
        <Card className="p-6 flex flex-col">
          <CardHeader className="p-0 mb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Conversão por {conversionView === 'weekly' ? 'Dia da Semana' : 'Mês'}
              </CardTitle>
              <Select value={conversionView} onValueChange={(value: 'weekly' | 'monthly') => setConversionView(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="h-48 flex-1">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getConversionData()} margin={{ top: 5, right: 5, left: 5, bottom: 25 }}>
                    <XAxis 
                      dataKey={getConversionDataKey()}
                      tick={{ fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={25}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }}
                      width={20}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value, name) => [`${value}%`, 'Taxa de Conversão']}
                      labelFormatter={(label) => conversionView === 'weekly' ? `${label}-feira` : label}
                    />
                    <Bar 
                      dataKey="conversion" 
                      fill="var(--color-conversion)"
                      radius={[1, 1, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Melhor período: <span className="font-medium text-blue-600">{getBestConversionPeriod()}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Charts Row - Changed to 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Type Chart - Updated from Action Group */}
        <Card className="p-6 flex flex-col">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Oportunidades e Fechamento por Tipo de Ação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="h-48 flex-1">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionTypeData} margin={{ top: 5, right: 5, left: 5, bottom: 25 }}>
                    <XAxis 
                      dataKey="type" 
                      tick={{ fontSize: 8 }}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }}
                      width={25}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value, name) => [value, name === 'opportunities' ? 'Oportunidades' : 'Fechamentos']}
                    />
                    <Bar 
                      dataKey="opportunities" 
                      fill="var(--color-opportunities)"
                      radius={[1, 1, 0, 0]}
                    />
                    <Bar 
                      dataKey="closures" 
                      fill="var(--color-closures)"
                      radius={[1, 1, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Melhor tipo: <span className="font-medium text-purple-600">Marketing Digital (62% taxa)</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Leads Chart - Updated title */}
        <Card className="p-6 flex flex-col">
          <CardHeader className="p-0 mb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-green-600" />
                Leads Novos por {leadsView === 'weekly' ? 'Dia da Semana' : 'Mês'}
              </CardTitle>
              <Select value={leadsView} onValueChange={(value: 'weekly' | 'monthly') => setLeadsView(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="h-48 flex-1">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getLeadsData()} margin={{ top: 5, right: 5, left: 5, bottom: 25 }}>
                    <XAxis 
                      dataKey={getLeadsDataKey()}
                      tick={{ fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={25}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }}
                      width={20}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value, name) => [value, 'Leads']}
                      labelFormatter={(label) => leadsView === 'weekly' ? `${label}-feira` : label}
                    />
                    <Bar 
                      dataKey="leads" 
                      fill="var(--color-leads)"
                      radius={[1, 1, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Melhor período: <span className="font-medium text-green-600">{getBestLeadsPeriod()}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Proposals Chart */}
        <Card className="p-6 flex flex-col">
          <CardHeader className="p-0 mb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5 text-orange-600" />
                Propostas/Reuniões por {proposalsView === 'weekly' ? 'Dia da Semana' : 'Mês'}
              </CardTitle>
              <Select value={proposalsView} onValueChange={(value: 'weekly' | 'monthly') => setProposalsView(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="h-48 flex-1">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProposalsData()} margin={{ top: 5, right: 5, left: 5, bottom: 25 }}>
                    <XAxis 
                      dataKey={getProposalsDataKey()}
                      tick={{ fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={25}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }}
                      width={20}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value, name) => [value, 'Propostas']}
                      labelFormatter={(label) => proposalsView === 'weekly' ? `${label}-feira` : label}
                    />
                    <Bar 
                      dataKey="proposals" 
                      fill="var(--color-proposals)"
                      radius={[1, 1, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Melhor período: <span className="font-medium text-orange-600">{getBestProposalsPeriod()}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
