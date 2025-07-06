
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  user_id: string;
  name: string;
  closed_contracts: number;
}

interface TeamMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMembersModal({ open, onOpenChange }: TeamMembersModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tenantSchema } = useTenantSchema();
  const { toast } = useToast();

  const fetchTeamMembers = async () => {
    if (!tenantSchema) return;
    
    try {
      setIsLoading(true);
      console.log("👥 TeamMembersModal - Buscando membros da equipe...");

      // Buscar membros da equipe com contratos fechados
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            up.user_id,
            up.name,
            COUNT(l.id) as closed_contracts
          FROM user_profiles up
          LEFT JOIN ${tenantSchema}.leads l ON l.closed_by_user_id = up.user_id AND l.status = 'Contrato Fechado'
          WHERE up.parent_user_id IS NOT NULL OR up.user_id IN (
            SELECT DISTINCT user_id FROM ${tenantSchema}.leads
          )
          GROUP BY up.user_id, up.name
          ORDER BY closed_contracts DESC, up.name
        `
      });

      if (error) {
        console.error("❌ Erro ao buscar membros da equipe:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os membros da equipe.",
          variant: "destructive"
        });
        return;
      }

      const membersData: TeamMember[] = Array.isArray(data) ? data as unknown as TeamMember[] : [];
      console.log(`✅ TeamMembersModal - ${membersData.length} membros encontrados`);
      setTeamMembers(membersData);
    } catch (error) {
      console.error("❌ Erro inesperado ao buscar membros:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMemberLeads = async (memberId: string, memberName: string) => {
    try {
      console.log(`🔍 Visualizando leads fechados por ${memberName}`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            id, name, phone, value, updated_at
          FROM ${tenantSchema}.leads 
          WHERE closed_by_user_id = '${memberId}' 
            AND status = 'Contrato Fechado'
          ORDER BY updated_at DESC
        `
      });

      if (error) {
        console.error("❌ Erro ao buscar leads do membro:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os leads do membro.",
          variant: "destructive"
        });
        return;
      }

      const leadsData = Array.isArray(data) ? data : [];
      console.log(`📊 ${leadsData.length} leads fechados por ${memberName}`);
      
      // Por enquanto, apenas mostra uma mensagem
      toast({
        title: `Leads de ${memberName}`,
        description: `${leadsData.length} contratos fechados encontrados.`,
      });
    } catch (error) {
      console.error("❌ Erro inesperado:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (open && tenantSchema) {
      fetchTeamMembers();
    }
  }, [open, tenantSchema]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Membros da Equipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando membros...</span>
            </div>
          ) : teamMembers.length > 0 ? (
            teamMembers.map((member) => (
              <Card key={member.user_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Trophy className="h-3 w-3" />
                        <span>{member.closed_contracts} contratos</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewMemberLeads(member.user_id, member.name)}
                    className="text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Ver Leads
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum membro encontrado</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
