
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
        
        console.log("📅 DailyContractsPanel - Buscando contratos para:", {
          selectedDate: format(selectedDate, "dd/MM/yyyy"),
          userId: currentUser.id,
          schema: tenantSchema
        });

        // Formatar a data selecionada para comparação (YYYY-MM-DD)
        const dateString = format(selectedDate, "yyyy-MM-dd");
        
        console.log("🔍 DailyContractsPanel - Data formatada para consulta:", dateString);

        // STEP 1: Primeiro, vamos buscar TODOS os leads com status "Contrato Fechado" SEM filtro de data
        console.log("\n🔍 STEP 1: Buscando TODOS os leads com status 'Contrato Fechado'");
        const allClosedLeadsSQL = `
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
          ORDER BY updated_at DESC
        `;

        console.log("🔧 SQL para buscar todos os leads fechados:", allClosedLeadsSQL);

        const { data: allClosedLeads, error: allClosedError } = await supabase.rpc('exec_sql' as any, {
          sql: allClosedLeadsSQL
        });

        if (allClosedError) {
          console.error("❌ Erro ao buscar todos os leads fechados:", allClosedError);
        } else {
          const allClosedLeadsData = Array.isArray(allClosedLeads) ? allClosedLeads : [];
          console.log(`📊 TOTAL de leads com status 'Contrato Fechado': ${allClosedLeadsData.length}`);
          
          allClosedLeadsData.forEach((lead: any, index: number) => {
            console.log(`📋 Lead Fechado ${index + 1}:`, {
              id: lead.id,
              name: lead.name,
              status: lead.status,
              closed_by_user_id: lead.closed_by_user_id,
              created_at: lead.created_at,
              updated_at: lead.updated_at,
              created_date: lead.created_at ? format(new Date(lead.created_at), "yyyy-MM-dd") : null,
              updated_date: lead.updated_at ? format(new Date(lead.updated_at), "yyyy-MM-dd") : null,
              value: lead.value,
              email: lead.email,
              phone: lead.phone
            });
          });
        }

        // STEP 2: Buscar leads fechados pelo usuário atual (sem filtro de data)
        console.log("\n🔍 STEP 2: Buscando leads fechados pelo usuário atual (sem filtro de data)");
        const userClosedLeadsSQL = `
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

        console.log("🔧 SQL para buscar leads fechados pelo usuário:", userClosedLeadsSQL);

        const { data: userClosedLeads, error: userClosedError } = await supabase.rpc('exec_sql' as any, {
          sql: userClosedLeadsSQL
        });

        if (userClosedError) {
          console.error("❌ Erro ao buscar leads fechados pelo usuário:", userClosedError);
        } else {
          const userClosedLeadsData = Array.isArray(userClosedLeads) ? userClosedLeads : [];
          console.log(`📊 TOTAL de leads fechados pelo usuário ${currentUser.name}: ${userClosedLeadsData.length}`);
          
          userClosedLeadsData.forEach((lead: any, index: number) => {
            console.log(`📋 Lead Fechado pelo Usuário ${index + 1}:`, {
              id: lead.id,
              name: lead.name,
              status: lead.status,
              closed_by_user_id: lead.closed_by_user_id,
              created_at: lead.created_at,
              updated_at: lead.updated_at,
              created_date: lead.created_at ? format(new Date(lead.created_at), "yyyy-MM-dd") : null,
              updated_date: lead.updated_at ? format(new Date(lead.updated_at), "yyyy-MM-dd") : null,
              value: lead.value
            });
          });
        }

        // STEP 3: Buscar leads fechados pelo usuário atual NA DATA SELECIONADA
        console.log(`\n🔍 STEP 3: Buscando leads fechados pelo usuário atual na data ${dateString}`);
        const finalSQL = `
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
            AND DATE(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = '${dateString}'
          ORDER BY updated_at DESC
        `;

        console.log("🔧 SQL FINAL para buscar leads na data específica:", finalSQL);

        const { data, error } = await supabase.rpc('exec_sql' as any, {
          sql: finalSQL
        });

        if (error) {
          console.error("❌ DailyContractsPanel - Erro na consulta SQL final:", error);
          throw new Error(`Erro na consulta: ${error.message}`);
        }

        const leadsData = Array.isArray(data) ? data : [];
        console.log(`📊 DailyContractsPanel - ${leadsData.length} contratos encontrados na data ${dateString}:`);

        // Debug: mostrar dados brutos dos leads encontrados na data específica
        leadsData.forEach((lead: any, index: number) => {
          console.log(`📋 Lead Encontrado na Data ${index + 1}:`, {
            id: lead.id,
            name: lead.name,
            status: lead.status,
            closed_by_user_id: lead.closed_by_user_id,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
            updated_date: lead.updated_at ? format(new Date(lead.updated_at), "yyyy-MM-dd") : null,
            value: lead.value
          });
        });

        // STEP 4: Verificar se existe algum lead específico que estamos procurando
        console.log("\n🔍 STEP 4: Verificando se existe o lead 'fechamento3'");
        const fechamento3SQL = `
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
          WHERE name ILIKE '%fechamento3%'
        `;

        const { data: fechamento3Data, error: fechamento3Error } = await supabase.rpc('exec_sql' as any, {
          sql: fechamento3SQL
        });

        if (!fechamento3Error && Array.isArray(fechamento3Data)) {
          console.log(`📊 Leads com nome 'fechamento3': ${fechamento3Data.length}`);
          fechamento3Data.forEach((lead: any, index: number) => {
            console.log(`📋 Lead Fechamento3 ${index + 1}:`, {
              id: lead.id,
              name: lead.name,
              status: lead.status,
              closed_by_user_id: lead.closed_by_user_id,
              created_at: lead.created_at,
              updated_at: lead.updated_at,
              created_date: lead.created_at ? format(new Date(lead.created_at), "yyyy-MM-dd") : null,
              updated_date: lead.updated_at ? format(new Date(lead.updated_at), "yyyy-MM-dd") : null,
              value: lead.value,
              email: lead.email,
              phone: lead.phone,
              user_comparison: `Atual: ${currentUser.id} | Lead: ${lead.closed_by_user_id} | Match: ${lead.closed_by_user_id === currentUser.id}`
            });
          });
        }

        const transformedContracts: Contract[] = leadsData.map((lead: any) => ({
          id: lead.id,
          clientName: lead.name,
          closedBy: currentUser.name,
          value: lead.value || 0,
          time: new Date(lead.updated_at || lead.created_at).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit'
          }),
          email: lead.email,
          phone: lead.phone
        }));

        console.log("✅ DailyContractsPanel - Contratos transformados:", transformedContracts);
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
          <p className="text-sm text-gray-400 mt-2">
            Data consultada: {format(selectedDate, "dd/MM/yyyy")}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Usuário: {currentUser.name} (ID: {currentUser.id})
          </p>
          <p className="text-xs text-red-500 mt-2">
            ⚠️ Verifique o console do navegador para logs detalhados de debug
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
