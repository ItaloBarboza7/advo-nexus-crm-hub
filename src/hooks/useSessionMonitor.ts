
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionInfo {
  user_id: string;
  tenant_id: string;
  tenant_schema: string;
  is_member: boolean;
  session_timestamp: string;
}

export function useSessionMonitor() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const getSessionInfo = useCallback(async (): Promise<SessionInfo | null> => {
    try {
      setIsLoading(true);
      console.log('📊 Obtendo informações da sessão...');

      const { data, error } = await supabase.rpc('get_user_session_info');

      if (error) {
        console.error('❌ Erro ao obter informações da sessão:', error);
        return null;
      }

      console.log('✅ Informações da sessão obtidas:', data);
      
      // Type guard to ensure data is the correct type
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const sessionData = data as SessionInfo;
        setSessionInfo(sessionData);
        setLastCheck(new Date());
        return sessionData;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Erro inesperado ao obter sessão:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh session info every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      getSessionInfo();
    }, 5 * 60 * 1000);

    // Get initial session info
    getSessionInfo();

    return () => clearInterval(interval);
  }, [getSessionInfo]);

  const refreshSession = useCallback(() => {
    return getSessionInfo();
  }, [getSessionInfo]);

  return {
    sessionInfo,
    isLoading,
    lastCheck,
    refreshSession,
    getSessionInfo
  };
}
