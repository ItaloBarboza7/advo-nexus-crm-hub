
import { useState } from "react";
import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp, RefreshCw, Bug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const { toast } = useToast();
  const subscriptionDetails = useSubscriptionDetails();

  const runDiagnostic = async () => {
    setIsDebugging(true);
    console.log("🔧 Running subscription diagnostic...");
    
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-details');
      console.log("🔧 Diagnostic response:", { data, error });
      
      setDebugInfo({ data, error, timestamp: new Date().toISOString() });
      
      toast({
        title: "Diagnóstico concluído",
        description: "Verifique o console e o painel de debug para detalhes.",
      });
    } catch (err) {
      console.error("🔧 Diagnostic error:", err);
      setDebugInfo({ error: err, timestamp: new Date().toISOString() });
      
      toast({
        title: "Erro no diagnóstico",
        description: "Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsDebugging(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-white shadow-lg border-blue-200"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Subscription
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-blue-600" />
          <h3 className="font-medium text-sm">Subscription Debug</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <strong>Current Status:</strong>
          <div className="bg-gray-50 p-2 rounded mt-1">
            <div>Plan: {subscriptionDetails.plan}</div>
            <div>Status: {subscriptionDetails.status}</div>
            <div>Amount: R$ {(subscriptionDetails.amount/100).toFixed(2)}</div>
            <div>Loading: {subscriptionDetails.isLoading ? "Yes" : "No"}</div>
            <div>Pending: {subscriptionDetails.isPending ? "Yes" : "No"}</div>
            <div>Error: {subscriptionDetails.error || "None"}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runDiagnostic}
            disabled={isDebugging}
            className="flex-1"
          >
            {isDebugging ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Bug className="h-3 w-3 mr-1" />
            )}
            {isDebugging ? "Running..." : "Run Diagnostic"}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={subscriptionDetails.refreshSubscription}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>

        {debugInfo && (
          <div>
            <strong>Last Diagnostic:</strong>
            <div className="bg-gray-50 p-2 rounded mt-1 max-h-40 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-1">
                {new Date(debugInfo.timestamp).toLocaleString()}
              </div>
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
          💡 Check browser console for detailed logs
        </div>
      </div>
    </div>
  );
}
