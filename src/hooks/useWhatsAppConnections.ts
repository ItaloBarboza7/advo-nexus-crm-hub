
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppConnection, CreateWhatsAppConnectionRequest, UpdateWhatsAppConnectionRequest } from "@/types/whatsapp";
import { useToast } from "@/hooks/use-toast";

export function useWhatsAppConnections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['whatsapp-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching WhatsApp connections:', error);
        throw error;
      }
      
      return data as WhatsAppConnection[];
    },
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (connectionData: CreateWhatsAppConnectionRequest) => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert(connectionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
      toast({
        title: "Conexão criada com sucesso!",
        description: "A nova conexão WhatsApp foi adicionada.",
      });
    },
    onError: (error) => {
      console.error('Error creating connection:', error);
      toast({
        title: "Erro ao criar conexão",
        description: "Ocorreu um erro ao criar a conexão WhatsApp.",
        variant: "destructive",
      });
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateWhatsAppConnectionRequest & { id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
      toast({
        title: "Conexão atualizada!",
        description: "A conexão WhatsApp foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating connection:', error);
      toast({
        title: "Erro ao atualizar conexão",
        description: "Ocorreu um erro ao atualizar a conexão.",
        variant: "destructive",
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
      toast({
        title: "Conexão removida!",
        description: "A conexão WhatsApp foi removida.",
      });
    },
    onError: (error) => {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro ao remover conexão",
        description: "Ocorreu um erro ao remover a conexão.",
        variant: "destructive",
      });
    },
  });

  return {
    connections,
    isLoading,
    createConnection: createConnectionMutation.mutate,
    updateConnection: updateConnectionMutation.mutate,
    deleteConnection: deleteConnectionMutation.mutate,
    isCreating: createConnectionMutation.isPending,
    isUpdating: updateConnectionMutation.isPending,
    isDeleting: deleteConnectionMutation.isPending,
  };
}
