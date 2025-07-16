
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
      console.log('🔍 ResetPassword - Checking reset token...');
      console.log('Current URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search params:', window.location.search);

      // Check for token in URL hash (from email link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type');
      const type = hashParams.get('type');

      console.log('Hash params:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        tokenType, 
        type,
        accessTokenLength: accessToken?.length,
        refreshTokenLength: refreshToken?.length
      });

      // Also check URL search params as fallback
      const urlParams = new URLSearchParams(window.location.search);
      const urlAccessToken = urlParams.get('access_token');
      const urlRefreshToken = urlParams.get('refresh_token');
      const urlType = urlParams.get('type');

      console.log('URL params:', {
        hasAccessToken: !!urlAccessToken,
        hasRefreshToken: !!urlRefreshToken,
        type: urlType
      });

      // Use tokens from either hash or URL params
      const finalAccessToken = accessToken || urlAccessToken;
      const finalRefreshToken = refreshToken || urlRefreshToken;
      const finalType = type || urlType;

      // Check for error parameters
      const error = hashParams.get('error') || urlParams.get('error');
      const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');

      if (error) {
        console.error('❌ Auth error from URL:', error, errorDescription);
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
          duration: 5000
        });
        setIsValidToken(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!finalAccessToken || !finalRefreshToken || finalType !== 'recovery') {
        console.error('❌ Missing required tokens or wrong type');
        console.log('Expected type: recovery, got:', finalType);
        console.log('Has access token:', !!finalAccessToken);
        console.log('Has refresh token:', !!finalRefreshToken);
        
        toast({
          title: "Link inválido",
          description: "Link de redefinição de senha inválido. Solicite um novo link.",
          variant: "destructive",
          duration: 5000
        });
        setIsValidToken(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        console.log('🔄 Setting session with tokens...');
        // Set the session with the tokens from the URL
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          toast({
            title: "Erro",
            description: "Erro ao validar o link de redefinição. Solicite um novo link.",
            variant: "destructive"
          });
          setIsValidToken(false);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          console.log('✅ Session set successfully:', !!data.session);
          console.log('✅ User authenticated:', !!data.session?.user);
          setIsValidToken(true);
          toast({
            title: "Link válido",
            description: "Agora você pode definir sua nova senha",
            duration: 3000
          });
          
          // Clear the URL hash and search params to remove tokens from URL bar
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error('❌ Error setting session:', err);
        toast({
          title: "Erro",
          description: "Erro ao processar o link de redefinição",
          variant: "destructive"
        });
        setIsValidToken(false);
        setTimeout(() => navigate('/login'), 3000);
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
      console.log('🔄 Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Password update error:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao redefinir senha",
          variant: "destructive"
        });
      } else {
        console.log('✅ Password updated successfully');
        toast({
          title: "Senha redefinida",
          description: "Sua senha foi redefinida com sucesso. Redirecionando...",
          duration: 3000
        });
        
        // Sign out to force re-login with new password
        await supabase.auth.signOut();
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while validating token
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

  // Show error state if token is invalid
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
