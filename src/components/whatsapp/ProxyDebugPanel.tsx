
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

const ProxyDebugPanel: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5" />
          Configuração de Conexão
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sistema configurado para comunicação direta com o servidor WhatsApp
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">✅ Conexão Direta Ativa</h3>
          <div className="text-blue-700 text-sm space-y-1">
            <p>• Servidor: https://evojuris-whatsapp.onrender.com</p>
            <p>• Autenticação: Bearer Token configurado</p>
            <p>• Sem proxy intermediário para máxima performance</p>
            <p>• SSE implementado via fetch para streams de QR code</p>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground p-3 bg-gray-50 rounded-lg">
          <strong>Nota:</strong> O painel de debug avançado foi simplificado pois agora utilizamos 
          conexão direta com o servidor Render, eliminando a necessidade de proxy Supabase.
        </div>
      </CardContent>
    </Card>
  );
};

export default ProxyDebugPanel;
