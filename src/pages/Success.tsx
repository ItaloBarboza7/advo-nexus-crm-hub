
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Success = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [userCreated, setUserCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUserCreation = async () => {
      if (!sessionId) {
        setError('ID da sessão não encontrado');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Creating user from payment session:', sessionId);
        
        const { data, error } = await supabase.functions.invoke('create-user-from-payment', {
          body: { sessionId },
        });

        if (error) {
          throw error;
        }

        console.log('User creation result:', data);
        setUserCreated(true);
      } catch (error) {
        console.error('Error creating user:', error);
        setError('Erro ao criar conta do usuário. Entre em contato com o suporte.');
      } finally {
        setIsLoading(false);
      }
    };

    // Add a delay to ensure payment processing is complete
    const timer = setTimeout(() => {
      handleUserCreation();
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Finalizando sua conta...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-600">
              Erro no Processamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error}
            </p>

            <div className="pt-4">
              <Link to="/landing">
                <Button className="w-full">
                  Voltar ao Início
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Entre em contato com nosso suporte para resolver esta questão.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
            <CheckCircle className="w-20 h-20 text-green-500 relative z-10" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Parabéns! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">
              Sua conta foi criada com sucesso!
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Bem-vindo ao CRM Profissional! Sua assinatura foi ativada e você já pode começar a usar todas as funcionalidades do sistema.
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-100">
            <h3 className="font-semibold text-gray-800 mb-3">O que você já tem acesso:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Assinatura ativada</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Conta de usuário criada</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Acesso completo ao CRM</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Suporte prioritário ativo</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/login">
              <Button size="lg" className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg">
                Acessar Minha Conta
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <p className="text-xs text-muted-foreground">
              Use o email e senha cadastrados para acessar sua conta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
