import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyGoalsPanelProps {
  currentSales: number;
  daysInMonth: number;
  currentDay: number;
}

export function MonthlyGoalsPanel({ 
  currentSales, 
  daysInMonth, 
  currentDay 
}: MonthlyGoalsPanelProps) {
  const [monthlyGoal, setMonthlyGoal] = useState(100);
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);

  console.log('MonthlyGoalsPanel props:', { currentSales, monthlyGoal, daysInMonth, currentDay });
  
  // Carregar meta configurada da equipe (tenant principal)
  useEffect(() => {
    const loadMonthlyGoal = async () => {
      try {
        setIsLoadingGoal(true);
        console.log("🎯 MonthlyGoalsPanel - Carregando meta mensal da equipe...");
        
        const { data: tenantId, error: tenantError } = await supabase.rpc('get_tenant_id');
        
        if (tenantError) {
          console.error("❌ Erro ao obter tenant ID:", tenantError);
          return;
        }

        const { data: goals, error } = await supabase
          .from('team_goals')
          .select('monthly_goal')
          .eq('user_id', tenantId)
          .maybeSingle();

        console.log("🎯 Meta mensal da equipe encontrada:", goals);

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Erro ao carregar meta mensal da equipe:', error);
          return;
        }

        if (goals) {
          console.log("✅ Aplicando meta mensal da equipe:", goals.monthly_goal);
          setMonthlyGoal(goals.monthly_goal || 100);
        } else {
          console.log("📝 Nenhuma meta mensal da equipe configurada, usando valor padrão");
        }
      } catch (error) {
        console.error('❌ Erro inesperado ao carregar meta mensal da equipe:', error);
      } finally {
        setIsLoadingGoal(false);
      }
    };

    loadMonthlyGoal();
  }, []);

  const progressPercentage = (currentSales / monthlyGoal) * 100;
  const expectedProgress = (currentDay / daysInMonth) * 100;
  const isOnTrack = progressPercentage >= expectedProgress;
  const remainingSales = Math.max(0, monthlyGoal - currentSales);
  const daysRemaining = daysInMonth - currentDay;
  const dailyTarget = daysRemaining > 0 ? Math.ceil(remainingSales / daysRemaining) : 0;

  if (isLoadingGoal) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Carregando meta da equipe...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Target className="h-5 w-5 text-muted-foreground" />
          Meta Mensal da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-muted/50 rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-card-foreground mb-1">
              {currentSales}
            </div>
            <p className="text-sm text-muted-foreground">Contratos Fechados</p>
          </div>
          <div className="text-center bg-muted/50 rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-card-foreground mb-1">
              {monthlyGoal}
            </div>
            <p className="text-sm text-muted-foreground">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-card-foreground">Progresso</span>
            <span className="text-sm font-bold text-card-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                isOnTrack 
                  ? 'bg-green-600 dark:bg-green-500' 
                  : 'bg-orange-500 dark:bg-orange-400'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border">
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="text-lg font-bold text-card-foreground">{dailyTarget}</div>
              <p className="text-xs text-muted-foreground">Por dia</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="text-lg font-bold text-card-foreground">{daysRemaining}</div>
              <p className="text-xs text-muted-foreground">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`text-center p-2 rounded-lg border ${
          isOnTrack 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
        }`}>
          <p className="text-sm font-medium">
            {isOnTrack 
              ? 'Equipe no caminho certo para atingir a meta!' 
              : `Faltam ${remainingSales} vendas para a meta da equipe`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
