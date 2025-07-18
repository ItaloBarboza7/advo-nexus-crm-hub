
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkResetToken = async () => {
      console.log('🔍 ResetPassword - Verificando tokens de recovery...', {
        currentURL: window.location.href,
        hash: window.location.hash,
        searchParams: window.location.search,
        hostname: window.location.hostname,
        pathname: window.location.pathname
      });

      // Verificar tokens no hash da URL (formato padrão do Supabase)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');
      const type = hashParams.get('type');
      const expiresAt = hashParams.get('expires_at');
      const expiresIn = hashParams.get('expires_in');

      console.log('🔑 Tokens encontrados no hash:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        tokenType, 
        type,
        expiresAt,
        expiresIn,
        accessTokenLength: accessToken?.length,
        refreshTokenLength: refreshToken?.length
      });

      // Verificar também nos parâmetros da URL como fallback
      const urlParams = new URLSearchParams(window.location.search);
      const urlAccessToken = urlParams.get('access_token');
      const urlRefreshToken = urlParams.get('refresh_token');
      const urlType = urlParams.get('type');
      const urlTokenType = urlParams.get('token_type');

      console.log('🔍 Parâmetros da URL:', {
        hasAccessToken: !!urlAccessToken,
        hasRefreshToken: !!urlRefreshToken,
        type: urlType,
        tokenType: urlTokenType
      });

      // Usar tokens do hash ou URL params
      const finalAccessToken = accessToken || urlAccessToken;
      const finalRefreshToken = refreshToken || urlRefreshToken;
      const finalType = type || urlType;
      const finalTokenType = tokenType || urlTokenType;

      // Verificar se há erros nos parâmetros
      const error = hashParams.get('error') || urlParams.get('error');
      const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');

      if (error) {
        console.error('❌ Erro de autenticação na URL:', {
          error,
          errorDescription,
          allHashParams: Object.fromEntries(hashParams.entries()),
          allUrlParams: Object.fromEntries(urlParams.entries())
        });
        
        let errorMessage = "Link de redefinição inválido ou expirado";
        
        if (error === 'access_denied') {
          errorMessage = "Acesso negado. O link pode ter expirado ou já foi usado.";
        } else if (error === 'token_expired' || errorDescription?.includes('expired')) {
          errorMessage = "O link de redefinição expirou. Solicite um novo link.";
        } else if (error === 'otp_expired') {
          errorMessage = "O código de verificação expirou. Solicite um novo link de redefinição.";
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
          duration: 8000
        });
        setIsValidToken(false);
        setTimeout(() => navigate('/login'), 5000);
        return;
      }

      // Validar se todos os tokens necessários estão presentes
      if (!finalAccessToken || !finalRefreshToken || finalType !== 'recovery') {
        console.error('❌ Tokens necessários não encontrados ou tipo incorreto:', {
          hasAccessToken: !!finalAccessToken,
          hasRefreshToken: !!finalRefreshToken,
          type: finalType,
          expectedType: 'recovery',
          tokenType: finalTokenType,
          allTokensFromHash: Object.fromEntries(hashParams.entries()),
          allTokensFromUrl: Object.fromEntries(urlParams.entries())
        });
        
        toast({
          title: "Link inválido",
          description: "Link de redefinição de senha inválido. Solicite um novo link.",
          variant: "destructive",
          duration: 8000
        });
        setIsValidToken(false);
        setTimeout(() => navigate('/login'), 5000);
        return;
      }

      try {
        console.log('🔄 Configurando sessão com os tokens de recovery...');
        
        // Configurar a sessão com os tokens da URL
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken
        });

        if (sessionError) {
          console.error('❌ Erro ao configurar sessão:', {
            error: sessionError,
            message: sessionError.message,
            status: sessionError.status
          });
          
          let errorMessage = "Erro ao validar o link de redefinição.";
          
          if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid')) {
            errorMessage = "Link de redefinição expirado ou inválido. Solicite um novo link.";
          }
          
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
            duration: 8000
          });
          setIsValidToken(false);
          setTimeout(() => navigate('/login'), 5000);
        } else {
          console.log('✅ Sessão configurada com sucesso:', {
            hasSession: !!data.session,
            hasUser: !!data.session?.user,
            userId: data.session?.user?.id,
            userEmail: data.session?.user?.email
          });
          
          setIsValidToken(true);
          toast({
            title: "Link válido",
            description: "Agora você pode definir sua nova senha",
            duration: 3000
          });
          
          // Limpar os tokens da barra de endereços por segurança
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          
          console.log('🧹 URL limpa para segurança:', cleanUrl);
        }
      } catch (err) {
        console.error('❌ Erro inesperado ao processar sessão:', err);
        toast({
          title: "Erro",
          description: "Erro inesperado ao processar o link de redefinição",
          variant: "destructive",
          duration: 8000
        });
        setIsValidToken(false);
        setTimeout(() => navigate('/login'), 5000);
      }
    };

    checkResetToken();
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Atualizando senha do usuário...');
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Erro ao atualizar senha:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao redefinir senha",
          variant: "destructive"
        });
      } else {
        console.log('✅ Senha atualizada com sucesso');
        toast({
          title: "Senha redefinida",
          description: "Sua senha foi redefinida com sucesso. Redirecionando...",
          duration: 3000
        });
        
        // Fazer logout para forçar novo login com a nova senha
        await supabase.auth.signOut();
        
        // Redirecionar após um breve delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Estado de carregamento durante validação do token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Validando link de redefinição...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado de erro se o token for inválido
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-destructive">Link inválido</CardTitle>
            <CardDescription className="text-center">
              O link de redefinição de senha é inválido ou expirou. Você será redirecionado para a página de login.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de redefinição de senha
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Redefinir senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
