
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Smartphone, WifiOff, Settings } from "lucide-react";

const ConnectionsPanel: React.FC = () => {
  const [connections] = useState([
    { 
      id: '1', 
      name: 'WhatsApp Principal', 
      phone: '+55 11 99999-9999', 
      status: 'disconnected', 
      lastSeen: '34 min atrás' 
    },
    { 
      id: '2', 
      name: 'teste1', 
      phone: null, 
      status: 'disconnected', 
      lastSeen: 'Nunca conectado' 
    }
  ]);

  const handleConnect = (id: string) => {
    console.log('Connecting:', id);
  };

  const handleSettings = (id: string) => {
    console.log('Settings for:', id);
  };

  const handleNewConnection = () => {
    console.log('Creating new connection');
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

      <div className="space-y-4">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              {/* Left side - Avatar and info */}
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{connection.name}</h3>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Smartphone className="h-4 w-4" />
                    <span>{connection.phone || 'Não configurado'}</span>
                  </div>
                  <p className="text-xs text-gray-400">{connection.lastSeen}</p>
                </div>
              </div>

              {/* Right side - Badge and buttons */}
              <div className="flex items-center space-x-3">
                <Badge 
                  className="bg-sky-50 text-sky-700 border-sky-200 rounded-full px-3 py-1 text-xs font-medium"
                >
                  Desconectado
                </Badge>
                
                <Button 
                  onClick={() => handleConnect(connection.id)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm"
                >
                  Conectar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleSettings(connection.id)}
                  className="border-gray-200 bg-white hover:bg-gray-50 h-9 w-9"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectionsPanel;
