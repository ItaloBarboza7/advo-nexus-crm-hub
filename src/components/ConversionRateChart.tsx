
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Users, CheckCircle2 } from "lucide-react";

interface ConversionRateChartProps {
  totalLeads: number;
  opportunities: number;
  sales: number;
  conversionGoal?: number;
}

export function ConversionRateChart({ 
  totalLeads, 
  opportunities, 
  sales, 
  conversionGoal = 75 
}: ConversionRateChartProps) {
  const opportunityRate = totalLeads > 0 ? (opportunities / totalLeads) * 100 : 0;
  const salesRate = totalLeads > 0 ? (sales / totalLeads) * 100 : 0;
  const overallConversionRate = totalLeads > 0 ? (sales / totalLeads) * 100 : 0;

  const isOnTarget = overallConversionRate >= conversionGoal;

  return (
    <Card className="p-6 bg-card border-border shadow-sm">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Taxa de Conversão
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Taxa Geral de Conversão */}
        <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-6 mb-6 border border-primary/20 dark:border-primary/30">
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-primary mb-2">
              {overallConversionRate.toFixed(0)}%
            </div>
            <p className="text-card-foreground font-medium">Taxa Geral de Conversão</p>
          </div>
        </div>

        {/* Detalhamento */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-card-foreground font-medium">Total de Leads</span>
            </div>
            <Badge variant="outline" className="bg-card text-card-foreground border-border">
              {totalLeads}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-card-foreground font-medium">Oportunidades Geradas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                {opportunities}
              </Badge>
              <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                ({opportunityRate.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-card-foreground font-medium">Vendas Realizadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                {sales}
              </Badge>
              <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                ({salesRate.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className={`text-center p-3 rounded-lg border ${
          isOnTarget 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800'
        }`}>
          <p className="text-sm font-medium">
            Meta: {conversionGoal}% | Atual: {overallConversionRate.toFixed(0)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
