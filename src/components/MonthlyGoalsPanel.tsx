
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
    <Card className="h-fit border-2 border-blue-200 shadow-lg">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-blue-100">
        <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
          <Target className="h-5 w-5 text-blue-600" />
          Meta Mensal Atualizada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {currentSales}
            </div>
            <p className="text-sm font-medium text-blue-600">Contratos Fechados</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {monthlyGoal}
            </div>
            <p className="text-sm font-medium text-blue-600">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso Atual</span>
            <span className="text-sm font-bold text-blue-700">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                isOnTrack ? 'bg-gradient-to-r from-blue-500 to-blue-700' : 'bg-gradient-to-r from-blue-400 to-blue-600'
              } shadow-md`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-blue-200">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-xl font-bold text-blue-700">{dailyTarget}</div>
              <p className="text-xs text-blue-600">Vendas/dia</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-xl font-bold text-blue-700">{daysRemaining}</div>
              <p className="text-xs text-blue-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`text-center p-4 rounded-lg border-2 ${
          isOnTrack 
            ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-800' 
            : 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 text-orange-700'
        } shadow-sm`}>
          <p className="text-sm font-medium">
            {isOnTrack 
              ? '🎉 Parabéns! Você está superando sua meta!' 
              : `🚀 Acelere o ritmo! Faltam ${remainingSales} vendas para atingir a meta`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
