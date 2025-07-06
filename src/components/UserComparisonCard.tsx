
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

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
  
  const completedPercentage = previousMonth.completed > 0 ? 
    Math.round((completedChange / previousMonth.completed) * 100) : 
    (currentMonth.completed > 0 ? 100 : 0);
    
  const pointsPercentage = previousMonth.points > 0 ? 
    Math.round((pointsChange / previousMonth.points) * 100) : 
    (currentMonth.points > 0 ? 100 : 0);

  // Obter o dia atual do mês para determinar até onde a linha verde deve ir
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Gerar dados do gráfico baseados nos pontos REAIS - MÊS ANTERIOR (linha azul completa)
  const generatePreviousMonthData = () => {
    const totalPoints = previousMonth.points;
    const data = [];
    
    for (let day = 1; day <= 25; day++) {
      // Progressão mais linear para o mês anterior
      const progress = Math.min(day / 25, 1);
      const basePoints = Math.round(totalPoints * progress);
      
      // Menos variação que o mês atual
      const variation = Math.sin(day * 0.3) * (totalPoints * 0.05);
      const dayPoints = Math.max(0, Math.round(basePoints + variation));
      
      data.push(Math.min(dayPoints, totalPoints));
    }
    
    return data;
  };

  // Gerar dados do gráfico baseados nos pontos REAIS - MÊS ATUAL (linha verde até o dia atual)
  const generateCurrentMonthData = () => {
    const totalPoints = currentMonth.points;
    const data = [];
    
    // Calcular quantos pontos de dados devemos ter baseado no dia atual
    const maxDaysToShow = Math.min(currentDay, 25);
    
    for (let day = 1; day <= maxDaysToShow; day++) {
      // Progressão mais realística baseada no progresso atual do mês
      const progress = Math.min(day / currentDay, 1);
      const basePoints = Math.round(totalPoints * progress);
      
      // Adicionar variação para tornar mais realístico
      const variation = Math.sin(day * 0.5) * (totalPoints * 0.1);
      const dayPoints = Math.max(0, Math.round(basePoints + variation));
      
      data.push(Math.min(dayPoints, totalPoints));
    }
    
    return data;
  };

  const currentMonthData = generateCurrentMonthData();
  const previousMonthData = generatePreviousMonthData();
  
  // Calcular valores do eixo Y com escala que inclui 0 e vai até um valor acima dos dados
  const maxDataValue = Math.max(...currentMonthData, ...previousMonthData);
  
  // Criar escala que sempre mostra pelo menos 0, 180, 360 e 540
  const calculateYAxisValues = (maxValue: number) => {
    // Sempre incluir pelo menos os 4 níveis básicos: 0, 180, 360, 540
    const minimumValues = [0, 180, 360, 540];
    const values = [...minimumValues];
    
    // Se o valor máximo for maior que 540, adicionar mais valores de 180 em 180
    if (maxValue > 540) {
      let currentValue = 720; // Próximo valor após 540
      while (currentValue <= maxValue + 180) { // +180 para garantir que o gráfico tenha espaço
        values.push(currentValue);
        currentValue += 180;
      }
    }
    
    // Retornar em ordem decrescente para o eixo Y
    return values.reverse();
  };

  const yAxisValues = calculateYAxisValues(maxDataValue);
  const maxValue = yAxisValues[0];
  const minValue = 0; // Sempre começar do zero

  return (
    <Card className="p-6 bg-white border border-gray-200">
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
            <span className="text-gray-700">MÊS ATUAL ({currentMonth.completed} contratos, {currentMonth.points} pts)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">MÊS PASSADO ({previousMonth.completed} contratos, {previousMonth.points} pts)</span>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative h-40 bg-gray-50 rounded border border-gray-100">
          {/* Y-axis labels com escala corrigida que vai de 0 até o valor máximo */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2 py-2">
            {yAxisValues.map((value, index) => (
              <span key={index}>{value}</span>
            ))}
          </div>

          {/* Chart content */}
          <div className="ml-12 h-full relative p-2">
            {/* SVG for both lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Previous month line (blue) - linha completa */}
              <polyline
                points={previousMonthData.map((value, index) => 
                  `${(index / (previousMonthData.length - 1)) * 100},${100 - ((value - minValue) / (maxValue - minValue)) * 100}`
                ).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
              
              {/* Current month line (green) - apenas até o dia atual */}
              {currentMonthData.length > 1 && (
                <polyline
                  points={currentMonthData.map((value, index) => 
                    `${(index / 24) * 100},${100 - ((value - minValue) / (maxValue - minValue)) * 100}`
                  ).join(' ')}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              )}
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
          <span>Mês atual: {currentMonth.points} pts ({currentMonth.completed} contratos) - Dia {today.getDate()}</span>
          <span>Mês anterior: {previousMonth.points} pts ({previousMonth.completed} contratos)</span>
        </div>
      </div>
    </Card>
  );
}
