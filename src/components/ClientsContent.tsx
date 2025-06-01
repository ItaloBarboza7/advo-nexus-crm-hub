
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail, MapPin, Filter, Users, LayoutGrid, List } from "lucide-react";
import { KanbanView } from "@/components/KanbanView";
import { NewLeadForm } from "@/components/NewLeadForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  company?: string;
  source: string | null;
  status: string;
  interest?: string;
  value?: string;
  lastContact?: string;
  avatar?: string;
  description: string | null;
  state: string | null;
  action_type: string | null;
  created_at: string;
  updated_at: string;
}

// Tags consistentes para lista e Kanban
const LEAD_STATUSES = [
  { id: "Novo", title: "Novo", color: "bg-blue-100 text-blue-800" },
  { id: "Qualificado", title: "Qualificado", color: "bg-yellow-100 text-yellow-800" },
  { id: "Proposta", title: "Proposta", color: "bg-purple-100 text-purple-800" },
  { id: "Reunião", title: "Reunião", color: "bg-orange-100 text-orange-800" },
  { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-green-100 text-green-800" },
  { id: "Perdido", title: "Perdido", color: "bg-red-100 text-red-800" },
  { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800" },
];

export function ClientsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isNewLeadFormOpen, setIsNewLeadFormOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lead.description && lead.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    const statusConfig = LEAD_STATUSES.find(s => s.id === status);
    return statusConfig ? statusConfig.color : 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Transform leads for KanbanView component
  const transformedLeads = filteredLeads.map(lead => ({
    id: parseInt(lead.id.replace(/-/g, '').slice(0, 8), 16), // Convert UUID to number for compatibility
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone,
    company: lead.state || 'Não informado',
    source: lead.source || 'Não informado',
    status: lead.status,
    interest: lead.action_type || 'Não informado',
    value: 'R$ 0',
    lastContact: formatDate(lead.created_at),
    avatar: getInitials(lead.name)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">Gerencie seus leads e oportunidades de vendas</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsNewLeadFormOpen(true)}
        >
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

      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <p>Carregando leads...</p>
          </div>
        </Card>
      ) : viewMode === "kanban" ? (
        <KanbanView leads={transformedLeads} statuses={LEAD_STATUSES} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-semibold">
                    {getInitials(lead.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">R$ 0</p>
                  <p className="text-xs text-gray-500">{lead.source || 'Não informado'}</p>
                </div>
              </div>

              <div className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{lead.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{lead.phone}</span>
                </div>
                {lead.state && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{lead.state}</span>
                  </div>
                )}
              </div>

              {lead.description && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 line-clamp-2">{lead.description}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {lead.action_type ? `Tipo: ${lead.action_type}` : 'Tipo não informado'}
                  </span>
                  <span className="text-gray-500">Criado: {formatDate(lead.created_at)}</span>
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

      {filteredLeads.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
            <p>
              {searchTerm 
                ? "Tente ajustar os filtros de busca." 
                : "Comece criando seu primeiro lead."
              }
            </p>
          </div>
        </Card>
      )}

      <NewLeadForm 
        open={isNewLeadFormOpen} 
        onOpenChange={setIsNewLeadFormOpen}
        onLeadCreated={fetchLeads}
      />
    </div>
  );
}
