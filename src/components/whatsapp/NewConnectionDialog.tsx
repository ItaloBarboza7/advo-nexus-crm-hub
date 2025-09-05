
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { whatsappGateway, type GatewayConnection, type GatewayEvent } from "@/integrations/whatsapp/gateway";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected?: (conn: GatewayConnection) => void;
  // Se informado, usa conexão existente para reconectar/mostrar QR, pulando criação
  initialConnectionId?: string;
};

const NewConnectionDialog: React.FC<Props> = ({ open, onOpenChange, onConnected, initialConnectionId }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [connection, setConnection] = useState<GatewayConnection | null>(null);
  const [status, setStatus] = useState<string>('Aguardando ação');
  const [qrData, setQrData] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const streamRef = useRef<{ close: () => void } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setCreating(false);
      setConnection(null);
      setStatus('Aguardando ação');
      setQrData(null);
      setConnected(false);
      setStreamError(null);
      setReloading(false);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [open]);

  // Se veio com uma conexão já existente, iniciamos o flow de reconexão
  useEffect(() => {
    if (!open) return;
    if (!initialConnectionId) return;

    const initializeReconnection = async () => {
      setCreating(false);
      setStatus('Iniciando conexão...');
      setStreamError(null);
      
      // Preencher meta da conexão (para exibir nome)
      setConnection({ id: initialConnectionId, name: 'Conexão', status: 'connecting' });
      
      try {
        // Primeiro conectar via gateway
        await whatsappGateway.connect(initialConnectionId);
        setStatus('Aguardando QR...');
        
        // Depois abrir o stream de QR
        startQrStream(initialConnectionId);
      } catch (error) {
        console.error('[NewConnectionDialog] ❌ Connect error:', error);
        setStreamError(`Erro ao conectar: ${error instanceof Error ? error.message : 'Falha inesperada'}`);
        setStatus('Falha ao conectar');
      }
    };

    initializeReconnection();

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConnectionId]);

  const startQrStream = (connectionId: string) => {
    // Close any existing stream
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setQrData(null);
    setStreamError(null);
    setReloading(false);
    setStatus('Conectando ao stream de QR...');
    
    // Set timeout for QR loading (aumentado para 60 segundos)
    timeoutRef.current = setTimeout(() => {
      if (!qrData && !streamError) {
        console.warn('[NewConnectionDialog] ⏰ QR stream timeout after 60s');
        setStreamError('QR code não carregou em 60 segundos');
        setStatus('Timeout: Tente recarregar o QR ou verificar /_debug/peek-qr');
      }
    }, 60000); // 60 seconds timeout
    
    const stream = whatsappGateway.openQrStream(connectionId, handleGatewayEvent);
    streamRef.current = stream;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Informe um nome', description: 'Dê um nome para identificar esta conexão.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    setStatus('Criando conexão...');
    setStreamError(null);
    
    try {
      const conn = await whatsappGateway.createConnection(name.trim());
      setConnection(conn);
      setStatus('Inicializando conexão...');
      
      try {
        // Conectar via gateway antes de abrir o stream
        await whatsappGateway.connect(conn.id);
        setStatus('Aguardando QR...');
        startQrStream(conn.id);
      } catch (connectError) {
        console.error('[NewConnectionDialog] ❌ Connect after create error:', connectError);
        setStreamError(`Erro ao conectar: ${connectError instanceof Error ? connectError.message : 'Falha inesperada'}`);
        setStatus('Falha ao conectar após criação');
      }
    } catch (e: any) {
      console.error('[NewConnectionDialog] ❌ createConnection error', e);
      setStreamError(`Erro ao criar conexão: ${e?.message ?? 'Falha inesperada'}`);
      setStatus('Falha ao criar conexão');
      toast({ title: 'Erro ao criar conexão', description: e?.message ?? 'Falha inesperada', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleGatewayEvent = (evt: GatewayEvent) => {
    console.log('[NewConnectionDialog] GatewayEvent:', evt.type, evt.data ? '(with data)' : '(no data)');
    
    // Debug: mostrar primeiras mensagens cruas no status para facilitar diagnóstico
    if (evt.type === 'status' && evt.data) {
      const rawMessage = String(evt.data).substring(0, 150);
      console.log('[NewConnectionDialog] 🐛 Raw SSE data preview:', rawMessage);
    }
    
    if (evt.type === 'qr') {
      // Clear timeout when QR is received
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setQrData(evt.data);
      setStatus('QR Code recebido! Escaneie no seu WhatsApp');
      setStreamError(null);
      console.log('[NewConnectionDialog] ✅ QR code received and set');
    } else if (evt.type === 'status') {
      setStatus(String(evt.data ?? 'Atualizando...'));
    } else if (evt.type === 'connected') {
      // Clear timeout when connected
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setConnected(true);
      setStatus('Conectado com sucesso!');
      setStreamError(null);
      toast({ title: 'Conexão ativa', description: 'O WhatsApp foi conectado.' });
      if (connection && onConnected) onConnected({ ...connection, status: 'connected' });
      // Fecha em alguns segundos para UX suave
      setTimeout(() => onOpenChange(false), 900);
    } else if (evt.type === 'disconnected') {
      setConnected(false);
      setStatus('Desconectado');
    } else if (evt.type === 'error') {
      setStreamError(String(evt.data ?? 'Erro no stream'));
      setStatus('Erro no stream de QR');
      console.error('[NewConnectionDialog] ❌ Stream error:', evt.data);
    }
  };

  const handleReloadQr = () => {
    if (connection) {
      setReloading(true);
      console.log('[NewConnectionDialog] 🔄 Reloading QR for connection:', connection.id);
      startQrStream(connection.id);
    } else if (initialConnectionId) {
      setReloading(true);
      console.log('[NewConnectionDialog] 🔄 Reloading QR for initial connection:', initialConnectionId);
      startQrStream(initialConnectionId);
    }
  };

  const qrImageSrc = useMemo(() => {
    if (!qrData) return null;
    if (qrData.startsWith('data:image')) return qrData;
    // Fallback: gerar QR por serviço externo se vier apenas o texto
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}`;
  }, [qrData]);

  const hasError = !!streamError;
  const isLoading = !qrData && !hasError && !connected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialConnectionId ? 'Conectar dispositivo' : 'Nova Conexão WhatsApp'}
          </DialogTitle>
        </DialogHeader>

        {!connection && !initialConnectionId && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conn-name">Nome da Conexão</Label>
              <Input
                id="conn-name"
                placeholder="Ex.: WhatsApp Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar e mostrar QR
              </Button>
            </DialogFooter>
          </div>
        )}

        {(connection || initialConnectionId) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {connection?.name ?? 'Conexão'}
              </div>
              <Badge variant="secondary" className="rounded-full">
                {connected ? 'Conectado' : hasError ? 'Erro' : isLoading ? 'Carregando' : 'Aguardando conexão'}
              </Badge>
            </div>

            <div className="flex flex-col items-center gap-3">
              {qrImageSrc && !hasError ? (
                <img
                  src={qrImageSrc}
                  alt="QR Code"
                  className="w-60 h-60 rounded-md border"
                />
              ) : (
                <div className="w-60 h-60 rounded-md border flex items-center justify-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    {hasError ? (
                      <>
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <div className="text-center text-red-600">
                          <div className="font-medium">QR code não carregou</div>
                          <div className="text-xs mt-1 text-muted-foreground">
                            {streamError}
                          </div>
                        </div>
                      </>
                    ) : isLoading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span>Carregando QR...</span>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground text-center">
                {status}
              </div>
            </div>

            <DialogFooter className="gap-2">
              {(hasError || (!qrData && !isLoading)) && (
                <Button variant="outline" onClick={handleReloadQr} disabled={reloading}>
                  {reloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Recarregar QR
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewConnectionDialog;
