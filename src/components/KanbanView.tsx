
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin } from "lucide-react";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  interest: string;
  value: string;
  lastContact: string;
  avatar: string;
}

interface KanbanViewProps {
  leads: Lead[];
}

const kanbanColumns = [
  { id: "Novo", title: "Novo", color: "bg-blue-100 text-blue-800" },
  { id: "Proposta", title: "Proposta", color: "bg-yellow-100 text-yellow-800" },
  { id: "Reunião", title: "Reunião", color: "bg-purple-100 text-purple-800" },
  { id: "Contrato Fechado", title: "Contrato Fechado", color: "bg-green-100 text-green-800" },
  { id: "Perdido", title: "Perdido", color: "bg-red-100 text-red-800" },
  { id: "Finalizado", title: "Finalizado", color: "bg-gray-100 text-gray-800" },
];

export function KanbanView({ leads }: KanbanViewProps) {
  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kanbanColumns.map((column) => (
        <div key={column.id} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <Badge className={column.color}>
              {getLeadsByStatus(column.id).length}
            </Badge>
          </div>
          <div className="space-y-3">
            {getLeadsByStatus(column.id).map((lead) => (
              <Card key={lead.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                    {lead.avatar}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">{lead.name}</h4>
                    <p className="text-xs text-green-600 font-medium">{lead.value}</p>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{lead.company}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">{lead.interest}</p>
                  <p className="text-xs text-gray-400">Último contato: {lead.lastContact}</p>
                </div>

                <div className="mt-2 flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    Ver
                  </Button>
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs">
                    Editar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
