import React from 'react';
import { EnhancedSecurityDashboard } from '@/components/EnhancedSecurityDashboard';
import { SecurityMonitorPanel } from '@/components/SecurityMonitorPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SecurityContent() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="enhanced-dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enhanced-dashboard">Painel Avançado</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Atual</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced-dashboard" className="space-y-6">
          <EnhancedSecurityDashboard />
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <SecurityMonitorPanel />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="text-center text-muted-foreground">
            Configurações de segurança em breve...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
