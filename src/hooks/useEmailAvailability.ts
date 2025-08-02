
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailAvailabilityResponse {
  available: boolean;
  email: string;
  error?: string;
}

export function useEmailAvailability() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string>('');

  const checkEmailAvailability = useCallback(async (email: string): Promise<EmailAvailabilityResponse> => {
    if (!email || email.trim() === '') {
      return { available: true, email: '' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Se é o mesmo email da última verificação, não verificar novamente
    if (trimmedEmail === lastCheckedEmail) {
      return { available: true, email: trimmedEmail };
    }

    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-email-availability', {
        body: { email: trimmedEmail }
      });

      if (error) {
        console.error('Erro ao verificar disponibilidade do email:', error);
        return { available: true, email: trimmedEmail, error: 'Erro ao verificar email' };
      }

      setLastCheckedEmail(trimmedEmail);
      
      return {
        available: data.available,
        email: trimmedEmail,
        error: data.error
      };
    } catch (error) {
      console.error('Erro inesperado ao verificar email:', error);
      return { available: true, email: trimmedEmail, error: 'Erro inesperado' };
    } finally {
      setIsChecking(false);
    }
  }, [lastCheckedEmail]);

  return {
    checkEmailAvailability,
    isChecking
  };
}
