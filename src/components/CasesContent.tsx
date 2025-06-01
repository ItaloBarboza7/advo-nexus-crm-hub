
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, TrendingUp, Users, UserCheck, UserX, Target } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";

export function CasesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const analysisStats = [
    {
      title: "Novos Contratos",
      value: "45",
      icon: UserCheck,
      change: "+18%",
      changeType: "positive" as const,
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Oportunidades",
      value: "123",
      icon: Target,
      change: "+12%",
      changeType: "positive" as const,
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Perdas",
      value: "28",
      icon: UserX,
      change: "-8%",
      changeType: "positive" as const,
      color: "bg-red-100 text-red-800",
    },
  ];

  const leadsData = [
    {
      id: 1,
      name: "Maria Silva Santos",
      email: "maria.silva@email.com",
      phone: "(11) 99999-1234",
      company: "Empresa ABC Ltda",
      status: "Novo Contrato",
      value: "R$ 15.000",
      date: "2024-05-28",
      category: "contratos",
    },
    {
      id: 2,
      name: "João Carlos Oliveira",
      email: "joao.oliveira@email.com",
      phone: "(11) 88888-5678",
      company: "Tech Solutions",
      status: "Oportunidade",
      value: "R$ 25.000",
      date: "2024-05-27",
      category: "oportunidades",
    },
    {
      id: 3,
      name: "Ana Paula Costa",
      email: "ana.costa@email.com",
      phone: "(11) 77777-9012",
      company: "StartupXYZ",
      status: "Perda",
      value: "R$ 8.000",
      date: "2024-05-25",
      category: "perdas",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo Contrato':
        return 'bg-green-100 text-green-800';
      case 'Oportunidade':
        return 'bg-blue-100 text-blue-800';
      case 'Perda':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = leadsData.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || lead.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análises</h1>
          <p className="text-gray-600">Análise detalhada de leads e performance de vendas</p>
        </div>
        <DateFilter date={dateRange} setDate={setDateRange} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {analysisStats.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCategory(stat.title.toLowerCase().replace(" ", "").replace("novos", "").replace("contratos", "contratos").replace("oportunidades", "oportunidades").replace("perdas", "perdas"))}>
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

      {/* Category Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          onClick={() => setSelectedCategory("all")}
        >
          Todos
        </Button>
        <Button
          variant={selectedCategory === "contratos" ? "default" : "outline"}
          onClick={() => setSelectedCategory("contratos")}
        >
          Novos Contratos
        </Button>
        <Button
          variant={selectedCategory === "oportunidades" ? "default" : "outline"}
          onClick={() => setSelectedCategory("oportunidades")}
        >
          Oportunidades
        </Button>
        <Button
          variant={selectedCategory === "perdas" ? "default" : "outline"}
          onClick={() => setSelectedCategory("perdas")}
        >
          Perdas
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros Avançados
          </Button>
        </div>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <strong>Email:</strong> {lead.email}
                  </div>
                  <div>
                    <strong>Telefone:</strong> {lead.phone}
                  </div>
                  <div>
                    <strong>Empresa:</strong> {lead.company}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{lead.value}</div>
                <div className="text-sm text-gray-500">{lead.date}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
            <p>Tente ajustar os filtros ou categoria selecionada.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
