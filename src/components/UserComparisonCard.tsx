
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

  const generateCurrentMonthData = () => {
    // Dados do mês atual baseados nos 12 contratos fechados
    // Progressão mais realística ao longo de 25 dias
    const contractsPerDay = [
      0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 
      6, 6, 7, 8, 8, 9, 9, 10, 10, 11, 
      11, 12, 12, 12, 12
    ];
    
    // Converter contratos em pontos (assumindo ~77 pontos por contrato em média)
    return contractsPerDay.map(contracts => Math.round(contracts * 77));
  };

  const generatePreviousMonthData = () => {
    // Dados do mês passado baseados nos 8 contratos fechados
    // Progressão mais linear
    const contractsPerDay = [
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 
      5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 
      8, 8, 8, 8, 8
    ];
    
    // Converter contratos em pontos (assumindo ~97.5 pontos por contrato)
    return contractsPerDay.map(contracts => Math.round(contracts * 97.5));
  };

  const currentMonthData = generateCurrentMonthData();
  const previousMonthData = generatePreviousMonthData();
  const maxValue = Math.max(...currentMonthData, ...previousMonthData, goal);

  return (
    <Card className="p-6 bg-white border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Comparação Individual - {userName}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Contratos fechados */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm text-gray-600">Contratos fechados</h4>
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
            <span className="text-gray-700">MÊS ATUAL (12 contratos)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">MÊS PASSADO (8 contratos)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-700">META (1000 pts)</span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative h-40 bg-gray-50 rounded border border-gray-100">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2 py-2">
            <span>{Math.round(maxValue)}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart content */}
          <div className="ml-12 h-full relative p-2">
            {/* Goal line */}
            <div 
              className="absolute w-full border-t-2 border-dashed border-purple-500"
              style={{ bottom: `${((goal / maxValue) * 100)}%` }}
            ></div>

            {/* SVG for both lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Previous month line (blue) */}
              <polyline
                points={previousMonthData.map((value, index) => 
                  `${(index / (previousMonthData.length - 1)) * 100},${100 - (value / maxValue) * 100}`
                ).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
              
              {/* Current month line (green) */}
              <polyline
                points={currentMonthData.map((value, index) => 
                  `${(index / (currentMonthData.length - 1)) * 100},${100 - (value / maxValue) * 100}`
                ).join(' ')}
                fill="none"
                stroke="#22c55e"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* X-axis labels */}
            <div className="absolute bottom-0 w-full flex justify-between text-xs text-gray-500 pt-2">
              <span>1</span>
              <span>6</span>
              <span>12</span>
              <span>18</span>
              <span>25</span>
            </div>
          </div>
        </div>
        
        {/* Chart Values Summary */}
        <div className="mt-2 text-xs text-gray-600 flex justify-between">
          <span>Mês atual: {currentMonth.points} pts ({currentMonth.completed} contratos)</span>
          <span>Mês anterior: {previousMonth.points} pts ({previousMonth.completed} contratos)</span>
        </div>
      </div>
    </Card>
  );
}
