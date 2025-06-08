import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserX, DollarSign, TrendingUp, Target, BarChart3 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";

export function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [conversionView, setConversionView] = useState<'weekly' | 'monthly'>('weekly');
  const [leadsView, setLeadsView] = useState<'weekly' | 'monthly'>('weekly');
  const [actionView, setActionView] = useState<'type' | 'group'>('type');
  const { settings } = useDashboardSettings();

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

  const actionTypeData = [
    { type: "Marketing Digital", opportunities: 45, closures: 28 },
    { type: "Vendas Diretas", opportunities: 38, closures: 22 },
    { type: "Parcerias", opportunities: 32, closures: 18 },
    { type: "Referências", opportunities: 28, closures: 15 },
    { type: "Cold Calling", opportunities: 22, closures: 8 },
  ];

  const actionGroupData = [
    { group: "Inbound", opportunities: 65, closures: 43 },
    { group: "Outbound", opportunities: 48, closures: 28 },
    { group: "Referral", opportunities: 35, closures: 22 },
    { group: "Partnership", opportunities: 28, closures: 15 },
    { group: "Events", opportunities: 19, closures: 7 },
  ];

  const chartConfig = {
    conversion: {
      label: "Taxa de Conversão (%)",
      color: "hsl(220, 98%, 61%)",
    },
    leads: {
      label: "Leads",
      color: "hsl(142, 76%, 36%)",
    },
    proposals: {
      label: "Propostas",
      color: "hsl(38, 92%, 50%)",
    },
    opportunities: {
      label: "Oportunidades",
      color: "hsl(262, 83%, 58%)",
    },
    closures: {
      label: "Fechamentos",
      color: "hsl(0, 84%, 60%)",
    },
  };

  const getConversionData = () => {
    return conversionView === 'weekly' ? weeklyConversionData : monthlyConversionData;
  };

  const getLeadsData = () => {
    return leadsView === 'weekly' ? weeklyLeadsData : monthlyLeadsData;
  };

  const getActionData = () => {
    return actionView === 'type' ? actionTypeData : actionGroupData;
  };

  const getConversionDataKey = () => {
    return conversionView === 'weekly' ? 'day' : 'month';
  };

  const getLeadsDataKey = () => {
    return leadsView === 'weekly' ? 'day' : 'month';
  };

  const getActionDataKey = () => {
    return actionView === 'type' ? 'type' : 'group';
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

  const getBestActionPeriod = () => {
    const data = getActionData();
    const best = data.reduce((prev, current) => 
      current.opportunities > prev.opportunities ? current : prev
    );
    const dataKey = actionView === 'type' ? 'type' : 'group';
    const value = best[dataKey as keyof typeof best];
    const conversionRate = ((best.closures / best.opportunities) * 100).toFixed(1);
    return `${value} (${conversionRate}% taxa)`;
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
      {settings.showStatsCards && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Chart */}
        {settings.showConversionChart && (
          <Card className="p-6 flex flex-col">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
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
              <div className="h-20 flex-1 px-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getConversionData()} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <XAxis 
                        dataKey={getConversionDataKey()}
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={20}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [`${value}%`, 'Taxa de Conversão']}
                        labelFormatter={(label) => conversionView === 'weekly' ? `${label}-feira` : label}
                      />
                      <Line 
                        type="monotone"
                        dataKey="conversion" 
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 2 }}
                        activeDot={{ r: 3, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Melhor período: <span className="font-medium text-blue-600">{getBestConversionPeriod()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversion Rate */}
        {settings.showConversionRate && (
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
        )}

        {/* New Leads Chart */}
        {settings.showLeadsChart && (
          <Card className="p-6 flex flex-col">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
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
              <div className="h-20 flex-1 px-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getLeadsData()} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <XAxis 
                        dataKey={getLeadsDataKey()}
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={20}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [value, 'Leads']}
                        labelFormatter={(label) => leadsView === 'weekly' ? `${label}-feira` : label}
                      />
                      <Line 
                        type="monotone"
                        dataKey="leads" 
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 2 }}
                        activeDot={{ r: 3, stroke: '#10b981', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Melhor período: <span className="font-medium text-green-600">{getBestLeadsPeriod()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Row - Team Results and Action Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Results */}
        {settings.showTeamResults && (
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resultado do Time</h3>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Ver detalhes
              </button>
            </div>
            <div className="space-y-4">
              {teamResults.map((member) => (
                <div key={member.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{member.name}</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="text-center">
                          <span className="block font-medium text-blue-600 text-lg">{member.leads}</span>
                          <p className="text-xs">Leads</p>
                        </div>
                        <div className="text-center">
                          <span className="block font-medium text-orange-600 text-lg">{member.proposals}</span>
                          <p className="text-xs">Propostas</p>
                        </div>
                        <div className="text-center">
                          <span className="block font-medium text-green-600 text-lg">{member.sales}</span>
                          <p className="text-xs">Vendas</p>
                        </div>
                        <div className="text-center">
                          <span className="block font-medium text-purple-600 text-lg">{member.score}</span>
                          <p className="text-xs">Pontuação</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Chart */}
        {settings.showActionChart && (
          <Card className="p-6 flex flex-col">
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Oportunidades por {actionView === 'type' ? 'Tipo de Ação' : 'Grupo de Ação'}
                </CardTitle>
                <Select value={actionView} onValueChange={(value: 'type' | 'group') => setActionView(value)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Tipo de Ação</SelectItem>
                    <SelectItem value="group">Grupo de Ação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="h-20 flex-1 px-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getActionData()} margin={{ top: 15, right: 20, left: 20, bottom: 10 }}>
                      <XAxis 
                        dataKey={getActionDataKey()}
                        tick={{ fontSize: 7, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={20}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 8, fill: '#6b7280' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [value, name === 'opportunities' ? 'Oportunidades' : 'Fechamentos']}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={15}
                        wrapperStyle={{ fontSize: '8px', paddingBottom: '5px' }}
                        iconType="rect"
                      />
                      <Bar 
                        dataKey="opportunities" 
                        fill="#8b5cf6"
                        name="Oportunidades"
                        barSize={8}
                        radius={[1, 1, 0, 0]}
                      />
                      <Bar 
                        dataKey="closures" 
                        fill="#ef4444"
                        name="Fechamentos"
                        barSize={8}
                        radius={[1, 1, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  Melhor {actionView === 'type' ? 'tipo' : 'grupo'}: <span className="font-medium text-purple-600">{getBestActionPeriod()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
