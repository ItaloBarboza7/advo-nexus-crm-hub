
import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  async function handleChangeCard() {
    // Adicione logs para depuração
    console.log("🔄 handleChangeCard: Iniciando chamada à customer-portal Edge Function...");
    try {
      // O invoke precisa receber ao menos um objeto body vazio para não dar erro no Supabase.
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
      // Trata falhas inesperadas no invoke ou erro de rede
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
      {/* APENAS informações do plano - SEM título duplicado */}
      <div className="py-2 px-3 bg-muted rounded-md flex items-center gap-3">
        <div className="flex-1">
          <span className="block font-medium">{plan}</span>
          <span className="block text-sm text-muted-foreground">R$ {(amount/100).toFixed(2)} / mês</span>
          <span className={`inline-block text-xs rounded mt-1 px-2 py-0.5 ${status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
            {status === "active" ? "Ativo" : status}
          </span>
        </div>
      </div>

      {/* APENAS informações do cartão - SEPARADO para usar dentro do botão */}
      <div className="hidden">
        <h3 className="font-bold text-lg mb-2">Cartão cadastrado</h3>
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
    </div>
  );
}

// Exportar componente separado apenas para informações do cartão
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
