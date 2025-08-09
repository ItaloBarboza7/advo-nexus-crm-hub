
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionValidationResult {
  isValid: boolean;
  userId: string | null;
  sessionAge: number;
  lastValidation: Date | null;
  forceRevalidate: () => Promise<void>;
}

export function useEnhancedSessionValidation(): SessionValidationResult {
  const [isValid, setIsValid] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionAge, setSessionAge] = useState(0);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  const { toast } = useToast();
  const validationInProgress = useRef(false);

  const validateSession = useCallback(async (): Promise<void> => {
    if (validationInProgress.current) {
      return;
    }

    validationInProgress.current = true;

    try {
      console.log('🔒 [SESSION] Iniciando validação de sessão');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ [SESSION] Erro ao obter sessão:', error);
        setIsValid(false);
        setUserId(null);
        setSessionAge(0);
        return;
      }

      if (!session || !session.user) {
        console.log('⚠️ [SESSION] Nenhuma sessão ativa encontrada');
        setIsValid(false);
        setUserId(null);
        setSessionAge(0);
        return;
      }

      // Calcular idade da sessão
      const sessionCreatedAt = new Date(session.user.created_at);
      const currentAge = Date.now() - sessionCreatedAt.getTime();

      // Validar se a sessão não expirou (24 horas)
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 horas em ms
      if (currentAge > maxSessionAge) {
        console.warn('⚠️ [SESSION] Sessão expirada por idade');
        
        toast({
          title: "Sessão Expirada",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive",
        });

        await supabase.auth.signOut();
        setIsValid(false);
        setUserId(null);
        setSessionAge(currentAge);
        return;
      }

      // Validar token JWT
      const token = session.access_token;
      if (!token) {
        console.error('❌ [SESSION] Token de acesso não encontrado');
        setIsValid(false);
        setUserId(null);
        return;
      }

      // Verificar se o usuário ainda existe no banco
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('❌ [SESSION] Usuário não encontrado no banco:', userError);
        setIsValid(false);
        setUserId(null);
        await supabase.auth.signOut();
        return;
      }

      console.log('✅ [SESSION] Sessão válida', {
        userId: userData.user.id,
        sessionAge: Math.round(currentAge / 1000 / 60) + ' minutos'
      });

      setIsValid(true);
      setUserId(userData.user.id);
      setSessionAge(currentAge);
      setLastValidation(new Date());

    } catch (error) {
      console.error('❌ [SESSION] Erro na validação de sessão:', error);
      setIsValid(false);
      setUserId(null);
    } finally {
      validationInProgress.current = false;
    }
  }, [toast]);

  const forceRevalidate = useCallback(async (): Promise<void> => {
    console.log('🔄 [SESSION] Forçando revalidação de sessão');
    await validateSession();
  }, [validateSession]);

  // Validação inicial e periódica
  useEffect(() => {
    validateSession();

    // Revalidar a cada 5 minutos
    const interval = setInterval(validateSession, 5 * 60 * 1000);

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔒 [SESSION] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        setTimeout(validateSession, 100);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [validateSession]);

  return {
    isValid,
    userId,
    sessionAge,
    lastValidation,
    forceRevalidate
  };
}
