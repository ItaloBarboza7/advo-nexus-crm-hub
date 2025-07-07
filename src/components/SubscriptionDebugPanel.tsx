
import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function SubscriptionDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const subscriptionDetails = useSubscriptionDetails();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="mt-4 p-4 bg-gray-50 border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h6 className="text-sm font-medium text-gray-700">Debug: Detalhes da Assinatura</h6>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Plano:</span> {subscriptionDetails.plan || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Status:</span> {subscriptionDetails.status || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Valor:</span> R$ {subscriptionDetails.amount ? (subscriptionDetails.amount/100).toFixed(2) : '0.00'}
            </div>
            <div>
              <span className="font-medium">Pendente:</span> {subscriptionDetails.isPending ? 'Sim' : 'Não'}
            </div>
            <div>
              <span className="font-medium">Cartão:</span> {subscriptionDetails.cardBrand || 'N/A'} •••• {subscriptionDetails.cardLast4 || 'XXXX'}
            </div>
            <div>
              <span className="font-medium">Validade:</span> {subscriptionDetails.cardExp || 'N/A'}
            </div>
          </div>
          
          {subscriptionDetails.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <span className="font-medium text-red-700">Erro:</span>
              <div className="text-red-600 text-xs mt-1">{subscriptionDetails.error}</div>
            </div>
          )}
          
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <span className="font-medium text-blue-700">Carregando:</span>
            <span className="text-blue-600 ml-1">{subscriptionDetails.isLoading ? 'Sim' : 'Não'}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
