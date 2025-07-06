
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
          <Target className="h-5 w-5 text-slate-700" />
          Sua Meta Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-800 mb-1">
              {currentSales}
            </div>
            <p className="text-sm font-medium text-slate-600">Vendas Realizadas</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-800 mb-1">
              {monthlyGoal}
            </div>
            <p className="text-sm font-medium text-slate-600">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">Progresso</span>
            <span className="text-sm font-bold text-slate-800">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                isOnTrack ? 'bg-slate-700' : 'bg-slate-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-600" />
            <div>
              <div className="text-lg font-bold text-slate-800">{dailyTarget}</div>
              <p className="text-xs text-slate-600">Vendas/dia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-600" />
            <div>
              <div className="text-lg font-bold text-slate-800">{daysRemaining}</div>
              <p className="text-xs text-slate-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`text-center p-3 rounded-lg ${
          isOnTrack 
            ? 'bg-slate-100 text-slate-800' 
            : 'bg-slate-50 text-slate-700'
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
