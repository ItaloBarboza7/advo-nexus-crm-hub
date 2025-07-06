
import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function SubscriptionAndPaymentPanel() {
  const {
    plan,
    amount,
    cardBrand,
    cardLast4,
    cardExp,
    status,
    isLoading,
    error,
    subscriptionId
  } = useSubscriptionDetails();
  const { toast } = useToast();
  const [showCardInfo, setShowCardInfo] = useState(false);

  async function handleChangeCard() {
    console.log("🔄 handleChangeCard: Iniciando chamada à customer-portal Edge Function...");
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { body: {} });
      console.log("🔄 handleChangeCard: Resposta da função", { data, error });
      if (error || !data?.url) {
        toast({
          title: "Erro ao acessar Stripe",
          description: error?.message || data?.error || "Não foi possível abrir o portal de pagamentos.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.url, "_blank");
    } catch (err: any) {
      console.error("❗ Erro inesperado no handleChangeCard", err);
      toast({
        title: "Erro de conexão",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  }

  if (isLoading) return <div className="text-muted-foreground py-4">Carregando assinatura...</div>;
  if (error) return <div className="text-red-500 py-4">Erro: {error}</div>;

  return (
    <div className="space-y-6">
      {!showCardInfo ? (
        // Card mostrando informações do plano
        <div className="py-4 px-4 bg-muted rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="block font-medium text-lg">{plan}</span>
              <span className="block text-sm text-muted-foreground">R$ {(amount/100).toFixed(2)} / mês</span>
              <span className={`inline-block text-xs rounded mt-2 px-2 py-0.5 ${status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                {status === "active" ? "Ativo" : status}
              </span>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCardInfo(true)}
              className="ml-4"
            >
              Configurar Pagamento
            </Button>
          </div>
        </div>
      ) : (
        // Card mostrando informações do cartão
        <div className="py-4 px-4 bg-muted rounded-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h6 className="font-medium">Cartão cadastrado</h6>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowCardInfo(false)}
              >
                Voltar
              </Button>
            </div>
            
            {cardBrand && cardLast4 ? (
              <div className="py-2 px-3 bg-background rounded-md flex items-center gap-5">
                <span className="mr-2 uppercase font-medium">{cardBrand}</span>
                <span>•••• {cardLast4}</span>
                <span className="text-xs text-muted-foreground ml-2">Venc: {cardExp}</span>
                <Button size="sm" className="ml-auto" onClick={handleChangeCard}>
                  Alterar forma de pagamento
                </Button>
              </div>
            ) : (
              <div className="py-3">
                <p className="text-sm text-muted-foreground mb-3">Não há cartão cadastrado.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Manter o componente CardInfoPanel separado caso seja usado em outro lugar
export function CardInfoPanel() {
  const {
    cardBrand,
    cardLast4,
    cardExp,
    isLoading,
    error
  } = useSubscriptionDetails();
  const { toast } = useToast();

  async function handleChangeCard() {
    console.log("🔄 handleChangeCard: Iniciando chamada à customer-portal Edge Function...");
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { body: {} });
      console.log("🔄 handleChangeCard: Resposta da função", { data, error });
      if (error || !data?.url) {
        toast({
          title: "Erro ao acessar Stripe",
          description: error?.message || data?.error || "Não foi possível abrir o portal de pagamentos.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.url, "_blank");
    } catch (err: any) {
      console.error("❗ Erro inesperado no handleChangeCard", err);
      toast({
        title: "Erro de conexão",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  }

  if (isLoading) return <div className="text-muted-foreground py-4">Carregando informações do cartão...</div>;
  if (error) return <div className="text-red-500 py-4">Erro: {error}</div>;

  return (
    <div>
      <h6 className="font-medium mb-2">Cartão cadastrado</h6>
      {cardBrand && cardLast4 ? (
        <div className="py-2 px-3 bg-muted rounded-md flex items-center gap-5">
          <span className="mr-2 uppercase">{cardBrand}</span>
          <span>•••• {cardLast4}</span>
          <span className="text-xs text-muted-foreground ml-2">Venc: {cardExp}</span>
          <Button size="sm" className="ml-auto" onClick={handleChangeCard}>
            Alterar forma de pagamento
          </Button>
        </div>
      ) : (
        <div>
          Não há cartão cadastrado.<br />
          <Button size="sm" className="mt-2" onClick={handleChangeCard}>Adicionar pagamento</Button>
        </div>
      )}
    </div>
  );
}
