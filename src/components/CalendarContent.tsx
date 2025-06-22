
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { UserComparisonCard } from "@/components/UserComparisonCard";
import { DailyContractsPanel } from "@/components/DailyContractsPanel";
import { RecoverableLeadsTask } from "@/components/RecoverableLeadsTask";
import { useLeadsData } from "@/hooks/useLeadsData";
import { supabase } from "@/integrations/supabase/client";

export function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { leads, isLoading } = useLeadsData();

  // Definir automaticamente o dia atual quando a página carrega
  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
  }, []);

  // Buscar informações do usuário atual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscar o perfil do usuário para obter o nome
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: user.id,
          name: profile?.name || user.email || 'Usuário'
        });
      }
    };

    getCurrentUser();
  }, []);

  // Calcular estatísticas reais baseadas nos leads
  const getContractsStats = () => {
    if (!leads || leads.length === 0) {
      return {
        currentMonth: { completed: 0, points: 0 },
        previousMonth: { completed: 0, points: 0 },
        goal: 1000
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Contratos fechados no mês atual
    const currentMonthContracts = leads.filter(lead => {
      if (lead.status !== "Contrato Fechado") return false;
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    }).length;

    // Contratos fechados no mês anterior
    const previousMonthContracts = leads.filter(lead => {
      if (lead.status !== "Contrato Fechado") return false;
      const leadDate = new Date(lead.created_at);
      return leadDate.getMonth() === previousMonth && leadDate.getFullYear() === previousYear;
    }).length;

    // Calcular pontos (assumindo 75 pontos por contrato fechado)
    const pointsPerContract = 75;
    
    return {
      currentMonth: {
        completed: currentMonthContracts,
        points: currentMonthContracts * pointsPerContract
      },
      previousMonth: {
        completed: previousMonthContracts,
        points: previousMonthContracts * pointsPerContract
      },
      goal: 1000
    };
  };

  const contractsStats = getContractsStats();

  // Metas mensais baseadas nos dados reais
  const monthlyGoals = {
    totalGoal: 50,
    achieved: contractsStats.currentMonth.completed,
    percentage: Math.round((contractsStats.currentMonth.completed / 50) * 100),
    month: "Junho 2025",
    remaining: Math.max(0, 50 - contractsStats.currentMonth.completed)
  };

  const handleDateClick = (day: number) => {
    if (day > 0 && day <= 30) {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      setSelectedDate(newDate);
    }
  };

  const handleCloseDailyPanel = () => {
    setSelectedDate(null);
  };

  if (isLoading || !currentUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados das metas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Metas</h1>
          <p className="text-gray-600">Acompanhe as metas de contratos fechados da equipe</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Individual Comparison - Left Side */}
        <div className="lg:col-span-2">
          <UserComparisonCard
            userName={currentUser.name}
            currentMonth={contractsStats.currentMonth}
            previousMonth={contractsStats.previousMonth}
            goal={contractsStats.goal}
          />
        </div>

        {/* Calendar Widget - Right Side (Smaller) */}
        <Card className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900">Junho 2025</h3>
            <div className="flex gap-1">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
              <div key={day} className="p-1 font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 5 + 1;
              const isCurrentMonth = day > 0 && day <= 30;
              const today = new Date();
              const isToday = day === today.getDate();
              const isSelected = selectedDate && day === selectedDate.getDate();
              
              return (
                <div
                  key={i}
                  onClick={() => handleDateClick(day)}
                  className={`p-1 text-xs cursor-pointer hover:bg-gray-100 rounded transition-colors ${
                    !isCurrentMonth ? 'text-gray-300 cursor-default' :
                    isSelected ? 'bg-blue-600 text-white' :
                    isToday ? 'bg-gray-200 text-gray-900' :
                    'text-gray-700'
                  }`}
                >
                  {isCurrentMonth ? day : ''}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Daily Contracts Panel */}
      {selectedDate && (
        <DailyContractsPanel 
          selectedDate={selectedDate} 
          onClose={handleCloseDailyPanel}
        />
      )}

      {/* Recoverable Leads Task */}
      <RecoverableLeadsTask userName={currentUser.name} />

      {/* Monthly Goal Summary - Bottom */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Flag className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Meta Mensal - {monthlyGoals.month}</h3>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{monthlyGoals.achieved}</div>
              <div className="text-sm text-gray-600">Contratos Fechados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-700">{monthlyGoals.totalGoal}</div>
              <div className="text-sm text-gray-600">Meta Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{monthlyGoals.percentage}%</div>
              <div className="text-sm text-gray-600">Progresso</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{monthlyGoals.remaining}</div>
              <div className="text-sm text-gray-600">Restante</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progresso da Meta</span>
              <span>{monthlyGoals.achieved}/{monthlyGoals.totalGoal}</span>
            </div>
            <Progress value={monthlyGoals.percentage} className="h-3 [&>div]:bg-blue-500" />
          </div>
        </div>
      </Card>
    </div>
  );
}
