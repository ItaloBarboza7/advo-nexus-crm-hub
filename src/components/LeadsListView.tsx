
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Mail, MapPin, Edit, Trash2, Eye, DollarSign } from "lucide-react";
import { Lead } from "@/types/lead";

interface LeadsListViewProps {
  leads: Lead[];
  onViewDetails: (lead: Lead) => void;
  onEditStatus: (lead: Lead) => void;
  onDeleteLead: (leadId: string, leadName: string) => void;
  getStatusColor: (status: string) => string;
  formatDate: (dateString: string) => string;
  formatCurrency: (value: number | null) => string;
}

export function LeadsListView({
  leads,
  onViewDetails,
  onEditStatus,
  onDeleteLead,
  getStatusColor,
  formatDate,
  formatCurrency
}: LeadsListViewProps) {
  if (leads.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-500">
          <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
          <p>Comece criando seu primeiro lead ou ajuste os filtros de busca.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Grupo de Ação</TableHead>
            <TableHead>Tipo e Ação</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow 
              key={lead.id} 
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onViewDetails(lead)}
            >
              <TableCell>
                <div className="font-medium text-gray-900">{lead.name}</div>
                {lead.description && (
                  <div className="text-sm text-gray-500 line-clamp-1 max-w-xs">
                    {lead.description}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{lead.phone}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <DollarSign className="h-3 w-3" />
                  <span>{formatCurrency(lead.value)}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {lead.action_group || "Não informado"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {lead.action_type || "Não informado"}
                </span>
              </TableCell>
              <TableCell>
                {lead.state && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span>{lead.state}</span>
                  </div>
                )}
                {!lead.state && (
                  <span className="text-sm text-gray-400">Não informado</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {lead.source || "Não informado"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-500">
                  {formatDate(lead.created_at)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(lead);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStatus(lead);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLead(lead.id, lead.name);
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
