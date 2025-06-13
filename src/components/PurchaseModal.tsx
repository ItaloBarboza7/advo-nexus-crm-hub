
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'monthly' | 'annual';
}

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
}

export function PurchaseModal({ isOpen, onClose, planType }: PurchaseModalProps) {
  const [step, setStep] = useState<'customer-data' | 'payment'>('customer-data');
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const planPrice = planType === 'monthly' ? 'R$ 157' : 'R$ 99';
  const planDescription = planType === 'monthly' ? 'por mês' : 'por mês (cobrado anualmente)';

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const isCustomerDataValid = () => {
    return customerData.name && 
           customerData.email && 
           customerData.phone && 
           customerData.cpf &&
           customerData.password &&
           customerData.password.length >= 6;
  };

  const handleAdvance = () => {
    if (step === 'customer-data' && isCustomerDataValid()) {
      setStep('payment');
    }
  };

  const handleBack = () => {
    if (step === 'payment') {
      setStep('customer-data');
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      console.log('Processando pagamento...', { customerData, planType });
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          customerData,
          planType,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirecionar para o Stripe Checkout
        window.open(data.url, '_blank');
        onClose();
      } else {
        throw new Error('URL de pagamento não recebida');
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep('customer-data');
    setCustomerData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      password: ''
    });
    setShowPassword(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'customer-data' ? 'Seus Dados' : 'Pagamento'}
          </DialogTitle>
        </DialogHeader>

        {step === 'customer-data' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={customerData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Digite seu email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={customerData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={customerData.cpf}
                onChange={(e) => handleInputChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={customerData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {customerData.password && customerData.password.length < 6 && (
                <p className="text-sm text-red-500">A senha deve ter pelo menos 6 caracteres</p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Plano Selecionado:</span>
                <Badge variant="secondary">CRM Profissional</Badge>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{planPrice}</div>
                <div className="text-sm text-muted-foreground">{planDescription}</div>
              </div>
            </div>

            <Button 
              onClick={handleAdvance} 
              className="w-full"
              disabled={!isCustomerDataValid()}
            >
              Avançar
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-medium mb-2">Resumo do Pedido</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Nome:</span>
                  <span>{customerData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{customerData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plano:</span>
                  <span>CRM Profissional</span>
                </div>
                <div className="flex justify-between font-medium text-base pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{planPrice} {planDescription}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-800 mb-2">
                🔒 Pagamento Seguro via Stripe
              </p>
              <p className="text-xs text-blue-600">
                Seus dados estão protegidos com criptografia SSL
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Voltar
              </Button>
              <Button 
                onClick={handlePayment}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Processando...' : 'Pagar Agora'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
