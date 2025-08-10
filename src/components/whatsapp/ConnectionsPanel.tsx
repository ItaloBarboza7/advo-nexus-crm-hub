
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Smartphone, Wifi, WifiOff, Plus } from "lucide-react";

const ConnectionsPanel: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);

  const handleNewConnection = () => {
    console.log('Creating new connection');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Conexões</h2>
        <Button onClick={handleNewConnection} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nova Conexão</span>
        </Button>
      </div>

      <Card className="border border-gray-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">WhatsApp Business</h3>
                <p className="text-sm text-gray-500">+55 11 99999-9999</p>
              </div>
            </div>
            
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className={isConnected ? "bg-green-100 text-green-800 border-green-200" : ""}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">98%</p>
              <p className="text-sm text-gray-500">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">24h</p>
              <p className="text-sm text-gray-500">Online</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-sm text-gray-500">Mensagens hoje</p>
            </div>
          </div>

          {isConnected ? (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center mb-4">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Escaneie o QR Code com seu WhatsApp
              </p>
              <p className="text-xs text-gray-500">
                1. Abra o WhatsApp no seu celular<br/>
                2. Toque em Mais opções → Dispositivos conectados<br/>
                3. Toque em Conectar um dispositivo<br/>
                4. Aponte seu celular para esta tela
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionsPanel;
