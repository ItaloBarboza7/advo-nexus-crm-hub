
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

export function usePurchaseFlow(): UsePurchaseFlowReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async (customerData: CustomerData, planType: 'monthly' | 'annual') => {
    setIsLoading(true);

    try {
      console.log('🛒 Iniciando processo de compra com timeout:', { planType, email: customerData.email });
      
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

      console.log('✅ Redirecionando para:', data.url);
      
      // Try multiple redirection methods as fallback
      try {
        // Primary method: direct assignment
        window.location.href = data.url;
      } catch (redirectError) {
        console.warn('⚠️ Falha na redireção primária, tentando fallback:', redirectError);
        
        // Fallback method: window.open
        const newWindow = window.open(data.url, '_blank');
        if (!newWindow) {
          throw new Error("Popup bloqueado. Por favor, permita popups e tente novamente.");
        }
      }

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
