
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, TrendingUp, Users, UserCheck, UserX, Target } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/DateFilter";
import { LossReasonsChart } from "@/components/LossReasonsChart";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";

interface LossReason {
  id: string;
  reason: string;
}

export function CasesContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [selectedLossReason, setSelectedLossReason] = useState<string>("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLossReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason', { ascending: true });

      if (error) {
        console.error('Erro ao buscar motivos de perda:', error);
        return;
      }

      setLossReasons(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar motivos de perda:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLossReasons();
    fetchLeads();
  }, []);

  // Calcular estatísticas com base nos dados reais
  const analysisStats = [
    {
      title: "Novos Contratos",
      value: leads.filter(lead => lead.status === "Contrato Fechado").length.toString(),
      icon: UserCheck,
      change: "+18%",
      changeType: "positive" as const,
      color: "bg-green-100 text-green-800",
    },
    {
      title: "Oportunidades",
      value: leads.filter(lead => ["Novo", "Proposta", "Reunião"].includes(lead.status)).length.toString(),
      icon: Target,
      change: "+12%",
      changeType: "positive" as const,
      color: "bg-blue-100 text-blue-800",
    },
    {
      title: "Perdas",
      value: leads.filter(lead => lead.status === "Perdido").length.toString(),
      icon: UserX,
      change: "-8%",
      changeType: "positive" as const,
      color: "bg-red-100 text-red-800",
    },
  ];

  // Transformar dados dos leads para o formato do gráfico
  const transformedLeadsData = leads.map(lead => ({
    id: parseInt(lead.id.replace(/-/g, '').slice(0, 8), 16),
    status: lead.status === "Perdido" ? "Perda" : 
            lead.status === "Contrato Fechado" ? "Novo Contrato" :
            "Oportunidade",
    lossReason: lead.loss_reason,
    category: lead.status === "Perdido" ? "perdas" : 
              lead.status === "Contrato Fechado" ? "contratos" : 
              "oportunidades"
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Contrato Fechado':
        return 'bg-green-100 text-green-800';
      case 'Novo':
      case 'Proposta':
      case 'Reunião':
        return 'bg-blue-100 text-blue-800';
      case 'Perdido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
      (selectedCategory === "contratos" && lead.status === "Contrato Fechado") ||
      (selectedCategory === "oportunidades" && ["Novo", "Proposta", "Reunião"].includes(lead.status)) ||
      (selectedCategory === "perdas" && lead.status === "Perdido");
    
    const matchesLossReason = selectedCategory !== "perdas" || 
      selectedLossReason === "all" || 
      lead.loss_reason === selectedLossReason;
    
    return matchesSearch && matchesCategory && matchesLossReason;
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedLossReason("all");
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

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
                onClick={() => handleCategoryChange(stat.title.toLowerCase().replace(" ", "").replace("novos", "").replace("contratos", "contratos").replace("oportunidades", "oportunidades").replace("perdas", "perdas"))}>
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
          onClick={() => handleCategoryChange("all")}
        >
          Todos
        </Button>
        <Button
          variant={selectedCategory === "contratos" ? "default" : "outline"}
          onClick={() => handleCategoryChange("contratos")}
        >
          Novos Contratos
        </Button>
        <Button
          variant={selectedCategory === "oportunidades" ? "default" : "outline"}
          onClick={() => handleCategoryChange("oportunidades")}
        >
          Oportunidades
        </Button>
        <Button
          variant={selectedCategory === "perdas" ? "default" : "outline"}
          onClick={() => handleCategoryChange("perdas")}
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
          
          {selectedCategory === "all" && (
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros Avançados
            </Button>
          )}

          {selectedCategory === "perdas" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Motivos das Perdas
                  {selectedLossReason !== "all" && (
                    <Badge className="ml-2 bg-red-100 text-red-800">
                      1
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg z-50">
                <DropdownMenuItem 
                  onClick={() => setSelectedLossReason("all")}
                  className={selectedLossReason === "all" ? "bg-gray-100" : ""}
                >
                  Todos os motivos
                </DropdownMenuItem>
                {lossReasons.map((reason) => (
                  <DropdownMenuItem 
                    key={reason.id} 
                    onClick={() => setSelectedLossReason(reason.reason)}
                    className={selectedLossReason === reason.reason ? "bg-gray-100" : ""}
                  >
                    {reason.reason}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      {/* Gráfico de Motivos de Perda */}
      <LossReasonsChart 
        leadsData={transformedLeadsData}
        lossReasons={lossReasons}
        selectedCategory={selectedCategory}
      />

      {/* Leads List */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <p>Carregando leads...</p>
          </div>
        </Card>
      ) : (
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
                    {lead.loss_reason && (
                      <Badge className="bg-gray-100 text-gray-800">
                        {lead.loss_reason}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Email:</strong> {lead.email || 'Não informado'}
                    </div>
                    <div>
                      <strong>Telefone:</strong> {lead.phone}
                    </div>
                    <div>
                      <strong>Empresa:</strong> {lead.company || 'Não informado'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(lead.value)}</div>
                  <div className="text-sm text-gray-500">{formatDate(lead.created_at)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredLeads.length === 0 && !isLoading && (
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
