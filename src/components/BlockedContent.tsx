
import { Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";

interface BlockedContentProps {
  title?: string;
  description?: string;
  feature?: string;
}

export function BlockedContent({ 
  title = "Acesso Restrito",
  description = "Esta funcionalidade requer uma assinatura ativa.",
  feature
}: BlockedContentProps) {
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
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-600">{title}</CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Ative ou atualize sua assinatura para acessar todas as funcionalidades do sistema.
          </p>
          
          <Button 
            onClick={handleOpenPortal} 
            disabled={isOpeningPortal}
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isOpeningPortal ? "Abrindo Portal..." : "Gerenciar Assinatura"}
          </Button>
          
          {feature && (
            <p className="text-xs text-muted-foreground mt-2">
              Funcionalidade: {feature}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
