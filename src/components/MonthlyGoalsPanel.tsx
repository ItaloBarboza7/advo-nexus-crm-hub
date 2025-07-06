
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
  console.log('MonthlyGoalsPanel props:', { currentSales, monthlyGoal, daysInMonth, currentDay });
  
  const progressPercentage = (currentSales / monthlyGoal) * 100;
  const expectedProgress = (currentDay / daysInMonth) * 100;
  const isOnTrack = progressPercentage >= expectedProgress;
  const remainingSales = Math.max(0, monthlyGoal - currentSales);
  const daysRemaining = daysInMonth - currentDay;
  const dailyTarget = daysRemaining > 0 ? Math.ceil(remainingSales / daysRemaining) : 0;

  return (
    <Card className="h-fit shadow-xl border-2 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <CardHeader className="pb-4 border-b-2 border-indigo-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <Target className="h-7 w-7 text-white" />
          <span>🎯 Sua Meta Mensal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 px-6">
        {/* Números principais com design atualizado */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center bg-gradient-to-br from-white to-blue-50 rounded-2xl p-5 shadow-lg border-2 border-blue-200">
            <div className="text-4xl font-bold text-blue-700 mb-2">
              {currentSales}
            </div>
            <p className="text-sm font-bold text-gray-700">Contratos Fechados</p>
          </div>
          <div className="text-center bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-5 shadow-lg border-2 border-indigo-200">
            <div className="text-4xl font-bold text-indigo-700 mb-2">
              {monthlyGoal}
            </div>
            <p className="text-sm font-bold text-gray-700">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso melhorada */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-800">🚀 Progresso da Meta</span>
            <span className="text-xl font-bold text-indigo-700 bg-white px-4 py-2 rounded-full shadow-md border-2 border-indigo-200">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-6 shadow-inner border-2 border-gray-400">
            <div 
              className={`h-6 rounded-full transition-all duration-700 ease-out shadow-lg border-2 ${
                isOnTrack 
                  ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 border-green-400' 
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 border-orange-400'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas adicionais com design melhorado */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-indigo-200">
          <div className="flex items-center gap-3 bg-gradient-to-br from-white to-green-50 rounded-xl p-4 shadow-lg border-2 border-green-200">
            <TrendingUp className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <div className="text-3xl font-bold text-green-700">{dailyTarget}</div>
              <p className="text-xs font-bold text-gray-600">Vendas/dia necessárias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-br from-white to-purple-50 rounded-xl p-4 shadow-lg border-2 border-purple-200">
            <Calendar className="h-6 w-6 text-purple-600 flex-shrink-0" />
            <div>
              <div className="text-3xl font-bold text-purple-700">{daysRemaining}</div>
              <p className="text-xs font-bold text-gray-600">Dias restantes</p>
            </div>
          </div>
        </div>

        {/* Status com design aprimorado */}
        <div className={`text-center p-5 rounded-2xl shadow-lg border-3 ${
          isOnTrack 
            ? 'bg-gradient-to-r from-emerald-100 via-green-100 to-emerald-100 text-green-800 border-green-300' 
            : 'bg-gradient-to-r from-orange-100 via-amber-100 to-orange-100 text-orange-800 border-orange-300'
        }`}>
          <p className="text-sm font-bold">
            {isOnTrack 
              ? '🎉 PARABÉNS! Você está no caminho certo para atingir sua meta!' 
              : `🎯 FOQUE NO OBJETIVO: Faltam ${remainingSales} vendas para atingir a meta!`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
