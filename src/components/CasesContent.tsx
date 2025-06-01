
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Calendar, FileText, Clock } from "lucide-react";

export function CasesContent() {
  const [searchTerm, setSearchTerm] = useState("");

  const cases = [
    {
      id: 1,
      title: "Processo Trabalhista - Silva & Cia",
      client: "Maria Silva Santos",
      caseNumber: "2024.001.0001",
      area: "Trabalhista",
      status: "Em Andamento",
      priority: "Alta",
      startDate: "2024-03-15",
      nextHearing: "2024-06-10",
      progress: 65,
      description: "Ação de cobrança de horas extras e adicional noturno.",
    },
    {
      id: 2,
      title: "Divórcio Consensual",
      client: "João Carlos Oliveira",
      caseNumber: "2024.002.0001",
      area: "Família",
      status: "Aguardando Documentos",
      priority: "Média",
      startDate: "2024-04-01",
      nextHearing: "2024-06-15",
      progress: 30,
      description: "Processo de divórcio consensual com partilha de bens.",
    },
    {
      id: 3,
      title: "Inventário - Família Oliveira",
      client: "Ana Paula Costa",
      caseNumber: "2024.003.0001",
      area: "Sucessões",
      status: "Concluído",
      priority: "Baixa",
      startDate: "2024-01-10",
      nextHearing: null,
      progress: 100,
      description: "Inventário e partilha de bens por falecimento.",
    },
    {
      id: 4,
      title: "Recuperação Judicial",
      client: "Empresa ABC Ltda",
      caseNumber: "2024.004.0001",
      area: "Empresarial",
      status: "Em Andamento",
      priority: "Alta",
      startDate: "2024-02-20",
      nextHearing: "2024-06-05",
      progress: 45,
      description: "Processo de recuperação judicial para reestruturação da empresa.",
    },
  ];

  const filteredCases = cases.filter(case_ =>
    case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    case_.caseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Andamento':
        return 'bg-blue-100 text-blue-800';
      case 'Aguardando Documentos':
        return 'bg-yellow-100 text-yellow-800';
      case 'Concluído':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta':
        return 'bg-red-100 text-red-800';
      case 'Média':
        return 'bg-orange-100 text-orange-800';
      case 'Baixa':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Casos</h1>
          <p className="text-gray-600">Gerencie todos os casos e processos do escritório</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Caso
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar casos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.map((case_) => (
          <Card key={case_.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{case_.title}</h3>
                  <Badge variant="outline" className={getStatusColor(case_.status)}>
                    {case_.status}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(case_.priority)}>
                    {case_.priority}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-2">{case_.description}</p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>Cliente: <strong>{case_.client}</strong></span>
                  <span>Processo: <strong>{case_.caseNumber}</strong></span>
                  <span>Área: <strong>{case_.area}</strong></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-2">Progresso: {case_.progress}%</div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${case_.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Data de Início</div>
                  <div className="text-sm font-medium">{case_.startDate}</div>
                </div>
              </div>
              {case_.nextHearing && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Próxima Audiência</div>
                    <div className="text-sm font-medium">{case_.nextHearing}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Documentos</div>
                  <div className="text-sm font-medium">Ver arquivo</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <Button variant="outline" size="sm">
                Ver Detalhes
              </Button>
              <Button variant="outline" size="sm">
                Documentos
              </Button>
              <Button variant="outline" size="sm">
                Cronograma
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredCases.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum caso encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo caso.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
