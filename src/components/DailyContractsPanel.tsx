
import { Card } from "@/components/ui/card";
import { Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { BrazilTimezone } from "@/lib/timezone";

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
          console.error("❌ DailyContractsPanel - Erro ao buscar usuário:", userError);
          setError("Erro de autenticação");
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
        
        console.log("👤 DailyContractsPanel - Usuário atual:", userData);
        setCurrentUser(userData);
      } catch (error) {
        console.error("❌ DailyContractsPanel - Erro inesperado ao buscar usuário:", error);
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
        console.log("🚫 DailyContractsPanel - Dependências faltando:", {
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
        
        console.log("📅 DailyContractsPanel - Buscando contratos para:", {
          data: BrazilTimezone.formatDateForDisplay(selectedDate),
          usuario: currentUser.name,
          schema: tenantSchema
        });

        // Simplificar a consulta SQL usando DATE() para comparar apenas a data
        const dateString = BrazilTimezone.formatDateForQuery(selectedDate);
        
        const sql = `
          SELECT 
            l.id, l.name, l.email, l.phone, l.value, 
            cc.closed_at, cc.closed_by_user_id, l.status
          FROM public.contract_closures cc
          JOIN ${tenantSchema}.leads l ON l.id = cc.lead_id
          WHERE cc.tenant_id = '${currentUser.id}'
            AND cc.closed_by_user_id = '${currentUser.id}'
            AND DATE(cc.closed_at AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
          ORDER BY cc.closed_at DESC
        `;

        console.log("🔧 SQL Simplificado:", sql);
        console.log("📅 Data de busca:", dateString);

        const { data, error } = await supabase.rpc('exec_sql' as any, {
          sql: sql
        });

        if (error) {
          console.error("❌ Erro na consulta:", error);
          throw new Error(`Erro na consulta: ${error.message}`);
        }

        console.log("🔍 Resposta bruta da consulta:", data);

        // Processar dados de forma mais simples - data já deve ser um array
        let contractsData = [];
        if (Array.isArray(data)) {
          contractsData = data;
        } else if (data && typeof data === 'string') {
          try {
            contractsData = JSON.parse(data);
          } catch (parseError) {
            console.error("❌ Erro ao fazer parse dos dados:", parseError);
            contractsData = [];
          }
        } else {
          console.warn("⚠️ Formato de dados inesperado:", typeof data, data);
          contractsData = [];
        }
        
        console.log("📊 Dados processados:", {
          contractsData,
          length: contractsData.length,
          firstItem: contractsData[0] || null
        });

        // Validar e transformar os dados
        const transformedContracts: Contract[] = contractsData
          .filter((item: any) => item && typeof item === 'object')
          .map((lead: any) => {
            try {
              const leadDate = new Date(lead.closed_at);
              const localTime = BrazilTimezone.toLocal(leadDate);
              
              return {
                id: lead.id || 'unknown',
                clientName: lead.name || 'Nome não informado',
                closedBy: currentUser.name,
                value: Number(lead.value) || 0,
                time: localTime.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit'
                }),
                email: lead.email || undefined,
                phone: lead.phone || undefined
              };
            } catch (transformError) {
              console.error("❌ Erro ao transformar lead:", transformError, lead);
              return null;
            }
          })
          .filter((contract: Contract | null): contract is Contract => contract !== null);

        console.log("✅ Contratos transformados:", transformedContracts);
        setContracts(transformedContracts);
        
      } catch (error: any) {
        console.error('❌ DailyContractsPanel - Erro ao buscar contratos:', error);
        setError(error.message || "Erro ao carregar contratos");
        setContracts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [selectedDate, currentUser?.id, tenantSchema]);

  if (!selectedDate) return null;

  const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);

  return (
    <Card className="p-6 bg-white border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Painel de Atividade - {BrazilTimezone.formatDateForDisplay(selectedDate)}
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
          <p className="text-sm text-gray-400 mt-2">
            Data consultada: {BrazilTimezone.formatDateForDisplay(selectedDate)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Usuário: {currentUser.name}
          </p>
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
