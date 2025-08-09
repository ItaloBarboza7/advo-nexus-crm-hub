
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserPermission {
  id: string;
  user_id: string;
  permission_type: string;
  granted: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = async (userId: string, permissionType: string, granted: boolean) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_type: permissionType,
          granted: granted
        }, {
          onConflict: 'user_id,permission_type'
        });

      if (error) throw error;

      toast({
        title: "Permissão atualizada",
        description: `Acesso ${granted ? 'liberado' : 'removido'} com sucesso.`,
      });

      fetchPermissions();
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a permissão.",
        variant: "destructive",
      });
    }
  };

  const hasPermission = (userId: string, permissionType: string): boolean => {
    const permission = permissions.find(
      p => p.user_id === userId && p.permission_type === permissionType
    );
    return permission ? permission.granted : false;
  };

  const getCurrentUserPermission = async (permissionType: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_permissions')
        .select('granted')
        .eq('user_id', user.id)
        .eq('permission_type', permissionType)
        .single();

      // Se a permissão existe, retornar seu valor explicitamente
      if (data && typeof data.granted === 'boolean') {
        return data.granted;
      }

      // Caso não exista permissão específica, verificar se é admin via perfil
      // IMPORTANTE: Só concede se o perfil existir e indicar admin (parent_user_id NULL)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', user.id)
        .single();

      const isAdmin = !!profile && profile.parent_user_id === null;
      return isAdmin;
    } catch (error) {
      console.error('Erro ao verificar permissão do usuário atual:', error);
      // Em erro, negar por padrão para evitar escalonamento de privilégio
      return false;
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return {
    permissions,
    isLoading,
    updatePermission,
    hasPermission,
    getCurrentUserPermission,
    refreshPermissions: fetchPermissions
  };
}

