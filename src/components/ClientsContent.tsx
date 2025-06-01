import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail, MapPin, Filter, Users, TrendingUp, LayoutGrid, List } from "lucide-react";
import { KanbanView } from "@/components/KanbanView";

export function ClientsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const leads = [
    {
      id: 1,
      name: "Maria Silva Santos",
      email: "maria.silva@email.com",
      phone: "(11) 99999-1234",
      company: "Empresa ABC Ltda",
      source: "Website",
      status: "Novo",
      interest: "Consultoria Jurídica",
      value: "R$ 15.000",
      lastContact: "2024-05-28",
      avatar: "MS",
    },
    {
      id: 2,
      name: "João Carlos Oliveira",
      email: "joao.oliveira@email.com",
      phone: "(11) 88888-5678",
      company: "Tech Solutions",
      source: "Indicação",
      status: "Qualificado",
      interest: "Contratos",
      value: "R$ 25.000",
      lastContact: "2024-05-27",
      avatar: "JO",
    },
    {
      id: 3,
      name: "Ana Paula Costa",
      email: "ana.costa@email.com",
      phone: "(11) 77777-9012",
      company: "StartupXYZ",
      source: "LinkedIn",
      status: "Proposta",
      interest: "Compliance",
      value: "R$ 8.000",
      lastContact: "2024-05-25",
      avatar: "AC",
    },
    {
      id: 4,
      name: "Pedro Henrique Lima",
      email: "pedro.lima@email.com",
      phone: "(11) 66666-3456",
      company: "Indústria Lima",
      source: "Google Ads",
      status: "Perdido",
      interest: "Trabalhista",
      value: "R$ 12.000",
      lastContact: "2024-05-20",
      avatar: "PL",
    },
  ];

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">Gerencie seus leads e oportunidades de vendas</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>

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
            Filtros
          </Button>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
          </div>
        </div>
      </Card>

      {viewMode === "kanban" ? (
        <KanbanView leads={filteredLeads} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-semibold">
                    {lead.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'Novo' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'Qualificado' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'Proposta' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">{lead.value}</p>
                  <p className="text-xs text-gray-500">{lead.source}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{lead.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{lead.company}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Interesse: {lead.interest}</span>
                  <span className="text-gray-500">Último contato: {lead.lastContact}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Ver Detalhes
                </Button>
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Contatar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredLeads.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo lead.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
