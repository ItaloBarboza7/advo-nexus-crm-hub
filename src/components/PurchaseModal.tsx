
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEmailAvailability } from "@/hooks/useEmailAvailability";
import { supabase } from "@/integrations/supabase/client";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'monthly' | 'annual';
  planPrice: string;
}

export function PurchaseModal({ isOpen, onClose, planType, planPrice }: PurchaseModalProps) {
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string>('');
  const [previousEmail, setPreviousEmail] = useState<string>('');
  const { toast } = useToast();
  const { checkEmailAvailability, isChecking } = useEmailAvailability();

  // Verificar disponibilidade do email quando o usuário para de digitar
  useEffect(() => {
    const checkEmail = async () => {
      if (customerData.email && customerData.email.includes('@') && customerData.email !== previousEmail) {
        const result = await checkEmailAvailability(customerData.email);
        
        if (!result.available) {
          setEmailError('Email indisponível');
        } else {
          setEmailError('');
        }
        setPreviousEmail(customerData.email);
      } else if (!customerData.email || !customerData.email.includes('@')) {
        setEmailError('');
        setPreviousEmail('');
      }
    };

    // Debounce para evitar muitas chamadas
    const timeoutId = setTimeout(checkEmail, 1000);
    return () => clearTimeout(timeoutId);
  }, [customerData.email, checkEmailAvailability, previousEmail]);

  const handleInputChange = (field: string, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));

    // Apenas limpar erro de email se o campo email mudou e não está vazio
    if (field === 'email' && value !== customerData.email) {
      // Só limpar o erro se o novo valor for diferente do anterior
      if (value !== previousEmail) {
        setEmailError('');
      }
    }
  };

  const validateForm = () => {
    if (!customerData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha seu nome",
        variant: "destructive"
      });
      return false;
    }

    if (!customerData.email.trim() || !customerData.email.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor, preencha um email válido",
        variant: "destructive"
      });
      return false;
    }

    if (emailError) {
      toast({
        title: "Email indisponível",
        description: "Este email já está sendo usado. Escolha outro email.",
        variant: "destructive"
      });
      return false;
    }

    if (!customerData.phone.trim()) {
      toast({
        title: "Telefone obrigatório",
        description: "Por favor, preencha seu telefone",
        variant: "destructive"
      });
      return false;
    }

    if (!customerData.cpf.trim()) {
      toast({
        title: "CPF obrigatório",
        description: "Por favor, preencha seu CPF",
        variant: "destructive"
      });
      return false;
    }

    if (!customerData.password || customerData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return false;
    }

    if (customerData.password !== customerData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A confirmação de senha deve ser igual à senha",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handlePurchase = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      console.log('🛒 Iniciando processo de compra:', { planType, email: customerData.email });
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
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

      console.log('📦 Resposta da função create-payment:', { data, error });

      if (error) {
        console.error('❌ Erro da Edge Function create-payment:', error);
        toast({
          title: "Erro no pagamento",
          description: `Não foi possível processar o pagamento: ${error.message}`,
          variant: "destructive"
        });
        return;
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
        
        toast({
          title: "Erro no pagamento",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      // Verificar se a URL existe antes de redirecionar
      if (!data?.url) {
        console.error('❌ URL de pagamento não recebida:', data);
        toast({
          title: "Erro no redirecionamento",
          description: "Não foi possível obter o link de pagamento. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Redirecionar para o Stripe Checkout
      console.log('✅ Redirecionando para:', data.url);
      window.location.href = data.url;

    } catch (error) {
      console.error('❌ Erro inesperado no processo de compra:', error);
      
      let errorMessage = "Ocorreu um erro inesperado. Tente novamente.";
      if (error instanceof Error) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast({
        title: "Erro inesperado",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      password: '',
      confirmPassword: ''
    });
    setEmailError('');
    setPreviousEmail('');
  };

  // Reset form quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Finalizar Compra - Plano {planType === 'monthly' ? 'Mensal' : 'Anual'}
          </DialogTitle>
          <p className="text-center text-lg font-medium text-primary">
            {planPrice}
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={customerData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Seu nome completo"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={customerData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="seu@email.com"
              disabled={isLoading}
              className={emailError ? "border-red-500" : ""}
            />
            {isChecking && customerData.email && (
              <p className="text-sm text-gray-500">Verificando disponibilidade...</p>
            )}
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={customerData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={customerData.cpf}
              onChange={(e) => handleInputChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={customerData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={customerData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirme sua senha"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePurchase} 
              disabled={isLoading || !!emailError || isChecking}
              className="min-w-[120px]"
            >
              {isLoading ? "Processando..." : "Finalizar Compra"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
