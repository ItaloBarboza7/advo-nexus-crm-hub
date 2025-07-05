
import { Card } from "@/components/ui/card";
import { Calendar, User, FileText, X, UserPlus } from "lucide-react";
import { BrazilTimezone } from "@/lib/timezone";
import { ContractData } from "@/hooks/useContractsData";
import { LeadForDate } from "@/hooks/useLeadsForDate";
import { useEffect } from "react";

interface ActivityPanelProps {
  selectedDate: Date;
  contracts: ContractData[];
  leads: LeadForDate[];
  isLoading: boolean;
  error: string | null;
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
}

export function ActivityPanel({ 
  selectedDate, 
  contracts,
  leads,
  isLoading, 
  error, 
  currentUser, 
  onClose 
}: ActivityPanelProps) {
  const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);

  // Enhanced debug logging
  useEffect(() => {
    console.log("🎯 ActivityPanel recebeu dados:", {
      selectedDate: BrazilTimezone.formatDateForDisplay(selectedDate),
      contractsCount: contracts.length,
      leadsCount: leads.length,
      isLoading,
      error,
      currentUser: currentUser?.name,
      contractsData: contracts,
      leadsData: leads,
      totalValue
    });
  }, [selectedDate, contracts, leads, isLoading, error, currentUser, totalValue]);

  return (
    <Card className="p-6 bg-background border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Atividade - {BrazilTimezone.formatDateForDisplay(selectedDate)}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error ? (
        <div className="text-center py-8">
          <div className="text-destructive mb-2">❌ Erro</div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando atividades...</p>
        </div>
      ) : !currentUser ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do usuário...</p>
        </div>
      ) : contracts.length === 0 && leads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>Nenhuma atividade encontrada nesta data</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
              <div className="text-2xl font-bold text-primary">{contracts.length}</div>
              <div className="text-sm text-muted-foreground">Contratos Fechados</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">
                R$ {totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-muted-foreground">Valor Total Vendido</div>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-4 text-center border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-600">
                R$ {contracts.length > 0 ? Math.round(totalValue / contracts.length).toLocaleString('pt-BR') : '0'}
              </div>
              <div className="text-sm text-muted-foreground">Ticket Médio</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 text-center border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-600">{leads.length}</div>
              <div className="text-sm text-muted-foreground">Leads Cadastrados</div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Contratos Fechados */}
            {contracts.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contratos fechados por você:
                </h4>
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div key={contract.id} className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{contract.clientName}</span>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>Fechado por: {contract.closedBy}</span>
                            </div>
                            <span>Horário: {BrazilTimezone.toLocal(contract.closedAt).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}</span>
                            {contract.email && <span>Email: {contract.email}</span>}
                            {contract.phone && <span>Telefone: {contract.phone}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            R$ {contract.value.toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leads Cadastrados */}
            {leads.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Leads cadastrados por você:
                </h4>
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <div key={lead.id} className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <UserPlus className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-foreground">{lead.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              lead.status === 'Contrato Fechado' ? 'bg-green-100 text-green-800' :
                              lead.status === 'Proposta' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'Perdido' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {lead.status}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <span>Telefone: {lead.phone}</span>
                            {lead.email && <span>Email: {lead.email}</span>}
                            {lead.source && <span>Origem: {lead.source}</span>}
                            <span>Cadastrado às: {BrazilTimezone.toLocal(lead.createdAt).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {lead.value && (
                            <div className="text-lg font-bold text-blue-600">
                              R$ {lead.value.toLocaleString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
