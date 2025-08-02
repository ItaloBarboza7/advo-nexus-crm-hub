
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Activity, Zap, Database, Settings } from 'lucide-react';
import { useLeadsDebugger } from '@/hooks/useLeadsDebugger';

export function EnhancedLeadDebugPanel() {
  const {
    debugLogs,
    isDebugging,
    performHealthCheck,
    testLeadCreation,
    testLeadDeletion,
    testDatabaseConnection,
    testTenantSchema,
    testTriggersStatus,
    clearDebugLogs
  } = useLeadsDebugger();

  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runHealthCheck = async () => {
    const result = await performHealthCheck();
    setHealthStatus(result);
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    try {
      const results = {
        dbConnection: await testDatabaseConnection(),
        schemaTest: await testTenantSchema(),
        triggersTest: await testTriggersStatus(),
        leadCreation: await testLeadCreation(),
        leadDeletion: await testLeadDeletion()
      };
      setTestResults(results);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <Activity className="h-4 w-4 text-gray-400" />;
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean | null) => {
    if (status === null) return "secondary";
    return status ? "default" : "destructive";
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Enhanced Leads Debug Panel</h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={runHealthCheck} disabled={isDebugging} size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Health Check
          </Button>
          <Button onClick={runAllTests} disabled={isRunningTests} variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Run All Tests
          </Button>
          <Button onClick={clearDebugLogs} variant="ghost" size="sm">
            Clear Logs
          </Button>
        </div>
      </div>

      {isRunningTests && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Progress value={Math.random() * 100} className="flex-1" />
            <span className="text-sm text-gray-500">Running tests...</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="logs">Debug Logs</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {healthStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  System Status
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <Badge variant={getStatusColor(healthStatus.databaseConnection)}>
                      {getStatusIcon(healthStatus.databaseConnection)}
                      {healthStatus.databaseConnection ? 'Connected' : 'Failed'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tenant Schema</span>
                    <Badge variant={getStatusColor(healthStatus.leadsTableExists)}>
                      {getStatusIcon(healthStatus.leadsTableExists)}
                      {healthStatus.tenantSchema || 'Not Found'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Leads Table</span>
                    <Badge variant={getStatusColor(healthStatus.leadsTableExists)}>
                      {getStatusIcon(healthStatus.leadsTableExists)}
                      {healthStatus.leadsTableExists ? 'Exists' : 'Missing'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Triggers Active</span>
                    <Badge variant={getStatusColor(healthStatus.triggersActive)}>
                      {getStatusIcon(healthStatus.triggersActive)}
                      {healthStatus.triggersActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Last Operation</h4>
                {healthStatus.lastOperation ? (
                  <div className="text-sm space-y-1">
                    <p><strong>Operation:</strong> {healthStatus.lastOperation.operation}</p>
                    <p><strong>Status:</strong> 
                      <Badge variant={healthStatus.lastOperation.success ? "default" : "destructive"} className="ml-2">
                        {healthStatus.lastOperation.success ? 'Success' : 'Failed'}
                      </Badge>
                    </p>
                    <p><strong>Time:</strong> {new Date(healthStatus.lastOperation.timestamp).toLocaleTimeString()}</p>
                    {healthStatus.lastOperation.duration && (
                      <p><strong>Duration:</strong> {healthStatus.lastOperation.duration}ms</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No operations recorded</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          {Object.keys(testResults).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(testResults).map(([testName, result]) => (
                <Card key={testName} className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <Badge variant={getStatusColor(result as boolean)}>
                      {getStatusIcon(result as boolean)}
                      {result ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Debug Logs ({debugLogs.length})</h4>
            <Button onClick={clearDebugLogs} variant="outline" size="sm">
              Clear
            </Button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {debugLogs.map((log, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                        {log.operation}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      {log.duration && (
                        <span className="text-xs text-gray-400">
                          {log.duration}ms
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={JSON.stringify(log.data, null, 2)}
                      readOnly
                      className="h-20 font-mono text-xs"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Known Issues Analysis
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                <p><strong>Issue 1:</strong> New leads not appearing automatically</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Real-time subscriptions may not work with exec_sql</li>
                  <li>Cache invalidation might be insufficient</li>
                  <li>Timing issues with database commits</li>
                </ul>
                
                <p className="mt-4"><strong>Issue 2:</strong> Delete button changing status instead of deleting</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Database triggers may be intercepting DELETE operations</li>
                  <li>Row-level security policies might be blocking deletions</li>
                  <li>Soft delete triggers could be converting to status updates</li>
                </ul>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
