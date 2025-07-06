
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar } from "lucide-react";

interface MonthlyGoalsPanelProps {
  currentSales: number;
  monthlyGoal: number;
  daysInMonth: number;
  currentDay: number;
}

export function MonthlyGoalsPanel({ 
  currentSales, 
  monthlyGoal, 
  daysInMonth, 
  currentDay 
}: MonthlyGoalsPanelProps) {
  const progressPercentage = (currentSales / monthlyGoal) * 100;
  const expectedProgress = (currentDay / daysInMonth) * 100;
  const isOnTrack = progressPercentage >= expectedProgress;
  const remainingSales = Math.max(0, monthlyGoal - currentSales);
  const daysRemaining = daysInMonth - currentDay;
  const dailyTarget = daysRemaining > 0 ? Math.ceil(remainingSales / daysRemaining) : 0;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-blue-600" />
          Meta Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {currentSales}
            </div>
            <p className="text-sm font-medium text-gray-600">Contratos Fechados</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {monthlyGoal}
            </div>
            <p className="text-sm font-medium text-gray-600">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso</span>
            <span className="text-sm font-bold text-blue-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                isOnTrack ? 'bg-blue-600' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-600">{dailyTarget}</div>
              <p className="text-xs text-gray-600">Vendas/dia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-600">{daysRemaining}</div>
              <p className="text-xs text-gray-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`text-center p-3 rounded-lg ${
          isOnTrack 
            ? 'bg-blue-50 text-blue-800' 
            : 'bg-gray-50 text-gray-700'
        }`}>
          <p className="text-sm font-medium">
            {isOnTrack 
              ? '✅ Você está no caminho certo!' 
              : `🎯 Faltam ${remainingSales} vendas para atingir a meta`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
