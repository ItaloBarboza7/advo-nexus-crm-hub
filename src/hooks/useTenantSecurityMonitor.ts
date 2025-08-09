
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

// Monitor de segurança para detectar tentativas de acesso cross-tenant
export function useTenantSecurityMonitor() {
  const { tenantSchema } = useTenantSchema();
  const { toast } = useToast();
  const lastUserRef = useRef<string | null>(null);
  const initializationRef = useRef(false);

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
            
            toast({
              title: "Conta Trocada",
              description: "Dados sendo atualizados para a nova conta...",
              duration: 2000,
            });
          }
          
          lastUserRef.current = currentUser;
        } else if (event === 'SIGNED_OUT') {
          console.log('🔒 Usuário deslogado - limpando referência');
          lastUserRef.current = null;
        }
      });
      
      initializationRef.current = true;
    }
  }, [toast]);

  // Função para validar se uma query é segura (não acessa outros tenants)
  const validateQuery = (sql: string): boolean => {
    if (!tenantSchema) return false;
    
    const sqlLower = sql.toLowerCase();
    const tenantMatches = sqlLower.match(/tenant_[a-f0-9_]+/g);
    
    if (tenantMatches) {
      const invalidTenants = tenantMatches.filter(match => match !== tenantSchema.toLowerCase());
      if (invalidTenants.length > 0) {
        console.error('🚨 TENTATIVA DE ACESSO CROSS-TENANT BLOQUEADA:', invalidTenants);
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
  };

  return {
    validateQuery,
    currentTenantSchema: tenantSchema
  };
}
