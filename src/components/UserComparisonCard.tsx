import { Card } from "@/components/ui/card";
import { ChevronDown, TrendingUp } from "lucide-react";

interface UserComparisonCardProps {
  userName: string;
  currentMonth: {
    completed: number;
    points: number;
  };
  previousMonth: {
    completed: number;
    points: number;
  };
  goal: number;
}

export function UserComparisonCard({ 
  userName, 
  currentMonth, 
  previousMonth, 
  goal 
}: UserComparisonCardProps) {
  const completedChange = currentMonth.completed - previousMonth.completed;
  const pointsChange = currentMonth.points - previousMonth.points;
  
  const completedPercentage = completedChange >= 0 ? 
    Math.round((Math.abs(completedChange) / previousMonth.completed) * 100) : 
    -Math.round((Math.abs(completedChange) / previousMonth.completed) * 100);
    
  const pointsPercentage = pointsChange >= 0 ? 
    Math.round((Math.abs(pointsChange) / previousMonth.points) * 100) : 
    -Math.round((Math.abs(pointsChange) / previousMonth.points) * 100);

  const generateChartData = () => {
    const data = [];
    for (let i = 0; i <= 24; i++) {
      // Simulated data showing growth from previous to current month
      const prevValue = previousMonth.points;
      const currValue = currentMonth.points;
      const progress = i / 24;
      
      let value;
      if (i <= 6) {
        value = prevValue + (prevValue * 0.1 * (i / 6));
      } else if (i <= 12) {
        value = prevValue * 1.1 + ((currValue - prevValue * 1.1) * 0.6 * ((i - 6) / 6));
      } else {
        value = prevValue * 1.1 + ((currValue - prevValue * 1.1) * 0.6) + 
                ((currValue - (prevValue * 1.1 + (currValue - prevValue * 1.1) * 0.6)) * ((i - 12) / 12));
      }
      
      data.push(value);
    }
    return data;
  };

  const chartData = generateChartData();
  const maxValue = Math.max(...chartData, goal);

  return (
    <Card className="p-6 bg-white border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Comparação Individual - {userName}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Tarefas concluídas */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm text-gray-600">Tarefas concluídas</h4>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold mb-1 text-gray-900">{currentMonth.completed}</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">vs mês anterior: {previousMonth.completed}</span>
            <span className={`${completedPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {completedPercentage >= 0 ? '+' : ''}{completedPercentage}%
            </span>
          </div>
        </div>

        {/* Pontos acumulados */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm text-gray-600">Pontos acumulados</h4>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold mb-1 text-gray-900">{currentMonth.points}</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">vs mês anterior: {previousMonth.points}</span>
            <span className={`${pointsPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {pointsPercentage >= 0 ? '+' : ''}{pointsPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Taskscore Chart */}
      <div className="mb-4">
        <h4 className="text-sm text-gray-600 mb-4">Taskscore</h4>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700">MÊS ATUAL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">MÊS PASSADO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-700">META</span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative h-32 bg-gray-50 rounded border border-gray-100">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>{Math.round(maxValue)}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart content */}
          <div className="ml-8 h-full relative">
            {/* Goal line */}
            <div 
              className="absolute w-full border-t-2 border-dashed border-purple-500"
              style={{ bottom: `${(goal / maxValue) * 100}%` }}
            ></div>

            {/* Previous month line (straight line) */}
            <div 
              className="absolute w-full border-t-2 border-blue-500"
              style={{ bottom: `${(previousMonth.points / maxValue) * 100}%` }}
            ></div>

            {/* Current month curve */}
            <svg className="absolute inset-0 w-full h-full">
              <path
                d={`M 0 ${128 - (previousMonth.points / maxValue) * 128} ${chartData.map((value, index) => 
                  `L ${(index / (chartData.length - 1)) * 100}% ${128 - (value / maxValue) * 128}`
                ).join(' ')}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
            </svg>

            {/* X-axis labels */}
            <div className="absolute bottom-0 w-full flex justify-between text-xs text-gray-500 pt-2">
              <span>6</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
