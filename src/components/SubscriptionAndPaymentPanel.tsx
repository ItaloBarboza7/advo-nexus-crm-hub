import { useSubscriptionDetails } from "@/hooks/useSubscriptionDetails";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { SubscriptionDebugPanel } from "./SubscriptionDebugPanel";

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
    isPending,
    refreshSubscription
  } = useSubscriptionDetails();
  const { toast } = useToast();
  const [showCardInfo, setShowCardInfo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleChangeCard() {
    console.log("🔄 handleChangeCard: Iniciando chamada à customer-portal Edge Function...");
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { 
        body: {},
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("🔄 handleChangeCard: Resposta da função", { data, error });
      
      if (error) {
        console.error("❌ Erro da função customer-portal:", error);
        toast({
          title: "Erro ao acessar Stripe",
          description: `Erro na função: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data?.url) {
        console.error("❌ URL não retornada:", data);
        toast({
          title: "Erro ao acessar Stripe",
          description: data?.error || "Não foi possível obter a URL do portal de pagamentos.",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Abrindo portal do Stripe:", data.url);
      window.open(data.url, "_blank");
      
    } catch (err: any) {
      console.error("❗ Erro inesperado no handleChangeCard", err);
      toast({
        title: "Erro de conexão",
        description: `Erro: ${err?.message || String(err)}`,
        variant: "destructive",
      });
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshSubscription();
      toast({
        title: "Atualizado",
        description: "Status da assinatura atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status da assinatura.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <div className="text-muted-foreground py-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Carregando assinatura...
        </div>
        <SubscriptionDebugPanel />
      </>
    );
  }

  // Status icons and colors
  const getStatusDisplay = () => {
    switch (status) {
      case "active":
        return { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50", text: "Ativo" };
      case "processing":
        return { icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50", text: "Processando" };
      case "inactive":
        return { icon: AlertCircle, color: "text-yellow-600", bgColor: "bg-yellow-50", text: "Inativo" };
      case "error":
        return { icon: XCircle, color: "text-red-600", bgColor: "bg-red-50", text: "Erro" };
      default:
        return { icon: AlertCircle, color: "text-gray-600", bgColor: "bg-gray-50", text: status || "Desconhecido" };
    }
  };

  // Se há erro crítico, mostrar mensagem de erro
  if (error && status === "error") {
    return (
      <>
        <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-center">
            <XCircle className="h-4 w-4 text-red-600" />
            <div className="flex-1">
              <p className="text-sm text-red-800 mb-1">Erro ao carregar dados da assinatura</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        </div>
        <SubscriptionDebugPanel />
      </>
    );
  }

  // Para assinatura sendo processada - IMPROVED MESSAGING
  if (isPending || status === "processing") {
    return (
      <>
        <div className="py-4 px-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 mb-1">Processando sua assinatura</p>
              <p className="text-xs text-blue-600">
                Seu pagamento foi confirmado e estamos ativando sua conta. Isso pode levar alguns minutos.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <strong>{plan}</strong> - R$ {(amount/100).toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-blue-500">
                ⏱️ Aguarde alguns instantes
              </div>
            </div>
          </div>
        </div>
        <SubscriptionDebugPanel />
      </>
    );
  }

  // Para usuários sem plano ativo
  if (status === "inactive" || !plan || plan === "Nenhum plano ativo") {
    return (
      <>
        <div className="py-4 px-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 mb-1">Nenhum plano ativo encontrado</p>
              <p className="text-xs text-yellow-600">Entre em contato para ativar sua assinatura</p>
            </div>
          </div>
        </div>
        <SubscriptionDebugPanel />
      </>
    );
  }

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <>
      <div className="space-y-6">
        {!showCardInfo ? (
          // Card mostrando informações do plano
          <div className="py-4 px-4 bg-muted rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="block font-medium text-lg">{plan}</span>
                  <div className={`inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusDisplay.text}
                  </div>
                </div>
                <span className="block text-sm text-muted-foreground">
                  R$ {(amount/100).toFixed(2)} / mês
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setShowCardInfo(true)}
                >
                  Configurar Pagamento
                </Button>
              </div>
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
                  <p className="text-sm text-muted-foreground mb-2">Não há cartão cadastrado.</p>
                  <Button size="sm" onClick={handleChangeCard}>
                    Adicionar pagamento
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <SubscriptionDebugPanel />
    </>
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

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        Carregando informações do cartão...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-yellow-600 py-4 text-center">
        <p className="text-sm">Não foi possível carregar informações do cartão</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

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
