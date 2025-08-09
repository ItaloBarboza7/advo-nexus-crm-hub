
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  type: string;
  details: any;
  timestamp: Date;
}

// Monitor de segurança para detectar tentativas de acesso cross-tenant
export function useTenantSecurityMonitor() {
  const { tenantSchema } = useTenantSchema();
  const { toast } = useToast();
  const lastUserRef = useRef<string | null>(null);
  const initializationRef = useRef(false);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastEvent, setLastEvent] = useState<SecurityEvent | null>(null);

  const reportSecurityEvent = useCallback((type: string, details: any) => {
    const event: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      details,
      timestamp: new Date()
    };

    setSecurityEvents(prev => [event, ...prev].slice(0, 50)); // Keep only 50 most recent
    setLastEvent(event);
    
    console.log(`🔒 [SECURITY EVENT] ${type}:`, details);
  }, []);

  useEffect(() => {
    if (!initializationRef.current) {
      console.log('🔒 Inicializando monitor de segurança de tenant');
      
      // Monitorar mudanças de usuário
      supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user?.id || null;
        const previousUser = lastUserRef.current;
        
        if (event === 'SIGNED_IN' && currentUser) {
          if (previousUser && previousUser !== currentUser) {
            console.log(`🔒 TROCA DE USUÁRIO DETECTADA: ${previousUser} → ${currentUser}`);
            
            reportSecurityEvent('USER_SWITCH_DETECTED', {
              previousUser,
              currentUser,
              timestamp: new Date().toISOString()
            });
            
            toast({
              title: "Conta Trocada",
              description: "Dados sendo atualizados para a nova conta...",
              duration: 2000,
            });
          }
          
          lastUserRef.current = currentUser;
        } else if (event === 'SIGNED_OUT') {
          console.log('🔒 Usuário deslogado - limpando referência');
          reportSecurityEvent('USER_SIGNED_OUT', {
            previousUser: lastUserRef.current,
            timestamp: new Date().toISOString()
          });
          lastUserRef.current = null;
        }
      });
      
      initializationRef.current = true;
      setIsMonitoring(true);
    }
  }, [toast, reportSecurityEvent]);

  // Função para validar se uma query é segura (não acessa outros tenants)
  const validateQuery = useCallback((sql: string): boolean => {
    if (!tenantSchema) return false;
    
    const sqlLower = sql.toLowerCase();
    const tenantMatches = sqlLower.match(/tenant_[a-f0-9_]+/g);
    
    if (tenantMatches) {
      const invalidTenants = tenantMatches.filter(match => match !== tenantSchema.toLowerCase());
      if (invalidTenants.length > 0) {
        console.error('🚨 TENTATIVA DE ACESSO CROSS-TENANT BLOQUEADA:', invalidTenants);
        
        reportSecurityEvent('CROSS_TENANT_ACCESS_BLOCKED', {
          attemptedSchemas: invalidTenants,
          currentSchema: tenantSchema,
          sql: sql.substring(0, 200)
        });
        
        toast({
          title: "Acesso Negado",
          description: "Tentativa de acesso a dados de outra conta foi bloqueada.",
          variant: "destructive",
          duration: 5000,
        });
        return false;
      }
    }
    
    return true;
  }, [tenantSchema, reportSecurityEvent, toast]);

  return {
    validateQuery,
    currentTenantSchema: tenantSchema,
    securityEvents,
    isMonitoring,
    lastEvent,
    reportSecurityEvent
  };
}
