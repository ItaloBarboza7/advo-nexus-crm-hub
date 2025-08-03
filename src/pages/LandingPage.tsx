
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Users, BarChart3, Shield, Clock, X, Headphones } from 'lucide-react';
import { PurchaseModal } from '@/components/PurchaseModal';

const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const features = [
    "Gestão completa de leads",
    "Dashboard analítico avançado", 
    "Relatórios personalizados",
    "Suporte prioritário 24/7"
  ];

  const stats = [
    { icon: Users, value: "500+", label: "Clientes ativos" },
    { icon: BarChart3, value: "40%+", label: "Conversão média" },
    { icon: Shield, value: "99.9%", label: "ajustes precisos" }
  ];

  const handlePurchaseClick = () => {
    setIsPurchaseModalOpen(true);
  };

  // Calculate the plan price based on billing period
  const planPrice = billingPeriod === 'monthly' ? 'R$ 157/mês' : 'R$ 99/mês (cobrado anualmente)';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/fe9b88f3-37c0-4d92-a1f5-c25818c8cd49.png" 
              alt="EVOjuris Logo" 
              className="h-20 w-auto"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-gray-700 hover:text-blue-600">Entrar</Button>
            </Link>
            <Button onClick={handlePurchaseClick} className="bg-blue-600 hover:bg-blue-700 text-white">Começar Agora</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Transforme Leads em
            <br />
            Resultados Reais
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            O CRM mais completo do mercado para gestão inteligente de leads, análise de performance 
            e aperfeiçoamento.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Escolha seu plano e Cadastre-se
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Comece hoje mesmo e revolucione sua gestão comercial
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-sm ${billingPeriod === 'monthly' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                Mensal
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="relative border-2 border-gray-300 bg-white"
              >
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  billingPeriod === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${
                    billingPeriod === 'annual' ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'
                  }`} />
                </div>
              </Button>
              <span className={`text-sm ${billingPeriod === 'annual' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                Anual
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">-37%</Badge>
              </span>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-blue-200 shadow-lg relative overflow-hidden bg-white">
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2 text-gray-900">CRM Evojuris</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Tudo que você precisa para dominar suas vendas
                </CardDescription>
                
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      R$ {billingPeriod === 'monthly' ? '157' : '99'}
                    </span>
                    <div className="text-left">
                      <div className="text-gray-600">por mês</div>
                      {billingPeriod === 'annual' && (
                        <div className="text-sm text-gray-500 line-through">
                          R$ 157
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-gray-500 mt-2">
                      Cobrado anualmente (R$ 1.188/ano)
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Button 
                  className="w-full mb-6 h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white" 
                  size="lg"
                  onClick={handlePurchaseClick}
                >
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">30 dias de teste grátis</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <X className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Cancele quando quiser</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Headphones className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Suporte especializado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Faça login aqui
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-white">
        <div className="container mx-auto text-center">
          <p className="text-gray-600">
            © 2024 EVOjuris. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <PurchaseModal 
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        planType={billingPeriod}
        planPrice={planPrice}
      />
    </div>
  );
};

export default LandingPage;
