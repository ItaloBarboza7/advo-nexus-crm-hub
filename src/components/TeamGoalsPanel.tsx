import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Calendar, Trophy, Users, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { BrazilTimezone } from "@/lib/timezone";

interface TeamGoalsPanelProps {
  teamSales: number;
  daysInMonth: number;
  currentDay: number;
  teamSize: number;
}

interface TeamMember {
  user_id: string;
  name: string;
  closed_contracts: number;
  leads: number;
  proposals: number;
  score: number;
}

interface Lead {
  id: string;
  user_id: string;
  status: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface StatusHistory {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  parent_user_id: string | null;
}

export function TeamGoalsPanel({ 
  teamSales, 
  daysInMonth, 
  currentDay,
  teamSize
}: TeamGoalsPanelProps) {
  const [todayContracts, setTodayContracts] = useState(0);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedMemberLeads, setSelectedMemberLeads] = useState<Lead[]>([]);
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [showMemberLeads, setShowMemberLeads] = useState(false);
  const [isLoadingMemberLeads, setIsLoadingMemberLeads] = useState(false);
  
  // NOVO: Estados para as metas configuradas
  const [teamGoal, setTeamGoal] = useState(100); // Meta mensal padrão
  const [dailyGoal, setDailyGoal] = useState(3); // Meta diária padrão
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  
  const { tenantSchema } = useTenantSchema();

  console.log('TeamGoalsPanel props:', { teamSales, teamGoal, daysInMonth, currentDay, teamSize });
  
  const progressPercentage = (teamSales / teamGoal) * 100;
  const expectedProgress = (currentDay / daysInMonth) * 100;
  const isOnTrack = progressPercentage >= expectedProgress;
  const remainingSales = Math.max(0, teamGoal - teamSales);
  const daysRemaining = daysInMonth - currentDay;
  const dailyTarget = daysRemaining > 0 ? Math.ceil(remainingSales / daysRemaining) : 0;

  // NOVO: Carregar metas configuradas
  useEffect(() => {
    const loadTeamGoals = async () => {
      try {
        setIsLoadingGoals(true);
        console.log("🎯 TeamGoalsPanel - Carregando metas configuradas...");
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("❌ Usuário não autenticado para carregar metas");
          return;
        }

        console.log("👤 Buscando metas para user ID:", user.id);

        const { data: goals, error } = await supabase
          .from('team_goals')
          .select('monthly_goal, daily_goal')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log("🎯 Metas configuradas encontradas:", goals);
        console.log("❓ Erro na busca de metas:", error);

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Erro ao carregar metas configuradas:', error);
          return;
        }

        if (goals) {
          console.log("✅ Aplicando metas configuradas:", goals);
          setTeamGoal(goals.monthly_goal || 100);
          setDailyGoal(goals.daily_goal || 3);
        } else {
          console.log("📝 Nenhuma meta configurada encontrada, usando valores padrão");
        }
      } catch (error) {
        console.error('❌ Erro inesperado ao carregar metas configuradas:', error);
      } finally {
        setIsLoadingGoals(false);
      }
    };

    loadTeamGoals();
  }, []);

  // Verificar se o usuário é admin
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('parent_user_id')
          .eq('user_id', user.id)
          .single();

        // É admin se não tem parent_user_id (é o usuário principal)
        setIsAdmin(!profile?.parent_user_id);
      } catch (error) {
        console.error("❌ Erro ao verificar role do usuário:", error);
      }
    };

    checkUserRole();
  }, []);

  // Buscar contratos fechados hoje
  useEffect(() => {
    const fetchTodayContracts = async () => {
      if (!tenantSchema) return;
      
      try {
        setIsLoadingToday(true);
        console.log("📊 TeamGoalsPanel - Buscando contratos fechados hoje...");

        const today = BrazilTimezone.now();
        const todayStr = BrazilTimezone.formatDateForQuery(today);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT COUNT(*) as contracts_today
            FROM ${tenantSchema}.leads
            WHERE status = 'Contrato Fechado'
              AND DATE(updated_at AT TIME ZONE 'America/Sao_Paulo') = '${todayStr}'
          `
        });

        if (error) {
          console.error("❌ Erro ao buscar contratos de hoje:", error);
          return;
        }

        // Safe type handling for the RPC response
        let contractsCount = 0;
        if (Array.isArray(data) && data.length > 0) {
          const firstRow = data[0] as unknown;
          if (firstRow && typeof firstRow === 'object' && 'contracts_today' in firstRow) {
            contractsCount = parseInt(String((firstRow as any).contracts_today)) || 0;
          }
        }
        
        console.log(`📈 TeamGoalsPanel - ${contractsCount} contratos fechados hoje`);
        setTodayContracts(contractsCount);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar contratos de hoje:", error);
      } finally {
        setIsLoadingToday(false);
      }
    };

    fetchTodayContracts();
  }, [tenantSchema]);

  // Buscar membros da equipe com MESMA LÓGICA do useTeamResults
  const fetchTeamMembers = async () => {
    if (!tenantSchema || !isAdmin) return;
    
    try {
      setIsLoadingMembers(true);
      console.log("👥 TeamGoalsPanel - Buscando membros da equipe...");

      // Obter dados do usuário atual (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar apenas membros da equipe (que têm este admin como parent)
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          name,
          email,
          parent_user_id
        `)
        .or(`user_id.eq.${user.id},parent_user_id.eq.${user.id}`);

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      console.log(`👥 TeamGoalsPanel - ${profiles?.length || 0} perfis encontrados`);

      // Buscar leads do esquema do tenant
      const { data: leadsData, error: leadsError } = await supabase.rpc('exec_sql', {
        sql: `SELECT * FROM ${tenantSchema}.leads`
      });

      if (leadsError) {
        console.error('❌ Erro ao buscar leads:', leadsError);
        throw leadsError;
      }

      // Type cast the leads data - cast through unknown first
      const leads = Array.isArray(leadsData) ? (leadsData as unknown) as Lead[] : [];
      console.log(`📊 TeamGoalsPanel - ${leads.length} leads encontrados`);

      // Buscar histórico de status
      const { data: statusHistoryData, error: historyError } = await supabase.rpc('exec_sql', {
        sql: `SELECT * FROM ${tenantSchema}.lead_status_history ORDER BY changed_at DESC`
      });

      if (historyError) {
        console.error('❌ Erro ao buscar histórico de status:', historyError);
        throw historyError;
      }

      // Type cast the status history data - cast through unknown first
      const statusHistory = Array.isArray(statusHistoryData) ? (statusHistoryData as unknown) as StatusHistory[] : [];
      console.log(`📈 TeamGoalsPanel - ${statusHistory.length} registros de histórico encontrados`);

      // Função para verificar se um lead passou por determinados status
      const hasLeadPassedThroughStatus = (leadId: string, statuses: string[]): boolean => {
        return statusHistory.some(history => 
          history.lead_id === leadId && statuses.includes(history.new_status)
        );
      };

      // Processar dados da equipe usando MESMA LÓGICA do useTeamResults
      const teamMembersData: TeamMember[] = [];

      for (const profile of profiles || []) {
        const userId = profile.user_id;
        
        // Calcular estatísticas reais para este usuário específico
        const userLeads = leads.filter(lead => lead.user_id === userId);
        
        // CORREÇÃO: Contar propostas considerando leads que passaram por Proposta/Reunião
        const userProposals = userLeads.filter(lead => {
          // Se está atualmente em Proposta ou Reunião, conta
          if (['Proposta', 'Reunião'].includes(lead.status)) {
            return true;
          }
          // Se passou por Proposta ou Reunião no histórico, também conta
          return hasLeadPassedThroughStatus(lead.id, ['Proposta', 'Reunião']);
        });
        
        const userSales = userLeads.filter(lead => 
          lead.status === 'Contrato Fechado'
        );

        // MESMO SISTEMA DE PONTUAÇÃO: Leads = 5pts, Propostas = 10pts, Vendas = 100pts
        const score = (userLeads.length * 5) + (userProposals.length * 10) + (userSales.length * 100);

        teamMembersData.push({
          user_id: userId,
          name: profile.name || 'Usuário',
          closed_contracts: userSales.length,
          leads: userLeads.length,
          proposals: userProposals.length,
          score
        });

        console.log(`👤 TeamGoalsPanel - Processado: ${profile.name} - ${userLeads.length} leads, ${userProposals.length} propostas, ${userSales.length} vendas - Score: ${score}`);
      }

      // Ordenar por score (melhor performance primeiro)
      teamMembersData.sort((a, b) => b.score - a.score);

      console.log(`✅ TeamGoalsPanel - ${teamMembersData.length} membros da equipe processados`);
      setTeamMembers(teamMembersData);
    } catch (error) {
      console.error("❌ Erro inesperado ao buscar membros:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Buscar leads fechados por um membro específico
  const fetchMemberLeads = async (userId: string, memberName: string) => {
    if (!tenantSchema) return;
    
    try {
      setIsLoadingMemberLeads(true);
      console.log(`🔍 Buscando leads fechados por ${memberName}...`);

      const { data: leadsData, error: leadsError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT * FROM ${tenantSchema}.leads 
          WHERE user_id = '${userId}' 
          AND status = 'Contrato Fechado'
          ORDER BY updated_at DESC
        `
      });

      if (leadsError) {
        console.error('❌ Erro ao buscar leads do membro:', leadsError);
        throw leadsError;
      }

      const leads = Array.isArray(leadsData) ? (leadsData as unknown) as Lead[] : [];
      console.log(`📊 ${leads.length} leads fechados encontrados para ${memberName}`);
      
      setSelectedMemberLeads(leads);
      setSelectedMemberName(memberName);
      setShowMemberLeads(true);
    } catch (error) {
      console.error("❌ Erro inesperado ao buscar leads do membro:", error);
    } finally {
      setIsLoadingMemberLeads(false);
    }
  };

  const handleToggleTeamMembers = async () => {
    if (!showTeamMembers && teamMembers.length === 0) {
      await fetchTeamMembers();
    }
    setShowTeamMembers(!showTeamMembers);
  };

  const handleMemberClick = (userId: string, memberName: string) => {
    fetchMemberLeads(userId, memberName);
  };

  const handleCloseMemberLeads = () => {
    setShowMemberLeads(false);
    setSelectedMemberLeads([]);
    setSelectedMemberName('');
  };

  // Mostrar loading se ainda estiver carregando as metas
  if (isLoadingGoals) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando metas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Target className="h-5 w-5 text-gray-600" />
          Meta da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {teamSales}
            </div>
            <p className="text-sm text-gray-600">Contratos Fechados</p>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {teamGoal}
            </div>
            <p className="text-sm text-gray-600">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso da Equipe</span>
            <span className="text-sm font-bold text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                isOnTrack 
                  ? 'bg-green-600' 
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <TrendingUp className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <div>
              <div className="text-lg font-bold text-gray-900">
                {isLoadingToday ? '...' : todayContracts}
              </div>
              <p className="text-xs text-gray-600">Hoje</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <Calendar className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <div>
              <div className="text-lg font-bold text-gray-900">{daysRemaining}</div>
              <p className="text-xs text-gray-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Meta diária - ATUALIZADO para usar o valor configurado */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 border border-gray-300">
          <Trophy className="h-4 w-4 text-gray-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900">{dailyTarget}</div>
            <p className="text-xs text-gray-700 font-medium">Meta diária (baseada na meta configurada: {dailyGoal})</p>
          </div>
        </div>

        {/* Botão para dados da equipe - apenas para admin */}
        {isAdmin && (
          <div className="space-y-3">
            <Button
              onClick={handleToggleTeamMembers}
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Users className="h-4 w-4 mr-2" />
              {showTeamMembers ? 'Ocultar Dados da Equipe' : 'Ver Dados da Equipe'}
              {showTeamMembers ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>

            {/* Lista de membros da equipe */}
            {showTeamMembers && (
              <div className="space-y-2 border-t pt-3">
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Carregando membros...</span>
                  </div>
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((member, index) => (
                    <div key={member.user_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleMemberClick(member.user_id, member.name)}
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                        >
                          <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 hover:underline">
                            {member.name}
                          </span>
                          {index === 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              1º
                            </span>
                          )}
                        </button>
                        <div className="text-sm font-bold text-green-600">
                          {member.closed_contracts} vendas
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum membro encontrado</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal dos leads do membro */}
            {showMemberLeads && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Vendas de {selectedMemberName}
                      </h3>
                      <button
                        onClick={handleCloseMemberLeads}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {isLoadingMemberLeads ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Carregando leads...</span>
                      </div>
                    ) : selectedMemberLeads.length > 0 ? (
                      <div className="space-y-3">
                        {selectedMemberLeads.map((lead) => (
                          <div key={lead.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{lead.name}</h4>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Contrato Fechado
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>📱 {lead.phone}</p>
                              {lead.email && <p>📧 {lead.email}</p>}
                              <p className="text-xs text-gray-500 mt-1">
                                Fechado em: {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Nenhuma venda encontrada para este membro</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
