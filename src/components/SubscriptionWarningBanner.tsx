
import { AlertTriangle, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionWarningBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function SubscriptionWarningBanner({ message, onDismiss }: SubscriptionWarningBannerProps) {
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const { toast } = useToast();
  const { refreshSubscription } = useSubscriptionDetails();

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {},
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (error || !data?.url) {
        throw new Error(error?.message || "Erro ao acessar portal de pagamentos");
      }

      window.open(data.url, "_blank");
      
      // Refresh subscription after opening portal
      setTimeout(() => {
        refreshSubscription();
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao abrir portal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal de pagamentos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg border-t border-red-700">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleOpenPortal}
              disabled={isOpeningPortal}
              className="bg-white text-red-600 hover:bg-red-50"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              {isOpeningPortal ? "Abrindo..." : "Regularizar"}
            </Button>
            
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-white hover:bg-red-700 p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
