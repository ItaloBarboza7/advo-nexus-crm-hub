
import { Card } from "@/components/ui/card";
import { Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";

interface Contract {
  id: string;
  clientName: string;
  closedBy: string;
  value: number;
  time: string;
  email?: string;
  phone?: string;
}

interface DailyContractsPanelProps {
  selectedDate: Date | null;
  onClose: () => void;
}

export function DailyContractsPanel({ selectedDate, onClose }: DailyContractsPanelProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const { tenantSchema } = useTenantSchema();

  // Buscar usuário atual apenas uma vez
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("❌ Erro ao buscar usuário:", userError);
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const userData = {
          id: user.id,
          name: profile?.name || user.email || 'Usuário'
        };
        
        console.log("✅ Usuário carregado:", userData);
        setCurrentUser(userData);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar usuário:", error);
        setError("Erro ao carregar dados do usuário");
      }
    };

    getCurrentUser();
  }, []);

  // Buscar contratos quando temos todas as dependências necessárias
  useEffect(() => {
    const fetchContracts = async () => {
      // Verificar se temos todas as dependências necessárias
      if (!selectedDate || !currentUser || !tenantSchema) {
        console.log("🚫 Dependências não atendidas:", {
          selectedDate: !!selectedDate,
          currentUser: !!currentUser,
          tenantSchema: !!tenantSchema
        });
        setContracts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Formatar a data corretamente para a consulta SQL
        const selectedDateStr = selectedDate.toISOString().slice(0, 10); // YYYY-MM-DD
        
        console.log("📅 Buscando contratos para:", {
          displayDate: format(selectedDate, "dd/MM/yyyy"),
          queryDate: selectedDateStr,
          userId: currentUser.id,
          schema: tenantSchema
        });

        const { data, error } = await supabase.rpc('exec_sql' as any, {
          sql: `
            SELECT 
              id,
              name,
              email,
              phone,
              value,
              created_at,
              updated_at,
              closed_by_user_id
            FROM ${tenantSchema}.leads 
            WHERE status = 'Contrato Fechado' 
              AND closed_by_user_id = '${currentUser.id}'
              AND DATE(updated_at) = DATE('${selectedDateStr}')
            ORDER BY updated_at DESC
          `
        });

        if (error) {
          throw new Error(`Erro na consulta: ${error.message}`);
        }

        console.log("📊 Dados retornados:", data);

        const leadsData = Array.isArray(data) ? data : [];
        const transformedContracts: Contract[] = leadsData.map((lead: any) => ({
          id: lead.id,
          clientName: lead.name,
          closedBy: currentUser.name,
          value: lead.value || 0,
          time: new Date(lead.updated_at).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          email: lead.email,
          phone: lead.phone
        }));

        console.log(`✅ ${transformedContracts.length} contratos processados`);
        setContracts(transformedContracts);
      } catch (error: any) {
        console.error('❌ Erro ao buscar contratos:', error);
        setError(error.message || "Erro ao carregar contratos");
        setContracts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [selectedDate, currentUser, tenantSchema]); // Dependências diretas, sem callbacks

  if (!selectedDate) return null;

  const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);

  return (
    <Card className="p-6 bg-white border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Painel de Atividade - {format(selectedDate, "dd/MM/yyyy")}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      {error ? (
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">❌ Erro</div>
          <p className="text-gray-600">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando contratos...</p>
        </div>
      ) : !currentUser ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do usuário...</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum contrato foi fechado por você nesta data</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{contracts.length}</div>
              <div className="text-sm text-gray-600">Contratos Fechados</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                R$ {totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-600">Valor Total</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                R$ {contracts.length > 0 ? Math.round(totalValue / contracts.length).toLocaleString('pt-BR') : '0'}
              </div>
              <div className="text-sm text-gray-600">Ticket Médio</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 mb-3">Contratos fechados por você:</h4>
            {contracts.map((contract) => (
              <div key={contract.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-900">{contract.clientName}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Fechado por: {contract.closedBy}</span>
                      </div>
                      <span>Horário: {contract.time}</span>
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
