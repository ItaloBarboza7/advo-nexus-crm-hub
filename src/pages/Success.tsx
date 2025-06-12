
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

const Success = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate verification process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando seu pagamento...</p>
            </div>
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
            Pagamento Aprovado!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Parabéns! Sua assinatura do CRM Profissional foi ativada com sucesso.
          </p>
          
          {sessionId && (
            <div className="bg-muted/50 p-3 rounded text-sm">
              <p className="font-medium mb-1">ID da Transação:</p>
              <p className="text-muted-foreground font-mono text-xs">{sessionId}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ✅ Acesso liberado ao CRM completo<br />
              ✅ Email de boas-vindas enviado<br />
              ✅ Suporte prioritário ativado
            </p>
          </div>

          <div className="pt-4">
            <Link to="/">
              <Button className="w-full">
                Acessar o CRM
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Dúvidas? Entre em contato com nosso suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
