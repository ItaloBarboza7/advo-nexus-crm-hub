
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Settings, MessageSquare, Bell, Save, Plus, Edit, Trash2 } from "lucide-react";

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

  const [quickReplies, setQuickReplies] = useState([
    { id: 1, shortcut: 'ola', message: 'Olá! Como posso ajudá-lo hoje?' },
    { id: 2, shortcut: 'obrigado', message: 'Obrigado pelo contato! Tenha um ótimo dia!' },
    { id: 3, shortcut: 'aguarde', message: 'Por favor, aguarde um momento enquanto verifico isso para você.' },
  ]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    console.log('Saving settings:', settings);
  };

  const handleAddQuickReply = () => {
    const newReply = {
      id: Date.now(),
      shortcut: '',
      message: ''
    };
    setQuickReplies([...quickReplies, newReply]);
  };

  const handleDeleteQuickReply = (id: number) => {
    setQuickReplies(quickReplies.filter(reply => reply.id !== id));
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

      <Tabs defaultValue="quick-replies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-replies" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Respostas Rápidas</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="auto-messages" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Mensagens Automáticas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-replies" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Respostas Rápidas</h3>
            <Button onClick={handleAddQuickReply} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Resposta
            </Button>
          </div>
          
          <div className="space-y-4">
            {quickReplies.map((reply) => (
              <Card key={reply.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-3">
                      <Label className="text-sm font-medium">Atalho</Label>
                      <Input 
                        placeholder="Ex: ola"
                        value={reply.shortcut}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-8">
                      <Label className="text-sm font-medium">Mensagem</Label>
                      <Textarea 
                        placeholder="Digite a mensagem..."
                        value={reply.message}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-1 flex items-end space-x-1">
                      <Button variant="ghost" size="sm" className="p-2">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-2 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteQuickReply(reply.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="auto-messages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Automáticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="welcome"
                  value={settings.welcomeMessage}
                  onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="away">Mensagem Fora do Horário</Label>
                <Textarea
                  id="away"
                  value={settings.awayMessage}
                  onChange={(e) => handleSettingChange('awayMessage', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
