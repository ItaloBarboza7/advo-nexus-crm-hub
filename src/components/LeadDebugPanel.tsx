
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Bug, Wrench, List, AlertTriangle } from 'lucide-react';
import { useLeadDebugger } from '@/hooks/useLeadDebugger';

export function LeadDebugPanel() {
  const [leadName, setLeadName] = useState('barboza2');
  const [orphanedLeads, setOrphanedLeads] = useState<any[]>([]);
  const { debugInfo, isDebugging, debugLead, fixOrphanedLead, listOrphanedLeads } = useLeadDebugger();

  const handleDebugLead = async () => {
    if (!leadName.trim()) return;
    await debugLead(leadName.trim());
  };

  const handleFixLead = async () => {
    if (!leadName.trim()) return;
    const success = await fixOrphanedLead(leadName.trim());
    if (success) {
      await debugLead(leadName.trim()); // Re-debug to show updated info
    }
  };

  const handleListOrphaned = async () => {
    const leads = await listOrphanedLeads();
    setOrphanedLeads(leads);
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Lead Debugger</h3>
      </div>

      {/* Debug específico do lead */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome do lead (ex: barboza2)"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleDebugLead} disabled={isDebugging}>
            <Search className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button onClick={handleFixLead} disabled={isDebugging} variant="outline">
            <Wrench className="h-4 w-4 mr-2" />
            Corrigir
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={debugInfo.leadExists ? "default" : "destructive"}>
                {debugInfo.leadExists ? "LEAD EXISTE" : "LEAD NÃO EXISTE"}
              </Badge>
              {debugInfo.leadExists && (
                <Badge variant={debugInfo.columnExists ? "default" : "destructive"}>
                  {debugInfo.columnExists ? "COLUNA EXISTE" : "COLUNA NÃO EXISTE"}
                </Badge>
              )}
            </div>

            {debugInfo.leadExists && debugInfo.leadData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Dados do Lead:</h4>
                  <Textarea
                    value={formatJson(debugInfo.leadData)}
                    readOnly
                    className="h-32 font-mono text-xs"
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Dados da Coluna:</h4>
                  <Textarea
                    value={formatJson(debugInfo.columnData || "Coluna não encontrada")}
                    readOnly
                    className="h-32 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {debugInfo.statusHistory && debugInfo.statusHistory.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Histórico de Status (últimos 10):</h4>
                <div className="space-y-1">
                  {debugInfo.statusHistory.map((entry, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      <span className="font-mono">
                        {entry.old_status || 'NULL'} → {entry.new_status}
                      </span>
                      <span className="ml-2 text-gray-500">
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugInfo.schemaInfo && (
              <div>
                <h4 className="font-medium mb-2">Informações do Esquema:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Schema:</strong> {debugInfo.schemaInfo.schema}</p>
                  <p><strong>Total de Colunas:</strong> {debugInfo.schemaInfo.totalColumns}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {debugInfo.schemaInfo.columns?.map((col: any) => (
                      <Badge key={col.id} variant="outline" className="text-xs">
                        {col.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de leads órfãos */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Leads Órfãos
          </h4>
          <Button onClick={handleListOrphaned} disabled={isDebugging} variant="outline" size="sm">
            <List className="h-4 w-4 mr-2" />
            Listar
          </Button>
        </div>

        {orphanedLeads.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Encontrados {orphanedLeads.length} leads com status inválido:
            </p>
            {orphanedLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between bg-red-50 p-2 rounded">
                <div className="text-sm">
                  <strong>{lead.name}</strong> - Status: "{lead.status}"
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setLeadName(lead.name);
                    fixOrphanedLead(lead.name);
                  }}
                >
                  Corrigir
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
