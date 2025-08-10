
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Users, Bell, Shield, Save } from "lucide-react";
import UserManagement from './UserManagement';

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState({
    autoAssign: true,
    notifications: true,
    workingHours: true,
    maxChatsPerUser: '5',
    responseTimeout: '30',
    welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
    awayMessage: 'No momento estamos fora do horário de atendimento. Retornaremos em breve.',
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    console.log('Saving settings:', settings);
    // Here you would save to your backend
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <Button onClick={handleSaveSettings} className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          <span>Salvar Alterações</span>
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Segurança</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Atendimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-assign">Atribuição Automática</Label>
                  <Switch
                    id="auto-assign"
                    checked={settings.autoAssign}
                    onCheckedChange={(checked) => handleSettingChange('autoAssign', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="working-hours">Horário Comercial</Label>
                  <Switch
                    id="working-hours"
                    checked={settings.workingHours}
                    onCheckedChange={(checked) => handleSettingChange('workingHours', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-chats">Máximo de Chats por Usuário</Label>
                  <Select
                    value={settings.maxChatsPerUser}
                    onValueChange={(value) => handleSettingChange('maxChatsPerUser', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 chats</SelectItem>
                      <SelectItem value="5">5 chats</SelectItem>
                      <SelectItem value="10">10 chats</SelectItem>
                      <SelectItem value="unlimited">Ilimitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout de Resposta (minutos)</Label>
                  <Input
                    id="timeout"
                    value={settings.responseTimeout}
                    onChange={(e) => handleSettingChange('responseTimeout', e.target.value)}
                    type="number"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagens Automáticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="welcome">Mensagem de Boas-vindas</Label>
                  <Input
                    id="welcome"
                    value={settings.welcomeMessage}
                    onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="away">Mensagem Fora do Horário</Label>
                  <Input
                    id="away"
                    value={settings.awayMessage}
                    onChange={(e) => handleSettingChange('awayMessage', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notificações Ativas</Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sound">Sons de Notificação</Label>
                <Switch id="sound" />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="desktop">Notificações Desktop</Label>
                <Switch id="desktop" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="two-factor">Autenticação de Dois Fatores</Label>
                <Switch id="two-factor" />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="session-timeout">Timeout de Sessão</Label>
                <Switch id="session-timeout" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backup">Backup Automático</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="disabled">Desabilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
