
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSchema } from '@/hooks/useTenantSchema';
import { useToast } from '@/hooks/use-toast';

interface DebugLog {
  timestamp: string;
  operation: string;
  data: any;
  success: boolean;
  duration?: number;
}

interface LeadsHealthCheck {
  databaseConnection: boolean;
  tenantSchema: string | null;
  leadsTableExists: boolean;
  realtimeSubscription: boolean;
  triggersActive: boolean;
  lastOperation: DebugLog | null;
}

interface CountResult {
  count: number;
}

interface TriggerResult {
  trigger_name: string;
  event_manipulation: string;
  action_statement: string;
}

export function useLeadsDebugger() {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const { tenantSchema } = useTenantSchema();
  const { toast } = useToast();
  const operationStartTime = useRef<number>(0);

  const addDebugLog = useCallback((operation: string, data: any, success: boolean, duration?: number) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      operation,
      data,
      success,
      duration
    };
    
    console.log(`🔍 DEBUG [${operation}]:`, log);
    setDebugLogs(prev => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
  }, []);

  const startOperation = useCallback((operation: string) => {
    operationStartTime.current = Date.now();
    console.log(`⏱️ Starting operation: ${operation}`);
  }, []);

  const endOperation = useCallback((operation: string, data: any, success: boolean) => {
    const duration = Date.now() - operationStartTime.current;
    addDebugLog(operation, data, success, duration);
  }, [addDebugLog]);

  const testDatabaseConnection = useCallback(async () => {
    try {
      startOperation('database_connection_test');
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      endOperation('database_connection_test', { error }, !error);
      return !error;
    } catch (error) {
      endOperation('database_connection_test', { error }, false);
      return false;
    }
  }, [startOperation, endOperation]);

  const testTenantSchema = useCallback(async () => {
    if (!tenantSchema) return null;
    
    try {
      startOperation('tenant_schema_test');
      const sql = `SELECT COUNT(*) as count FROM ${tenantSchema}.leads LIMIT 1`;
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      endOperation('tenant_schema_test', { tenantSchema, error, data }, !error);
      return !error;
    } catch (error) {
      endOperation('tenant_schema_test', { tenantSchema, error }, false);
      return false;
    }
  }, [tenantSchema, startOperation, endOperation]);

  const testTriggersStatus = useCallback(async () => {
    if (!tenantSchema) return null;
    
    try {
      startOperation('triggers_status_test');
      const sql = `
        SELECT 
          trigger_name, 
          event_manipulation, 
          action_statement 
        FROM information_schema.triggers 
        WHERE trigger_schema = '${tenantSchema}'
        AND table_name = 'leads'
      `;
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      const triggersData = data as TriggerResult[];
      endOperation('triggers_status_test', { data: triggersData, error }, !error);
      return { active: !error, triggers: triggersData || [] };
    } catch (error) {
      endOperation('triggers_status_test', { error }, false);
      return { active: false, triggers: [] };
    }
  }, [tenantSchema, startOperation, endOperation]);

  const performHealthCheck = useCallback(async (): Promise<LeadsHealthCheck> => {
    setIsDebugging(true);
    
    try {
      const [dbConnection, schemaTest, triggersTest] = await Promise.all([
        testDatabaseConnection(),
        testTenantSchema(),
        testTriggersStatus()
      ]);

      const healthCheck: LeadsHealthCheck = {
        databaseConnection: dbConnection,
        tenantSchema,
        leadsTableExists: schemaTest ?? false,
        realtimeSubscription: false, // Will be updated by realtime test
        triggersActive: triggersTest?.active ?? false,
        lastOperation: debugLogs[0] || null
      };

      console.log('🏥 Health Check Result:', healthCheck);
      return healthCheck;
    } finally {
      setIsDebugging(false);
    }
  }, [testDatabaseConnection, testTenantSchema, testTriggersStatus, tenantSchema, debugLogs]);

  const testLeadCreation = useCallback(async () => {
    if (!tenantSchema) return false;

    try {
      startOperation('test_lead_creation');
      
      const testLead = {
        name: `Test Lead ${Date.now()}`,
        phone: '999999999',
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      const sql = `
        INSERT INTO ${tenantSchema}.leads (name, phone, user_id)
        VALUES ('${testLead.name}', '${testLead.phone}', '${testLead.user_id}')
        RETURNING id, name
      `;

      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      const resultData = data as { id: string; name: string }[];
      if (!error && resultData && Array.isArray(resultData) && resultData.length > 0) {
        // Clean up test lead
        const deleteId = resultData[0].id;
        const deleteSql = `DELETE FROM ${tenantSchema}.leads WHERE id = '${deleteId}'`;
        await supabase.rpc('exec_sql', { sql: deleteSql });
        
        endOperation('test_lead_creation', { success: true, testLead: resultData[0] }, true);
        return true;
      } else {
        endOperation('test_lead_creation', { error, data }, false);
        return false;
      }
    } catch (error) {
      endOperation('test_lead_creation', { error }, false);
      return false;
    }
  }, [tenantSchema, startOperation, endOperation]);

  const testLeadDeletion = useCallback(async () => {
    if (!tenantSchema) return false;

    try {
      startOperation('test_lead_deletion');
      
      const testLead = {
        name: `Test Delete Lead ${Date.now()}`,
        phone: '888888888',
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      // Create test lead
      const createSql = `
        INSERT INTO ${tenantSchema}.leads (name, phone, user_id)
        VALUES ('${testLead.name}', '${testLead.phone}', '${testLead.user_id}')
        RETURNING id
      `;

      const { data: createData, error: createError } = await supabase.rpc('exec_sql', { sql: createSql });
      
      const createResult = createData as { id: string }[];
      if (createError || !createResult || !Array.isArray(createResult) || createResult.length === 0) {
        endOperation('test_lead_deletion', { createError }, false);
        return false;
      }

      const leadId = createResult[0].id;

      // Attempt to delete
      const deleteSql = `DELETE FROM ${tenantSchema}.leads WHERE id = '${leadId}'`;
      const { error: deleteError } = await supabase.rpc('exec_sql', { sql: deleteSql });

      // Verify deletion
      const verifySql = `SELECT COUNT(*) as count FROM ${tenantSchema}.leads WHERE id = '${leadId}'`;
      const { data: verifyData, error: verifyError } = await supabase.rpc('exec_sql', { sql: verifySql });

      const verifyResult = verifyData as CountResult[];
      const actuallyDeleted = !verifyError && verifyResult && Array.isArray(verifyResult) && verifyResult[0]?.count === 0;

      endOperation('test_lead_deletion', {
        leadId,
        deleteError,
        verifyError,
        actuallyDeleted,
        remainingCount: verifyResult?.[0]?.count
      }, actuallyDeleted);

      return actuallyDeleted;
    } catch (error) {
      endOperation('test_lead_deletion', { error }, false);
      return false;
    }
  }, [tenantSchema, startOperation, endOperation]);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
    console.log('🧹 Debug logs cleared');
  }, []);

  return {
    debugLogs,
    isDebugging,
    performHealthCheck,
    testLeadCreation,
    testLeadDeletion,
    testDatabaseConnection,
    testTenantSchema,
    testTriggersStatus,
    clearDebugLogs,
    addDebugLog,
    startOperation,
    endOperation
  };
}
