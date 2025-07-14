import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        if (!email) {
          toast({
            title: "Erro",
            description: "Por favor, digite seu email",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) {
          console.error('Reset password error:', error);
          toast({
            title: "Erro",
            description: error.message || "Erro ao enviar email de redefinição",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Email enviado",
            description: "Verifique seu email para redefinir a senha. O link expira em 1 hora.",
            duration: 5000
          });
          setIsForgotPassword(false);
          setEmail('');
        }
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('Login error:', error);
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login realizado",
            description: "Bem-vindo de volta!"
          });
          navigate('/');
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          console.error('Signup error:', error);
          toast({
            title: "Erro no cadastro",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Conta criada",
            description: "Verifique seu email para confirmar a conta"
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (isForgotPassword) return "Esqueceu a senha?";
    return isLogin ? "Entrar" : "Criar conta";
  };

  const getDescription = () => {
    if (isForgotPassword) return "Digite seu email para receber instruções de redefinição";
    return isLogin ? "Entre na sua conta" : "Crie uma nova conta";
  };

  const getButtonText = () => {
    if (isForgotPassword) return "Enviar";
    return isLogin ? "Entrar" : "Criar conta";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">{getTitle()}</CardTitle>
          <CardDescription className="text-center">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : getButtonText()}
            </Button>
            
            {!isForgotPassword && (
              <>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Esqueceu a senha?
                </Button>
                
                <div className="text-center text-sm">
                  {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
                  {isLogin ? (
                    <Link to="/landing" className="text-primary hover:underline font-medium">
                      Criar conta
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => setIsLogin(!isLogin)}
                    >
                      Entrar
                    </Button>
                  )}
                </div>
              </>
            )}
            
            {isForgotPassword && (
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail('');
                }}
              >
                Voltar ao login
              </Button>
            )}
            
            <div className="text-center text-sm text-muted-foreground">
              <Link to="/" className="hover:underline">
                Voltar ao início
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
