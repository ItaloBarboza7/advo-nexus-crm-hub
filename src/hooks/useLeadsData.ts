
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";

interface LossReason {
  id: string;
  reason: string;
}

export function useLeadsData() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lossReasons, setLossReasons] = useState<LossReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLossReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('loss_reasons')
        .select('*')
        .order('reason', { ascending: true });

      if (error) {
        console.error('Erro ao buscar motivos de perda:', error);
        return;
      }

      setLossReasons(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar motivos de perda:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads.",
          variant: "destructive"
        });
        return;
      }

      // Transform the data to match our Lead type by adding missing fields
      const transformedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        company: undefined, // Handle optional fields that don't exist in database
        interest: undefined,
        lastContact: undefined,
        avatar: undefined
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Erro inesperado ao buscar leads:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao carregar os leads.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLossReasons();
    fetchLeads();
  }, []);

  return {
    leads,
    lossReasons,
    isLoading,
    fetchLeads
  };
}
