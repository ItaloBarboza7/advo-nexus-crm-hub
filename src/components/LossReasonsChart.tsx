
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { useChartPreferences } from "@/hooks/useChartPreferences";

interface Lead {
  id: string;
  loss_reason?: string;
}

interface LossReasonsChartProps {
  leads: Lead[];
}

const chartConfig = {
  count: {
    label: "Quantidade",
    color: "hsl(var(--chart-1))",
  },
};

const COLORS = [
  "hsl(220, 76%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(40, 84%, 55%)",
  "hsl(120, 60%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(200, 80%, 50%)",
  "hsl(15, 85%, 55%)",
  "hsl(300, 70%, 55%)"
];

export function LossReasonsChart({ leads }: LossReasonsChartProps) {
  const { chartType, updateChartType } = useChartPreferences('loss-reasons');

  const chartData = useMemo(() => {
    const lossReasons = leads.reduce((acc, lead) => {
      const reason = lead.loss_reason || "Sem motivo especificado";
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(lossReasons)
      .map(([reason, count]) => ({
        reason,
        count,
        fill: COLORS[Math.abs(reason.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads.length;

  if (totalLeads === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Motivos de Perda</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum lead perdido encontrado.</p>
        </div>
      </Card>
    );
  }

  const renderBarChart = () => (
    <ChartContainer config={chartConfig} className="h-80 w-full">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="reason" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );

  const renderPieChart = () => (
    <ChartContainer config={chartConfig} className="h-80 w-full">
      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ reason, percent }) => `${reason}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="count"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Motivos de Perda</h3>
        <div className="flex gap-2">
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateChartType('bar')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Barras
          </Button>
          <Button
            variant={chartType === 'pie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateChartType('pie')}
            className="flex items-center gap-2"
          >
            <PieChartIcon className="h-4 w-4" />
            Pizza
          </Button>
        </div>
      </div>

      {chartType === 'bar' ? renderBarChart() : renderPieChart()}

      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>Total de leads perdidos: {totalLeads}</span>
        <span>Principais motivos: {chartData.slice(0, 3).map(d => d.reason).join(', ')}</span>
      </div>
    </Card>
  );
}
