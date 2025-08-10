
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Smartphone, Wifi, WifiOff, RefreshCw } from "lucide-react";

const ConnectionsPanel: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleReconnect = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Conexões WhatsApp</h2>
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          className={isConnected ? "bg-green-100 text-green-800" : ""}
        >
          {isConnected ? "Conectado" : "Desconectado"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <span>Status da Conexão</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Número conectado:</span>
              <span className="font-medium">+55 11 99999-9999</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Última sincronização:</span>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleString('pt-BR')}
              </span>
            </div>
            
            <div className="flex space-x-2 pt-4">
              {isConnected ? (
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  className="flex-1"
                >
                  Desconectar
                </Button>
              ) : (
                <Button 
                  onClick={handleReconnect}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Reconectar
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5" />
              <span>QR Code</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div className="text-center py-8">
                <Smartphone className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  WhatsApp já está conectado
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-gray-600">Dispositivo Conectado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wifi className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">98%</p>
                <p className="text-sm text-gray-600">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">24h</p>
                <p className="text-sm text-gray-600">Última Reconexão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectionsPanel;
