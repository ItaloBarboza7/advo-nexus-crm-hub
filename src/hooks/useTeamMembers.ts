
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamMember {
  user_id: string;
  name: string;
  email?: string;
  title?: string;
}

export function useTeamMembers() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Buscar o perfil do usuário atual para determinar se é admin ou member
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', user.id)
        .single();

      // Se é admin (não tem parent_user_id), buscar todos os membros + ele mesmo
      // Se é member, buscar admin + todos os membros do mesmo tenant
      const tenantId = currentProfile?.parent_user_id || user.id;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, name, email, title, parent_user_id')
        .or(`user_id.eq.${tenantId},parent_user_id.eq.${tenantId}`);

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      return data.map(profile => ({
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        title: profile.title,
      })) as TeamMember[];
    },
  });

  return {
    members,
    isLoading,
  };
}
