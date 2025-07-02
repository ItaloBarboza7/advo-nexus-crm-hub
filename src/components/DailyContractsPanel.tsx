
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
        console.log("🚫 DailyContractsPanel - Aguardando dependências:", {
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
        
        // LOG DETALHADO DA DATA SELECIONADA
        console.log("🔍 === INVESTIGAÇÃO DETALHADA ===");
        console.log("📅 Data selecionada RAW:", selectedDate);
        console.log("📅 Data selecionada ISO:", selectedDate.toISOString());
        console.log("📅 Data selecionada local string:", selectedDate.toString());
        
        // Testar diferentes abordagens de data
        const selectedDateUTC = new Date(selectedDate.getTime());
        const selectedDateBrazil = BrazilTimezone.toLocal(selectedDate);
        
        console.log("🕐 Data UTC:", selectedDateUTC.toISOString());
        console.log("🇧🇷 Data Brasil:", selectedDateBrazil.toISOString());
        
        // Formatar data para consulta (YYYY-MM-DD)
        const dateStringUTC = format(selectedDateUTC, "yyyy-MM-dd");
        const dateStringBrazil = BrazilTimezone.formatDateForQuery(selectedDate);
        
        console.log("📝 Data string UTC:", dateStringUTC);
        console.log("📝 Data string Brasil:", dateStringBrazil);
        
        console.log("👤 Usuário:", currentUser.name, "ID:", currentUser.id);
        console.log("🏢 Schema:", tenantSchema);

        // PRIMEIRA CONSULTA: Verificar TODOS os leads do usuário com status "Contrato Fechado"
        const allContractsSQL = `
          SELECT 
            id,
            name,
            email,
            phone,
            value,
            created_at,
            updated_at,
            closed_by_user_id,
            status
          FROM ${tenantSchema}.leads 
          WHERE status = 'Contrato Fechado' 
            AND closed_by_user_id = '${currentUser.id}'
          ORDER BY updated_at DESC
        `;

        console.log("🔧 SQL - Todos os contratos fechados:", allContractsSQL);

        const { data: allContracts, error: allError } = await supabase.rpc('exec_sql' as any, {
          sql: allContractsSQL
        });

        if (allError) {
          console.error("❌ Erro na consulta de todos os contratos:", allError);
          throw new Error(`Erro na consulta: ${allError.message}`);
        }

        const allContractsData = Array.isArray(allContracts) ? allContracts : [];
        console.log(`📊 TOTAL de contratos fechados pelo usuário: ${allContractsData.length}`);

        // Analisar cada contrato detalhadamente
        allContractsData.forEach((contract: any, index: number) => {
          const contractDate = new Date(contract.updated_at || contract.created_at);
          const contractDateBrazil = BrazilTimezone.toLocal(contractDate);
          const contractDateString = BrazilTimezone.formatDateForQuery(contractDate);
          
          console.log(`📋 Contrato ${index + 1}:`);
          console.log(`  - Nome: ${contract.name}`);
          console.log(`  - ID: ${contract.id}`);
          console.log(`  - Status: ${contract.status}`);
          console.log(`  - Updated UTC: ${contractDate.toISOString()}`);
          console.log(`  - Updated Brasil: ${contractDateBrazil.toISOString()}`);
          console.log(`  - Data string: ${contractDateString}`);
          console.log(`  - Comparação com data selecionada (${dateStringBrazil}): ${contractDateString === dateStringBrazil ? '✅ MATCH' : '❌ NO MATCH'}`);
          console.log(`  - Closed by: ${contract.closed_by_user_id}`);
          console.log(`  - Value: ${contract.value}`);
          console.log("  ---");
        });

        // SEGUNDA CONSULTA: Usar múltiplas abordagens para tentar encontrar os contratos
        const queries = [
          // Abordagem 1: Comparação direta com timezone conversion
          `
            SELECT 
              id, name, email, phone, value, created_at, updated_at, closed_by_user_id, status
            FROM ${tenantSchema}.leads 
            WHERE status = 'Contrato Fechado' 
              AND closed_by_user_id = '${currentUser.id}'
              AND DATE(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = '${dateStringBrazil}'
            ORDER BY updated_at DESC
          `,
          // Abordagem 2: Comparação UTC direta
          `
            SELECT 
              id, name, email, phone, value, created_at, updated_at, closed_by_user_id, status
            FROM ${tenantSchema}.leads 
            WHERE status = 'Contrato Fechado' 
              AND closed_by_user_id = '${currentUser.id}'
              AND DATE(updated_at) = '${dateStringUTC}'
            ORDER BY updated_at DESC
          `,
          // Abordagem 3: Range de 24 horas
          `
            SELECT 
              id, name, email, phone, value, created_at, updated_at, closed_by_user_id, status
            FROM ${tenantSchema}.leads 
            WHERE status = 'Contrato Fechado' 
              AND closed_by_user_id = '${currentUser.id}'
              AND updated_at >= '${selectedDate.toISOString().split('T')[0]} 00:00:00'::timestamp
              AND updated_at < ('${selectedDate.toISOString().split('T')[0]} 00:00:00'::timestamp + interval '1 day')
            ORDER BY updated_at DESC
          `
        ];

        let foundContracts: any[] = [];
        
        for (let i = 0; i < queries.length; i++) {
          console.log(`🔧 Testando abordagem ${i + 1}:`, queries[i]);
          
          const { data, error } = await supabase.rpc('exec_sql' as any, {
            sql: queries[i]
          });

          if (error) {
            console.error(`❌ Erro na abordagem ${i + 1}:`, error);
            continue;
          }

          const contracts = Array.isArray(data) ? data : [];
          console.log(`📊 Abordagem ${i + 1} encontrou: ${contracts.length} contratos`);
          
          if (contracts.length > 0) {
            foundContracts = contracts;
            console.log(`✅ Usando resultados da abordagem ${i + 1}`);
            break;
          }
        }

        // Se nenhuma abordagem funcionou, usar a abordagem mais flexível
        if (foundContracts.length === 0) {
          console.log("🔍 Tentando abordagem mais flexível com range de datas...");
          
          // Criar range de 48 horas para capturar possíveis problemas de timezone
          const startDate = new Date(selectedDate);
          startDate.setDate(startDate.getDate() - 1);
          const endDate = new Date(selectedDate);
          endDate.setDate(endDate.getDate() + 1);
          
          const flexibleQuery = `
            SELECT 
              id, name, email, phone, value, created_at, updated_at, closed_by_user_id, status
            FROM ${tenantSchema}.leads 
            WHERE status = 'Contrato Fechado' 
              AND closed_by_user_id = '${currentUser.id}'
              AND updated_at >= '${startDate.toISOString()}'
              AND updated_at <= '${endDate.toISOString()}'
            ORDER BY updated_at DESC
          `;
          
          console.log("🔧 SQL flexível:", flexibleQuery);
          
          const { data, error } = await supabase.rpc('exec_sql' as any, {
            sql: flexibleQuery
          });
          
          if (!error && Array.isArray(data)) {
            foundContracts = data;
            console.log(`📊 Abordagem flexível encontrou: ${foundContracts.length} contratos`);
          }
        }

        console.log(`📊 RESULTADO FINAL: ${foundContracts.length} contratos encontrados`);

        const transformedContracts: Contract[] = foundContracts.map((lead: any) => {
          const leadDate = new Date(lead.updated_at || lead.created_at);
          const localTime = BrazilTimezone.toLocal(leadDate);
          
          return {
            id: lead.id,
            clientName: lead.name,
            closedBy: currentUser.name,
            value: lead.value || 0,
            time: localTime.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit'
            }),
            email: lead.email,
            phone: lead.phone
          };
        });

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
            Usuário: {currentUser.name} (ID: {currentUser.id})
          </p>
          <p className="text-xs text-red-400 mt-2">
            📍 Verifique o console para logs detalhados da investigação
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
