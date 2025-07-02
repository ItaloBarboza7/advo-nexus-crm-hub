import { Card } from "@/components/ui/card";
import { Calendar, User, FileText, X } from "lucide-react";
import { BrazilTimezone } from "@/lib/timezone";
import { ContractData } from "@/hooks/useContractsData";

interface ActivityPanelProps {
  selectedDate: Date;
  contracts: ContractData[];
  isLoading: boolean;
  error: string | null;
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
}

export function ActivityPanel({ 
  selectedDate, 
  contracts, 
  isLoading, 
  error, 
  currentUser, 
  onClose 
}: ActivityPanelProps) {
  const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);

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
          <p className="text-muted-foreground">Carregando contratos...</p>
        </div>
      ) : !currentUser ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do usuário...</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>Nenhum contrato foi fechado por você nesta data</p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Data: {BrazilTimezone.formatDateForDisplay(selectedDate)}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Usuário: {currentUser.name}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
              <div className="text-2xl font-bold text-primary">{contracts.length}</div>
              <div className="text-sm text-muted-foreground">Contratos Fechados</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">
                R$ {totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-4 text-center border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-600">
                R$ {contracts.length > 0 ? Math.round(totalValue / contracts.length).toLocaleString('pt-BR') : '0'}
              </div>
              <div className="text-sm text-muted-foreground">Ticket Médio</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground mb-3">Contratos fechados por você:</h4>
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
        </>
      )}
    </Card>
  );
}