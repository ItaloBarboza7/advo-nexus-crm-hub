
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
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
        <Card className="w-full max-w-md">
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
        <Card className="w-full max-w-md">
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
            
            {sessionId && (
              <div className="bg-muted/50 p-3 rounded text-sm">
                <p className="font-medium mb-1">ID da Transação:</p>
                <p className="text-muted-foreground font-mono text-xs">{sessionId}</p>
              </div>
            )}

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Conta Criada com Sucesso!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Parabéns! Sua assinatura do CRM Profissional foi ativada e sua conta foi criada com sucesso.
          </p>
          
          {sessionId && (
            <div className="bg-muted/50 p-3 rounded text-sm">
              <p className="font-medium mb-1">ID da Transação:</p>
              <p className="text-muted-foreground font-mono text-xs">{sessionId}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ✅ Assinatura ativada<br />
              ✅ Conta de usuário criada<br />
              ✅ Acesso liberado ao CRM<br />
              ✅ Suporte prioritário ativo
            </p>
          </div>

          <div className="pt-4">
            <Link to="/login">
              <Button className="w-full">
                Fazer Login
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Use o email e senha cadastrados para acessar sua conta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
