
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
}

interface UsePurchaseFlowReturn {
  isLoading: boolean;
  handlePurchase: (customerData: CustomerData, planType: 'monthly' | 'annual') => Promise<void>;
}

// Função para detectar se estamos no ambiente Lovable (iframe)
const isLovableEnvironment = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Se não conseguir acessar window.top, provavelmente está em iframe
  }
};

// Função para redirecionar considerando o ambiente
const performRedirect = (url: string): void => {
  console.log('🔄 Iniciando redirecionamento para:', url);
  
  if (isLovableEnvironment()) {
    console.log('📱 Ambiente Lovable detectado - usando estratégias específicas para iframe');
    
    try {
      // Estratégia 1: Tentar abrir em nova aba usando window.parent
      if (window.parent && window.parent.open) {
        console.log('🎯 Tentando window.parent.open');
        const newWindow = window.parent.open(url, '_blank', 'noopener,noreferrer');
        if (newWindow) {
          console.log('✅ Redirecionamento via window.parent.open bem-sucedido');
          return;
        }
      }
      
      // Estratégia 2: Tentar redirecionar a janela pai
      if (window.top && window.top.location) {
        console.log('🎯 Tentando window.top.location');
        window.top.location.href = url;
        return;
      }
      
      // Estratégia 3: Fallback para window.open no contexto atual
      console.log('🎯 Tentando window.open como fallback');
      const fallbackWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (fallbackWindow) {
        console.log('✅ Redirecionamento via window.open fallback bem-sucedido');
        return;
      }
      
      throw new Error('Todas as estratégias de redirecionamento falharam');
      
    } catch (redirectError) {
      console.error('❌ Erro no redirecionamento em ambiente iframe:', redirectError);
      // Mostrar URL manualmente como último recurso
      alert(`Por favor, copie e acesse este link para finalizar o pagamento:\n\n${url}`);
    }
    
  } else {
    console.log('🖥️ Ambiente normal detectado - usando redirecionamento padrão');
    
    try {
      // Em ambiente normal, usar redirecionamento direto
      window.location.href = url;
    } catch (redirectError) {
      console.warn('⚠️ Falha na redirecionamento direto, tentando window.open:', redirectError);
      
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        throw new Error("Popup bloqueado. Por favor, permita popups e tente novamente.");
      }
    }
  }
};

export function usePurchaseFlow(): UsePurchaseFlowReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (customerData: CustomerData, planType: 'monthly' | 'annual') => {
    setIsLoading(true);

    try {
      console.log('🛒 Iniciando processo de compra:', { planType, email: customerData.email });
      console.log('🔍 Ambiente detectado:', isLovableEnvironment() ? 'Lovable (iframe)' : 'Normal');
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds
      });

      // Create the payment request promise
      const paymentPromise = supabase.functions.invoke('create-payment', {
        body: {
          customerData: {
            name: customerData.name.trim(),
            email: customerData.email.trim().toLowerCase(),
            phone: customerData.phone.trim(),
            cpf: customerData.cpf.trim(),
            password: customerData.password
          },
          planType
        }
      });

      // Race between timeout and actual request
      const { data, error } = await Promise.race([paymentPromise, timeoutPromise]) as any;

      console.log('📦 Resposta da função create-payment:', { data, error });

      if (error) {
        console.error('❌ Erro da Edge Function create-payment:', error);
        throw new Error(`Erro no pagamento: ${error.message}`);
      }

      // Verificar se houve erro na resposta da função
      if (data?.error) {
        console.error('❌ Erro retornado pela função create-payment:', data.error);
        let errorMessage = "Erro desconhecido no processamento do pagamento";
        
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.details) {
          errorMessage = data.details;
        }
        
        throw new Error(errorMessage);
      }

      // Verificar se a URL existe antes de redirecionar
      if (!data?.url) {
        console.error('❌ URL de pagamento não recebida:', data);
        throw new Error("Não foi possível obter o link de pagamento. Tente novamente.");
      }

      console.log('✅ URL de pagamento recebida, iniciando redirecionamento');
      
      // Usar a nova função de redirecionamento inteligente
      performRedirect(data.url);

    } catch (error) {
      console.error('❌ Erro no processo de compra:', error);
      
      let errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = "A requisição demorou muito para responder. Verifique sua conexão e tente novamente.";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handlePurchase
  };
}
