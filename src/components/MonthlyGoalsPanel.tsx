
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
    <Card className="h-fit shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-4 border-b border-blue-100">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Target className="h-6 w-6 text-blue-600" />
          <span className="text-blue-900">Sua Meta Mensal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Números principais com design atualizado */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center bg-white rounded-xl p-4 shadow-md border border-blue-100">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {currentSales}
            </div>
            <p className="text-sm font-semibold text-gray-700">Contratos Fechados</p>
          </div>
          <div className="text-center bg-white rounded-xl p-4 shadow-md border border-blue-100">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {monthlyGoal}
            </div>
            <p className="text-sm font-semibold text-gray-700">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso melhorada */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-800">Progresso da Meta</span>
            <span className="text-lg font-bold text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ease-out shadow-sm ${
                isOnTrack 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-r from-blue-400 to-blue-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais com design melhorado */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-100">
          <div className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-md border border-blue-100">
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{dailyTarget}</div>
              <p className="text-xs font-medium text-gray-600">Vendas/dia necessárias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-md border border-blue-100">
            <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{daysRemaining}</div>
              <p className="text-xs font-medium text-gray-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status com design aprimorado */}
        <div className={`text-center p-4 rounded-xl shadow-sm border-2 ${
          isOnTrack 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200' 
            : 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 border-orange-200'
        }`}>
          <p className="text-sm font-semibold">
            {isOnTrack 
              ? '🎉 Parabéns! Você está no caminho certo!' 
              : `🎯 Foque no objetivo: faltam ${remainingSales} vendas para atingir a meta`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
