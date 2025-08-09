
import { useState, useCallback, useRef } from 'react';

interface DebugEvent {
  id: string;
  type: string;
  details: any;
  timestamp: Date;
  success: boolean;
}

interface Operation {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  success?: boolean;
  details?: any;
}

export function useLeadsDebugger() {
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const operationsRef = useRef<Map<string, Operation>>(new Map());

  const addDebugLog = useCallback((type: string, details: any, success: boolean = true) => {
    if (!isEnabled) return;

    const event: DebugEvent = {
      id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      details,
      timestamp: new Date(),
      success
    };

    setDebugEvents(prev => [event, ...prev].slice(0, 100)); // Manter apenas os 100 mais recentes
    
    console.log(`🐛 [LEADS DEBUGGER] ${type}:`, details);
  }, [isEnabled]);

  const startOperation = useCallback((name: string, details?: any) => {
    if (!isEnabled) return null;

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation: Operation = {
      id: operationId,
      name,
      startTime: new Date(),
      details
    };

    operationsRef.current.set(operationId, operation);
    setOperations(prev => [operation, ...prev].slice(0, 50)); // Manter apenas 50 operações

    addDebugLog(`OPERATION_START_${name}`, { operationId, details }, true);
    return operationId;
  }, [isEnabled, addDebugLog]);

  const endOperation = useCallback((operationId: string | null, result?: any, success: boolean = true) => {
    if (!isEnabled || !operationId) return;

    const operation = operationsRef.current.get(operationId);
    if (!operation) return;

    const completedOperation = {
      ...operation,
      endTime: new Date(),
      success,
      details: { ...operation.details, result }
    };

    operationsRef.current.set(operationId, completedOperation);
    
    setOperations(prev => 
      prev.map(op => op.id === operationId ? completedOperation : op)
    );

    const duration = completedOperation.endTime.getTime() - completedOperation.startTime.getTime();
    
    addDebugLog(`OPERATION_END_${operation.name}`, {
      operationId,
      duration: `${duration}ms`,
      success,
      result
    }, success);
  }, [isEnabled, addDebugLog]);

  const clearLogs = useCallback(() => {
    setDebugEvents([]);
    setOperations([]);
    operationsRef.current.clear();
  }, []);

  const toggleDebugger = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (!isEnabled) {
      addDebugLog('DEBUGGER_ENABLED', { timestamp: new Date().toISOString() }, true);
    } else {
      addDebugLog('DEBUGGER_DISABLED', { timestamp: new Date().toISOString() }, true);
    }
  }, [isEnabled, addDebugLog]);

  const getOperationDuration = useCallback((operation: Operation): number => {
    if (!operation.endTime) return 0;
    return operation.endTime.getTime() - operation.startTime.getTime();
  }, []);

  return {
    debugEvents,
    operations,
    isEnabled,
    addDebugLog,
    startOperation,
    endOperation,
    clearLogs,
    toggleDebugger,
    getOperationDuration
  };
}
