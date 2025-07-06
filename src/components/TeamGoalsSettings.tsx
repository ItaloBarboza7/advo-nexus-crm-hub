
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

  // Carregar metas atuais
  useEffect(() => {
    loadCurrentGoals();
  }, []);

  const loadCurrentGoals = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar metas salvas na tabela team_goals
      const { data: goals, error } = await supabase
        .from('team_goals')
        .select('monthly_goal, daily_goal')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao carregar metas:', error);
        return;
      }

      if (goals) {
        setMonthlyGoal(goals.monthly_goal || 100);
        setDailyGoal(goals.daily_goal || 3);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar metas:', error);
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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive"
        });
        return;
      }

      // Salvar ou atualizar metas usando upsert
      const { error } = await supabase
        .from('team_goals')
        .upsert({
          user_id: user.id,
          monthly_goal: monthlyGoal,
          daily_goal: dailyGoal,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Erro ao salvar metas:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as metas.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Metas atualizadas!",
        description: "As metas da equipe foram salvas com sucesso.",
      });

      if (onGoalsUpdated) {
        onGoalsUpdated();
      }

    } catch (error) {
      console.error('Erro inesperado ao salvar metas:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao salvar as metas.",
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
          <p className="text-gray-500">Carregando metas...</p>
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
            <p className="text-xs text-gray-500">Número de contratos a serem fechados por mês</p>
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
            <p className="text-xs text-gray-500">Meta diária baseada nos dias úteis restantes</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveGoals}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
