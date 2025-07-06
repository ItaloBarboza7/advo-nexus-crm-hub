
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TeamGoalsSettingsProps {
  onGoalsUpdated?: () => void;
}

export function TeamGoalsSettings({ onGoalsUpdated }: TeamGoalsSettingsProps) {
  const [monthlyGoal, setMonthlyGoal] = useState<number>(100);
  const [dailyGoal, setDailyGoal] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Carregar metas atuais do tenant principal
  useEffect(() => {
    loadCurrentGoals();
  }, []);

  const loadCurrentGoals = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 TeamGoalsSettings - Carregando metas da equipe...");
      
      // Obter o tenant ID (admin principal)
      const { data: tenantId, error: tenantError } = await supabase.rpc('get_tenant_id');
      
      if (tenantError) {
        console.error("❌ Erro ao obter tenant ID:", tenantError);
        return;
      }

      console.log("👤 Tenant ID:", tenantId);

      // Buscar metas salvas para o tenant principal
      const { data: goals, error } = await supabase
        .from('team_goals')
        .select('monthly_goal, daily_goal')
        .eq('user_id', tenantId)
        .maybeSingle();

      console.log("📊 Metas da equipe encontradas:", goals);
      console.log("❓ Erro na busca:", error);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Erro ao carregar metas da equipe:', error);
        return;
      }

      if (goals) {
        console.log("✅ Aplicando metas da equipe carregadas:", goals);
        setMonthlyGoal(goals.monthly_goal || 100);
        setDailyGoal(goals.daily_goal || 3);
      } else {
        console.log("📝 Nenhuma meta da equipe encontrada, usando valores padrão");
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar metas da equipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    if (monthlyGoal <= 0 || dailyGoal <= 0) {
      toast({
        title: "Erro de validação",
        description: "As metas devem ser números positivos.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log("💾 TeamGoalsSettings - Iniciando salvamento das metas da equipe...");
      
      // Obter o tenant ID (admin principal)
      const { data: tenantId, error: tenantError } = await supabase.rpc('get_tenant_id');
      
      if (tenantError) {
        console.error("❌ Erro ao obter tenant ID para salvamento:", tenantError);
        toast({
          title: "Erro",
          description: "Não foi possível identificar o administrador da equipe.",
          variant: "destructive"
        });
        return;
      }

      console.log("👤 Salvando metas para tenant ID:", tenantId);
      console.log("📊 Metas da equipe a salvar:", { monthlyGoal, dailyGoal });

      // Primeiro, verificar se já existe um registro para o tenant
      const { data: existingGoal, error: selectError } = await supabase
        .from('team_goals')
        .select('id')
        .eq('user_id', tenantId)
        .maybeSingle();

      console.log("🔍 Meta da equipe existente:", existingGoal);
      console.log("❓ Erro na verificação:", selectError);

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar meta da equipe existente:', selectError);
        toast({
          title: "Erro",
          description: "Não foi possível verificar as metas da equipe existentes.",
          variant: "destructive"
        });
        return;
      }

      let result;
      if (existingGoal) {
        // Atualizar registro existente
        console.log("🔄 Atualizando metas da equipe existentes...");
        result = await supabase
          .from('team_goals')
          .update({
            monthly_goal: monthlyGoal,
            daily_goal: dailyGoal,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', tenantId);
      } else {
        // Criar novo registro
        console.log("➕ Criando novas metas da equipe...");
        result = await supabase
          .from('team_goals')
          .insert({
            user_id: tenantId,
            monthly_goal: monthlyGoal,
            daily_goal: dailyGoal
          });
      }

      console.log("💾 Resultado do salvamento das metas da equipe:", result);

      if (result.error) {
        console.error('❌ Erro ao salvar metas da equipe:', result.error);
        toast({
          title: "Erro",
          description: `Não foi possível salvar as metas da equipe: ${result.error.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log("✅ Metas da equipe salvas com sucesso!");
      toast({
        title: "Metas da equipe atualizadas!",
        description: "As metas da equipe foram salvas e se aplicam a todos os membros.",
      });

      if (onGoalsUpdated) {
        onGoalsUpdated();
      }

    } catch (error) {
      console.error('❌ Erro inesperado ao salvar metas da equipe:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao salvar as metas da equipe.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-4">
          <p className="text-gray-500">Carregando metas da equipe...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Target className="h-5 w-5 text-gray-600" />
          Metas da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-goal" className="text-sm font-medium text-gray-700">
              Meta Mensal (contratos)
            </Label>
            <Input
              id="monthly-goal"
              type="number"
              min="1"
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 0)}
              placeholder="Ex: 100"
              className="w-full"
            />
            <p className="text-xs text-gray-500">Número de contratos a serem fechados por mês pela equipe</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="daily-goal" className="text-sm font-medium text-gray-700">
              Meta Diária (contratos)
            </Label>
            <Input
              id="daily-goal"
              type="number"
              min="1"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(parseInt(e.target.value) || 0)}
              placeholder="Ex: 3"
              className="w-full"
            />
            <p className="text-xs text-gray-500">Meta diária da equipe baseada nos dias úteis restantes</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveGoals}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Metas da Equipe'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
