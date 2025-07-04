
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenantSchema } from "@/hooks/useTenantSchema";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  leads: number;
  proposals: number;
  sales: number;
  score: number;
  conversion_rate: number;
}

export function useTeamResults() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { tenantSchema } = useTenantSchema();

  const fetchTeamResults = useCallback(async () => {
    if (!tenantSchema) return;
    
    try {
      setIsLoading(true);
      console.log("🔍 useTeamResults - Buscando dados da equipe...");

      // Obter dados do usuário atual para determinar o tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar o perfil do usuário atual para determinar se é admin ou membro
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', user.id)
        .single();

      if (currentProfileError) {
        console.error('❌ Erro ao buscar perfil atual:', currentProfileError);
        throw currentProfileError;
      }

      // Determinar o tenant_id (admin principal)
      const tenantId = currentProfile?.parent_user_id || user.id;
      console.log(`📋 useTeamResults - Tenant ID determinado: ${tenantId}`);

      // Buscar todos os membros da equipe (admin + membros do tenant)
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          name,
          email,
          parent_user_id
        `)
        .or(`user_id.eq.${tenantId},parent_user_id.eq.${tenantId}`);

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      console.log(`👥 useTeamResults - ${profiles?.length || 0} perfis encontrados`);

      // Buscar roles dos usuários
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        console.error('❌ Erro ao buscar roles:', rolesError);
        throw rolesError;
      }

      // Buscar leads do esquema do tenant
      const { data: leads, error: leadsError } = await supabase.rpc('exec_sql' as any, {
        sql: `SELECT * FROM ${tenantSchema}.leads`
      });

      if (leadsError) {
        console.error('❌ Erro ao buscar leads:', leadsError);
        throw leadsError;
      }

      const leadsData = Array.isArray(leads) ? leads : [];
      console.log(`📊 useTeamResults - ${leadsData.length} leads encontrados`);

      // Processar dados da equipe
      const teamMembersData: TeamMember[] = [];
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Processar cada perfil
      for (const profile of profiles || []) {
        const userId = profile.user_id;
        const role = roleMap.get(userId);
        const isAdmin = role === 'admin';
        
        // Calcular estatísticas reais para este usuário específico
        const userLeads = leadsData.filter(lead => lead.user_id === userId);
        const userProposals = userLeads.filter(lead => 
          ['Proposta', 'Reunião'].includes(lead.status)
        );
        const userSales = userLeads.filter(lead => 
          lead.status === 'Contrato Fechado'
        );

        // Calcular taxa de conversão
        const conversionRate = userProposals.length > 0 ? 
          (userSales.length / userProposals.length) * 100 : 0;
        
        // Calcular score baseado em performance real
        const score = Math.min(100, Math.round(
          (userSales.length * 40) + 
          (userProposals.length * 20) + 
          (userLeads.length * 10) + 
          (conversionRate * 0.3)
        ));

        teamMembersData.push({
          id: userId,
          name: profile.name || 'Usuário',
          email: profile.email || '',
          isAdmin,
          leads: userLeads.length,
          proposals: userProposals.length,
          sales: userSales.length,
          score,
          conversion_rate: Math.round(conversionRate * 10) / 10
        });

        console.log(`👤 useTeamResults - Processado: ${profile.name} (${isAdmin ? 'Admin' : 'Membro'}) - ${userLeads.length} leads, ${userSales.length} vendas`);
      }

      // Ordenar por score (melhor performance primeiro)
      teamMembersData.sort((a, b) => b.score - a.score);

      console.log(`✅ useTeamResults - ${teamMembersData.length} membros da equipe processados`);
      setTeamMembers(teamMembersData);

    } catch (error: any) {
      console.error('❌ Erro ao buscar dados da equipe:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da equipe.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantSchema, toast]);

  useEffect(() => {
    if (tenantSchema) {
      fetchTeamResults();
    }
  }, [tenantSchema]);

  // Calcular estatísticas de comparação
  const teamStats = useMemo(() => {
    if (teamMembers.length === 0) return null;

    const totalLeads = teamMembers.reduce((sum, member) => sum + member.leads, 0);
    const totalProposals = teamMembers.reduce((sum, member) => sum + member.proposals, 0);
    const totalSales = teamMembers.reduce((sum, member) => sum + member.sales, 0);
    const avgScore = teamMembers.reduce((sum, member) => sum + member.score, 0) / teamMembers.length;
    const avgConversion = teamMembers.reduce((sum, member) => sum + member.conversion_rate, 0) / teamMembers.length;

    const topPerformer = teamMembers[0]; // Já ordenado por score
    const bestConverter = teamMembers.reduce((best, current) => 
      current.conversion_rate > best.conversion_rate ? current : best
    );

    return {
      totalLeads,
      totalProposals,
      totalSales,
      avgScore: Math.round(avgScore),
      avgConversion: Math.round(avgConversion * 10) / 10,
      topPerformer,
      bestConverter,
      teamSize: teamMembers.length
    };
  }, [teamMembers]);

  return {
    teamMembers,
    teamStats,
    isLoading,
    refreshData: fetchTeamResults
  };
}
