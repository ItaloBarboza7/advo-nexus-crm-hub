
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { UserComparisonCard } from "@/components/UserComparisonCard";
import { DailyContractsPanel } from "@/components/DailyContractsPanel";

export function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Definir automaticamente o dia atual quando a página carrega
  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
  }, []);

  const monthlyGoals = {
    totalGoal: 50,
    achieved: 32,
    percentage: 64,
    month: "Junho 2024"
  };

  // Dados do usuário logado (simulado) - atualizados para contratos
  const currentUser = {
    name: "Maria Silva",
    currentMonth: {
      completed: 12, // contratos fechados este mês
      points: 925   // pontos atualizados para corresponder ao gráfico
    },
    previousMonth: {
      completed: 8,  // contratos fechados mês anterior
      points: 780
    },
    goal: 1000
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Metas</h1>
          <p className="text-gray-600">Acompanhe as metas de contratos fechados da equipe</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Individual Comparison - Left Side */}
        <div className="lg:col-span-2">
          <UserComparisonCard
            userName={currentUser.name}
            currentMonth={currentUser.currentMonth}
            previousMonth={currentUser.previousMonth}
            goal={currentUser.goal}
          />
        </div>

        {/* Calendar Widget - Right Side (Smaller) */}
        <Card className="p-4 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900">Junho 2024</h3>
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

      {/* Monthly Goal Summary - Bottom */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Meta Mensal da Equipe - {monthlyGoals.month}</h3>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progresso da Meta</span>
              <span>{monthlyGoals.achieved}/{monthlyGoals.totalGoal}</span>
            </div>
            <Progress value={monthlyGoals.percentage} className="h-3" />
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">12</div>
          <div className="text-sm text-gray-600">Contratos Este Mês</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">64%</div>
          <div className="text-sm text-gray-600">Meta Atingida</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">18</div>
          <div className="text-sm text-gray-600">Restante</div>
        </Card>
      </div>
    </div>
  );
}
