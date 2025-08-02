
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailAvailabilityResponse {
  available: boolean;
  email: string;
  error?: string;
}

export function useEmailAvailability() {
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailAvailability = useCallback(async (email: string): Promise<EmailAvailabilityResponse> => {
    if (!email || email.trim() === '') {
      return { available: true, email: '' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    setIsChecking(true);
    
    try {
      // Add timeout to email check as well
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email check timeout')), 10000); // 10 seconds
      });

      const checkPromise = supabase.functions.invoke('check-email-availability', {
        body: { email: trimmedEmail }
      });

      const { data, error } = await Promise.race([checkPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Erro ao verificar disponibilidade do email:', error);
        // Don't block user on email check failure - assume available
        return { available: true, email: trimmedEmail, error: 'Erro ao verificar email (assumindo disponível)' };
      }

      return {
        available: data.available,
        email: trimmedEmail,
        error: data.error
      };
    } catch (error) {
      console.error('Erro inesperado ao verificar email:', error);
      // Don't block user on email check failure - assume available
      return { available: true, email: trimmedEmail, error: 'Erro ao verificar email (assumindo disponível)' };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkEmailAvailability,
    isChecking
  };
}
