
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, ChevronLeft, ChevronRight, Target, TrendingUp, Users } from "lucide-react";

export function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthlyGoals = {
    totalGoal: 50,
    achieved: 32,
    percentage: 64,
    month: "Junho 2024"
  };

  const teamProgress = [
    {
      id: 1,
      name: "Maria Silva",
      goal: 15,
      achieved: 12,
      percentage: 80,
      value: "R$ 120.000",
    },
    {
      id: 2,
      name: "João Santos",
      goal: 12,
      achieved: 8,
      percentage: 67,
      value: "R$ 85.000",
    },
    {
      id: 3,
      name: "Ana Costa",
      goal: 18,
      achieved: 12,
      percentage: 67,
      value: "R$ 95.000",
    },
    {
      id: 4,
      name: "Pedro Lima",
      goal: 10,
      achieved: 6,
      percentage: 60,
      value: "R$ 68.000",
    },
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
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
        {/* Calendar Widget */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Junho 2024</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 5 + 1; // Adjusting for June 1st starting on Saturday
              const isCurrentMonth = day > 0 && day <= 30;
              const isToday = day === 1;
              
              return (
                <div
                  key={i}
                  className={`p-2 text-sm cursor-pointer hover:bg-gray-100 rounded ${
                    !isCurrentMonth ? 'text-gray-300' :
                    isToday ? 'bg-blue-600 text-white' :
                    'text-gray-700'
                  }`}
                >
                  {isCurrentMonth ? day : ''}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Monthly Goals and Team Progress */}
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-6">
            {/* Monthly Goal Summary */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Meta Mensal - {monthlyGoals.month}</h3>
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
            </div>

            {/* Team Progress */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Progresso da Equipe</h3>
              </div>
              
              <div className="space-y-4">
                {teamProgress.map((member) => (
                  <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <Badge variant="outline" className={`${getProgressColor(member.percentage)} text-white border-0`}>
                            {member.percentage}%
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium text-blue-600">{member.achieved}</span>
                            <p className="text-xs">Fechados</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">{member.goal}</span>
                            <p className="text-xs">Meta</p>
                          </div>
                          <div>
                            <span className="font-medium text-green-600">{member.value}</span>
                            <p className="text-xs">Valor Total</p>
                          </div>
                          <div>
                            <span className="font-medium text-purple-600">{member.goal - member.achieved}</span>
                            <p className="text-xs">Restante</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Progresso</span>
                            <span>{member.achieved}/{member.goal}</span>
                          </div>
                          <Progress value={member.percentage} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">32</div>
          <div className="text-sm text-gray-600">Contratos Este Mês</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">R$ 368k</div>
          <div className="text-sm text-gray-600">Valor Total</div>
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
