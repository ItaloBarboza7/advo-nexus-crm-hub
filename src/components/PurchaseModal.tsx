
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEmailAvailability } from "@/hooks/useEmailAvailability";
import { usePurchaseFlow } from "@/hooks/usePurchaseFlow";
import { Loader2, Check, X } from "lucide-react";

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
  const [emailError, setEmailError] = useState<string>('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [previousEmail, setPreviousEmail] = useState<string>('');
  const { toast } = useToast();
  const { checkEmailAvailability, isChecking } = useEmailAvailability();
  const { isLoading, handlePurchase } = usePurchaseFlow();

  // Verificar disponibilidade do email quando o usuário para de digitar
  useEffect(() => {
    const checkEmail = async () => {
      if (customerData.email && customerData.email.includes('@') && customerData.email !== previousEmail) {
        const result = await checkEmailAvailability(customerData.email);
        
        if (!result.available) {
          setEmailError('Email indisponível');
          setEmailAvailable(false);
        } else {
          setEmailError('');
          setEmailAvailable(true);
        }
        setPreviousEmail(customerData.email);
      } else if (!customerData.email || !customerData.email.includes('@')) {
        setEmailError('');
        setEmailAvailable(null);
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

    // Reset email validation when email changes
    if (field === 'email' && value !== customerData.email) {
      if (value !== previousEmail) {
        setEmailError('');
        setEmailAvailable(null);
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

    // Block purchase if email is unavailable
    if (emailError || emailAvailable === false) {
      toast({
        title: "Email indisponível",
        description: "Este email já está sendo usado. Por favor, use outro email.",
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

  const onPurchase = async () => {
    if (!validateForm()) return;
    
    await handlePurchase(customerData, planType);
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
    setEmailAvailable(null);
    setPreviousEmail('');
  };

  // Reset form quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Check if purchase button should be disabled - fix the type error
  const isPurchaseDisabled = isLoading || isChecking || Boolean(emailError) || emailAvailable === false;

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
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                disabled={isLoading}
                className={
                  emailError ? "border-red-500 pr-10" : 
                  emailAvailable ? "border-green-500 pr-10" : ""
                }
              />
              {isChecking && customerData.email && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
              {!isChecking && emailAvailable === true && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              )}
              {!isChecking && emailAvailable === false && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <X className="h-4 w-4 text-red-600" />
                </div>
              )}
            </div>
            {isChecking && customerData.email && (
              <p className="text-sm text-gray-500">Verificando disponibilidade...</p>
            )}
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
            {emailAvailable === true && !emailError && (
              <p className="text-sm text-green-600">Email disponível</p>
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
              onClick={onPurchase} 
              disabled={isPurchaseDisabled}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Finalizar Compra"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
