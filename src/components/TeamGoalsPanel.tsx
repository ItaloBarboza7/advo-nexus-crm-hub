
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSchema } from "@/hooks/useTenantSchema";
import { BrazilTimezone } from "@/lib/timezone";

interface TeamGoalsPanelProps {
  teamSales: number;
  teamGoal: number;
  daysInMonth: number;
  currentDay: number;
  teamSize: number;
}

export function TeamGoalsPanel({ 
  teamSales, 
  teamGoal, 
  daysInMonth, 
  currentDay,
  teamSize
}: TeamGoalsPanelProps) {
  const [todayContracts, setTodayContracts] = useState(0);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const { tenantSchema } = useTenantSchema();

  console.log('TeamGoalsPanel props:', { teamSales, teamGoal, daysInMonth, currentDay, teamSize });
  
  const progressPercentage = (teamSales / teamGoal) * 100;
  const expectedProgress = (currentDay / daysInMonth) * 100;
  const isOnTrack = progressPercentage >= expectedProgress;
  const remainingSales = Math.max(0, teamGoal - teamSales);
  const daysRemaining = daysInMonth - currentDay;
  const dailyTarget = daysRemaining > 0 ? Math.ceil(remainingSales / daysRemaining) : 0;

  // Buscar contratos fechados hoje
  useEffect(() => {
    const fetchTodayContracts = async () => {
      if (!tenantSchema) return;
      
      try {
        setIsLoadingToday(true);
        console.log("📊 TeamGoalsPanel - Buscando contratos fechados hoje...");

        const today = BrazilTimezone.now();
        const todayStr = BrazilTimezone.formatDateForQuery(today);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT COUNT(*) as contracts_today
            FROM ${tenantSchema}.leads
            WHERE status = 'Contrato Fechado'
              AND DATE(updated_at AT TIME ZONE 'America/Sao_Paulo') = '${todayStr}'
          `
        });

        if (error) {
          console.error("❌ Erro ao buscar contratos de hoje:", error);
          return;
        }

        // Safe type handling for the RPC response
        let contractsCount = 0;
        if (Array.isArray(data) && data.length > 0) {
          const firstRow = data[0] as unknown;
          if (firstRow && typeof firstRow === 'object' && 'contracts_today' in firstRow) {
            contractsCount = parseInt(String((firstRow as any).contracts_today)) || 0;
          }
        }
        
        console.log(`📈 TeamGoalsPanel - ${contractsCount} contratos fechados hoje`);
        setTodayContracts(contractsCount);
      } catch (error) {
        console.error("❌ Erro inesperado ao buscar contratos de hoje:", error);
      } finally {
        setIsLoadingToday(false);
      }
    };

    fetchTodayContracts();
  }, [tenantSchema]);

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Target className="h-5 w-5 text-gray-600" />
          Meta da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Números principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {teamSales}
            </div>
            <p className="text-sm text-gray-600">Contratos Fechados</p>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {teamGoal}
            </div>
            <p className="text-sm text-gray-600">Meta do Mês</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progresso da Equipe</span>
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
              <div className="text-lg font-bold text-gray-900">
                {isLoadingToday ? '...' : todayContracts}
              </div>
              <p className="text-xs text-gray-600">Hoje</p>
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

        {/* Meta diária - mais sério e sóbrio */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3 border border-gray-300">
          <Trophy className="h-5 w-5 text-gray-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900">{dailyTarget}</div>
            <p className="text-sm text-gray-700 font-medium">Meta diária necessária</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
