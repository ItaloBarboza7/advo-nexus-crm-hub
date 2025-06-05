
import { Card } from "@/components/ui/card";
import { Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface Contract {
  id: string;
  clientName: string;
  closedBy: string;
  value: number;
  time: string;
}

interface DailyContractsPanelProps {
  selectedDate: Date | null;
  onClose: () => void;
}

export function DailyContractsPanel({ selectedDate, onClose }: DailyContractsPanelProps) {
  if (!selectedDate) return null;

  // Dados simulados de contratos para demonstração
  const generateContractsForDate = (date: Date): Contract[] => {
    const day = date.getDate();
    const contracts: Contract[] = [];
    
    // Simular alguns contratos baseado no dia
    if (day % 3 === 0) {
      contracts.push({
        id: '1',
        clientName: 'Empresa Silva & Associados',
        closedBy: 'Maria Silva',
        value: 15000,
        time: '14:30'
      });
    }
    
    if (day % 5 === 0) {
      contracts.push({
        id: '2',
        clientName: 'Consultoria Santos',
        closedBy: 'João Santos',
        value: 8500,
        time: '10:15'
      });
    }
    
    if (day % 7 === 0) {
      contracts.push({
        id: '3',
        clientName: 'Advocacia Oliveira',
        closedBy: 'Ana Costa',
        value: 12000,
        time: '16:45'
      });
    }

    return contracts;
  };

  const contracts = generateContractsForDate(selectedDate);
  const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);

  return (
    <Card className="p-6 bg-white border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Contratos fechados em {format(selectedDate, "dd/MM/yyyy")}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum contrato foi fechado nesta data</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{contracts.length}</div>
              <div className="text-sm text-gray-600">Contratos Fechados</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                R$ {Math.round(totalValue / contracts.length).toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-600">Ticket Médio</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 mb-3">Detalhes dos contratos:</h4>
            {contracts.map((contract) => (
              <div key={contract.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-900">{contract.clientName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Fechado por: {contract.closedBy}</span>
                      </div>
                      <span>Horário: {contract.time}</span>
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
