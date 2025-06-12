
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Star, Users, BarChart3, Shield } from 'lucide-react';
import { PurchaseModal } from '@/components/PurchaseModal';

const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const features = [
    "Gestão completa de leads",
    "Dashboard analítico avançado",
    "Relatórios personalizados",
    "Integração com múltiplas fontes",
    "Automação de processo",
    "Suporte prioritário 24/7",
    "Backup automático",
    "Segurança avançada"
  ];

  const stats = [
    { icon: Users, value: "10k+", label: "Clientes ativos" },
    { icon: BarChart3, value: "95%", label: "Conversão média" },
    { icon: Shield, value: "99.9%", label: "Uptime garantido" }
  ];

  const handlePurchaseClick = () => {
    setIsPurchaseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">CRM Pro</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Button onClick={handlePurchaseClick}>Começar Agora</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            🚀 Solução Completa de CRM
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Transforme Leads em
            <br />
            Resultados Reais
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            O CRM mais completo do mercado para gestão de leads, análise de performance 
            e automação de processos comerciais.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-background/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha seu plano
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Comece hoje mesmo e revolucione sua gestão comercial
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={billingPeriod === 'monthly' ? 'font-medium' : 'text-muted-foreground'}>
                Mensal
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                className="relative"
              >
                <div className={`w-12 h-6 rounded-full transition-colors ${
                  billingPeriod === 'annual' ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${
                    billingPeriod === 'annual' ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'
                  }`} />
                </div>
              </Button>
              <span className={billingPeriod === 'annual' ? 'font-medium' : 'text-muted-foreground'}>
                Anual
                <Badge variant="secondary" className="ml-2">-37%</Badge>
              </span>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-primary/20 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg">
                <Star className="w-4 h-4 inline mr-1" />
                Mais Popular
              </div>
              
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">CRM Profissional</CardTitle>
                <CardDescription className="text-base">
                  Tudo que você precisa para dominar suas vendas
                </CardDescription>
                
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold">
                      R$ {billingPeriod === 'monthly' ? '157' : '99'}
                    </span>
                    <div className="text-left">
                      <div className="text-muted-foreground">por mês</div>
                      {billingPeriod === 'annual' && (
                        <div className="text-sm text-muted-foreground line-through">
                          R$ 157
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Cobrado anualmente (R$ 1.188/ano)
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Button 
                  className="w-full mb-6 h-12 text-lg" 
                  size="lg"
                  onClick={handlePurchaseClick}
                >
                  Comprar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-muted-foreground">
                    ✅ 7 dias de teste grátis
                    <br />
                    ✅ Cancele quando quiser
                    <br />
                    ✅ Suporte especializado
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Faça login aqui
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-background">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 CRM Pro. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <PurchaseModal 
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        planType={billingPeriod}
      />
    </div>
  );
};

export default LandingPage;
