
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
  const [monthlyGoal, setMonthlyGoal] = useState(100); // Valor padrão
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);

  console.log('MonthlyGoalsPanel props:', { currentSales, monthlyGoal, daysInMonth, currentDay });
  
  // Carregar meta configurada
  useEffect(() => {
    const loadMonthlyGoal = async () => {
      try {
        setIsLoadingGoal(true);
        console.log("🎯 MonthlyGoalsPanel - Carregando meta mensal configurada...");
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("❌ Usuário não autenticado para carregar meta");
          return;
        }

        const { data: goals, error } = await supabase
          .from('team_goals')
          .select('monthly_goal')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log("🎯 Meta mensal configurada encontrada:", goals);

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Erro ao carregar meta mensal:', error);
          return;
        }

        if (goals) {
          console.log("✅ Aplicando meta mensal configurada:", goals.monthly_goal);
          setMonthlyGoal(goals.monthly_goal || 100);
        } else {
          console.log("📝 Nenhuma meta mensal configurada, usando valor padrão");
        }
      } catch (error) {
        console.error('❌ Erro inesperado ao carregar meta mensal:', error);
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
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando meta...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Target className="h-5 w-5 text-gray-600" />
          Meta Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {currentSales}
            </div>
            <p className="text-sm text-gray-600">Contratos Fechados</p>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {monthlyGoal}
            </div>
            <p className="text-sm text-gray-600">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso</span>
            <span className="text-sm font-bold text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                isOnTrack 
                  ? 'bg-green-600' 
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <TrendingUp className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <div>
              <div className="text-lg font-bold text-gray-900">{dailyTarget}</div>
              <p className="text-xs text-gray-600">Por dia</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
            <Calendar className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <div>
              <div className="text-lg font-bold text-gray-900">{daysRemaining}</div>
              <p className="text-xs text-gray-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`text-center p-2 rounded-lg border ${
          isOnTrack 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-orange-50 text-orange-800 border-orange-200'
        }`}>
          <p className="text-sm font-medium">
            {isOnTrack 
              ? 'No caminho certo para atingir a meta!' 
              : `Faltam ${remainingSales} vendas para a meta`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
