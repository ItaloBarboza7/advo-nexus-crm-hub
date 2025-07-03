
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

      // Buscar todos os membros da equipe (admin + membros)
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          name,
          email,
          parent_user_id
        `);

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      // Buscar roles dos usuários
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

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

      // Obter tenant ID atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tenantId = user.id;

      // Processar cada perfil
      for (const profile of profiles || []) {
        const userId = profile.user_id;
        const role = roleMap.get(userId);
        const isAdmin = role === 'admin';
        
        // Incluir admin principal e membros do tenant atual
        let belongsToTenant = false;
        
        if (isAdmin && userId === tenantId) {
          // Admin principal
          belongsToTenant = true;
        } else if (!isAdmin && profile.parent_user_id === tenantId) {
          // Membro do admin
          belongsToTenant = true;
        }

        if (!belongsToTenant) continue;

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
      }

      // Ordenar por score (melhor performance primeiro)
      teamMembersData.sort((a, b) => b.score - a.score);

      console.log(`✅ useTeamResults - ${teamMembersData.length} membros da equipe processados (incluindo admin)`);
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
