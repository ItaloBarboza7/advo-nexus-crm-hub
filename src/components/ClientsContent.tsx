import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail, MapPin, Filter, Users } from "lucide-react";

export function ClientsContent() {
  const [searchTerm, setSearchTerm] = useState("");

  const clients = [
    {
      id: 1,
      name: "Maria Silva Santos",
      email: "maria.silva@email.com",
      phone: "(11) 99999-1234",
      address: "São Paulo, SP",
      cases: 3,
      status: "Ativo",
      lastContact: "2024-05-28",
      avatar: "MS",
    },
    {
      id: 2,
      name: "João Carlos Oliveira",
      email: "joao.oliveira@email.com",
      phone: "(11) 88888-5678",
      address: "Rio de Janeiro, RJ",
      cases: 1,
      status: "Ativo",
      lastContact: "2024-05-27",
      avatar: "JO",
    },
    {
      id: 3,
      name: "Ana Paula Costa",
      email: "ana.costa@email.com",
      phone: "(11) 77777-9012",
      address: "Belo Horizonte, MG",
      cases: 2,
      status: "Inativo",
      lastContact: "2024-05-20",
      avatar: "AC",
    },
    {
      id: 4,
      name: "Pedro Henrique Lima",
      email: "pedro.lima@email.com",
      phone: "(11) 66666-3456",
      address: "Brasília, DF",
      cases: 1,
      status: "Ativo",
      lastContact: "2024-05-25",
      avatar: "PL",
    },
  ];

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes e informações de contato</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar clientes..."
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-semibold">
                  {client.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{client.address}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Casos: {client.cases}</span>
                <span className="text-gray-500">Último contato: {client.lastContact}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Ver Detalhes
              </Button>
              <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Editar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
            <p>Tente ajustar os filtros ou adicione um novo cliente.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
