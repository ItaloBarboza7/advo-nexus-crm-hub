
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { whatsappGateway, type GatewayConnection, type GatewayEvent } from "@/integrations/whatsapp/gateway";
import { useToast } from "@/hooks/use-toast";
import QRCode from 'qrcode';

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
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrUpdateCount, setQrUpdateCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const streamRef = useRef<{ close: () => void } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const forceResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to track current state values and prevent stale closures
  const hasQrRef = useRef(false);
  const connectedRef = useRef(false);
  const reopenAfterRestartRef = useRef<NodeJS.Timeout | null>(null);
  const reopenAfterForceResetRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setCreating(false);
      setConnection(null);
      setStatus('Aguardando ação');
      setQrData(null);
      setQrImageUrl(null);
      setQrUpdateCount(0);
      setConnected(false);
      setStreamError(null);
      setReloading(false);
      
      // Reset refs
      hasQrRef.current = false;
      connectedRef.current = false;
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Clear auto-recovery timers
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (forceResetTimerRef.current) {
        clearTimeout(forceResetTimerRef.current);
        forceResetTimerRef.current = null;
      }
      
      // Clear reopen timers
      if (reopenAfterRestartRef.current) {
        clearTimeout(reopenAfterRestartRef.current);
        reopenAfterRestartRef.current = null;
      }
      if (reopenAfterForceResetRef.current) {
        clearTimeout(reopenAfterForceResetRef.current);
        reopenAfterForceResetRef.current = null;
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
      
      // Clear auto-recovery timers
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (forceResetTimerRef.current) {
        clearTimeout(forceResetTimerRef.current);
        forceResetTimerRef.current = null;
      }
      
      // Clear reopen timers
      if (reopenAfterRestartRef.current) {
        clearTimeout(reopenAfterRestartRef.current);
        reopenAfterRestartRef.current = null;
      }
      if (reopenAfterForceResetRef.current) {
        clearTimeout(reopenAfterForceResetRef.current);
        reopenAfterForceResetRef.current = null;
      }
    }
  }, [open]);

  // Se veio com uma conexão já existente, iniciamos o flow de reconexão
  useEffect(() => {
    if (!open) return;
    if (!initialConnectionId) return;

    const initializeReconnection = async () => {
      setCreating(false);
      setStatus('Preparando conexão existente...');
      setStreamError(null);
      
      // Preencher meta da conexão (para exibir nome)
      setConnection({ id: initialConnectionId, name: 'Reconectando...', status: 'connecting' });
      
      try {
        // Tentar conectar via gateway (mas não falhar se não funcionar)
        setStatus('Iniciando conexão no gateway...');
        await whatsappGateway.connect(initialConnectionId);
        setStatus('Gateway conectado, aguardando QR...');
      } catch (error) {
        console.warn('[NewConnectionDialog] ⚠️ Connect error (expected for existing connections), proceeding with QR stream:', error);
        setStatus('Conectando diretamente ao QR (modo compatibilidade)...');
      }
      
      // Sempre tenta abrir o stream de QR, independente do resultado do connect
      setStatus('Abrindo stream de QR para conexão existente...');
      startQrStream(initialConnectionId);
    };

    initializeReconnection();

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        if (forceResetTimerRef.current) {
          clearTimeout(forceResetTimerRef.current);
          forceResetTimerRef.current = null;
        }
        if (reopenAfterRestartRef.current) {
          clearTimeout(reopenAfterRestartRef.current);
          reopenAfterRestartRef.current = null;
        }
        if (reopenAfterForceResetRef.current) {
          clearTimeout(reopenAfterForceResetRef.current);
          reopenAfterForceResetRef.current = null;
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConnectionId]);
  
  // Sync refs with state changes
  useEffect(() => {
    hasQrRef.current = !!qrData;
  }, [qrData]);
  
  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  // Auto-recovery logic: implement timeouts and auto-restart
  useEffect(() => {
    if (!connection?.id && !initialConnectionId) return;
    if (connected || creating) return;
    if (qrData) return; // Don't schedule auto-recovery if QR is already present
    
    const connectionId = connection?.id || initialConnectionId;
    if (!connectionId) return;

    // Set 30 second timeout for restart attempt
    const restartTimeout = setTimeout(async () => {
      if (!qrData && !streamError && !connected) {
        console.log('[NewConnectionDialog] 🔄 No QR after 30s, attempting restart...');
        setStatus('Sem QR após 30s, tentando reiniciar...');
        try {
          await whatsappGateway.restartConnection(connectionId);
          setStatus('Reiniciado, aguardando novo QR...');
          // Re-open QR stream after restart - only if we still don't have QR
          reopenAfterRestartRef.current = setTimeout(() => {
            if (!hasQrRef.current && !connectedRef.current) {
              console.log('[NewConnectionDialog] 🔄 Executing delayed restart QR stream...');
              startQrStream(connectionId, true); // Mark as automatic recovery
            } else {
              console.log('[NewConnectionDialog] ✅ Skip reopen: QR present or connected');
            }
            reopenAfterRestartRef.current = null;
          }, 2000);
        } catch (error) {
          console.warn('[NewConnectionDialog] ⚠️ Restart failed:', error);
        }
      }
    }, 30000);
    restartTimerRef.current = restartTimeout;

    // Set 60 second timeout for force reset
    const forceResetTimeout = setTimeout(async () => {
      if (!qrData && !streamError && !connected) {
        console.log('[NewConnectionDialog] 💥 No QR after 60s, attempting force reset...');
        setStatus('Sem QR após 60s, forçando reset da sessão...');
        try {
          const result = await whatsappGateway.forceResetConnection(connectionId);
          if (result.success) {
            setStatus('Sessão resetada, reconectando...');
            // Re-open QR stream after force reset - only if we still don't have QR
            reopenAfterForceResetRef.current = setTimeout(() => {
              if (!hasQrRef.current && !connectedRef.current) {
                console.log('[NewConnectionDialog] 🔄 Executing delayed force reset QR stream...');
                startQrStream(connectionId, true); // Mark as automatic recovery
              } else {
                console.log('[NewConnectionDialog] ✅ Skip reopen: QR present or connected');
              }
              reopenAfterForceResetRef.current = null;
            }, 3000);
          } else {
            setStatus(`Reset parcial: ${result.message}`);
          }
        } catch (error) {
          console.warn('[NewConnectionDialog] ⚠️ Force reset failed:', error);
          setStatus('Force reset falhou, tente manualmente');
        }
      }
    }, 60000);
    forceResetTimerRef.current = forceResetTimeout;

    // Cleanup timeouts if component unmounts or conditions change
    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (forceResetTimerRef.current) {
        clearTimeout(forceResetTimerRef.current);
        forceResetTimerRef.current = null;
      }
      if (reopenAfterRestartRef.current) {
        clearTimeout(reopenAfterRestartRef.current);
        reopenAfterRestartRef.current = null;
      }
      if (reopenAfterForceResetRef.current) {
        clearTimeout(reopenAfterForceResetRef.current);
        reopenAfterForceResetRef.current = null;
      }
    };
  }, [connection?.id, initialConnectionId, qrData, streamError, connected, creating]);

  const startQrStream = (connectionId: string, isAutomaticRecovery = false) => {
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
    
    // Only clear QR data for user-initiated actions, not automatic recovery
    if (!isAutomaticRecovery) {
      setQrData(null);
      setQrImageUrl(null);
    }
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
      } catch (connectError) {
        console.warn('[NewConnectionDialog] ⚠️ Connect after create error, proceeding with QR stream:', connectError);
        setStatus('Conectando direto ao QR...');
      }
      
      // Sempre tenta abrir o stream de QR, independente do resultado do connect
      startQrStream(conn.id);
    } catch (e: any) {
      console.error('[NewConnectionDialog] ❌ createConnection error', e);
      setStreamError(`Erro ao criar conexão: ${e?.message ?? 'Falha inesperada'}`);
      setStatus('Falha ao criar conexão');
      toast({ title: 'Erro ao criar conexão', description: e?.message ?? 'Falha inesperada', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleGatewayEvent = async (evt: GatewayEvent) => {
    console.log('[NewConnectionDialog] GatewayEvent:', evt.type, evt.data ? '(with data)' : '(no data)');
    
    // Handle "session active" or "already connected" messages
    if (evt.type === 'status' && evt.data) {
      const message = String(evt.data).toLowerCase();
      if (message.includes('session active') || message.includes('already connected') || message.includes('session exists')) {
        console.log('[NewConnectionDialog] 🔥 Detected stuck session, suggesting force reset');
        setStatus('Sessão existente detectada. Use "Forçar reset da sessão" se necessário.');
        setStreamError('Sessão pode estar travada - tente force reset');
        return;
      }
    }
    
    // Debug: show raw messages in status for diagnosis
    if (evt.type === 'status' && evt.data) {
      const rawMessage = String(evt.data).substring(0, 150);
      console.log('[NewConnectionDialog] 🐛 Raw SSE data preview:', rawMessage);
    }
    
    if (evt.type === 'qr') {
      // CRITICAL: Set hasQrRef IMMEDIATELY to prevent race conditions
      hasQrRef.current = true;
      
      // Clear timeout when QR is received
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Clear auto-recovery timers when QR is successfully received
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared restart timer - QR received');
      }
      if (forceResetTimerRef.current) {
        clearTimeout(forceResetTimerRef.current);
        forceResetTimerRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared force reset timer - QR received');
      }
      
      // Clear reopen timers when QR is received
      if (reopenAfterRestartRef.current) {
        clearTimeout(reopenAfterRestartRef.current);
        reopenAfterRestartRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared reopen after restart timer - QR received');
      }
      if (reopenAfterForceResetRef.current) {
        clearTimeout(reopenAfterForceResetRef.current);
        reopenAfterForceResetRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared reopen after force reset timer - QR received');
      }
      
      let rawQrData = String(evt.data);
      console.log('[NewConnectionDialog] 📱 QR received, length:', rawQrData.length, 'first 50 chars:', rawQrData.substring(0, 50));
      
      // Additional JSON parsing check (safety net)
      try {
        const parsed = JSON.parse(rawQrData);
        const extractedQr = parsed.qr || parsed.qr_code || parsed.qrcode || parsed.qrCode || parsed.code;
        if (extractedQr && typeof extractedQr === 'string') {
          console.log('[NewConnectionDialog] 🔧 Found QR in JSON, extracting...');
          rawQrData = extractedQr;
        }
      } catch (e) {
        // Not JSON, continue with original data
        console.log('[NewConnectionDialog] ℹ️ QR data is not JSON (expected for extracted values)');
      }
      
      // Sanitize QR data (remove quotes if present, trim whitespace)
      const sanitizedQrData = rawQrData.trim().replace(/^"(.*)"$/, '$1');
      console.log('[NewConnectionDialog] 🧹 Final QR - length:', sanitizedQrData.length, 'starts with 2@:', sanitizedQrData.startsWith('2@'));
      
      setQrData(sanitizedQrData);
      setQrUpdateCount(prev => {
        const newCount = prev + 1;
        console.log('[NewConnectionDialog] 🔄 QR update count:', newCount);
        if (newCount > 1) {
          setStatus(`QR Code atualizado (#${newCount})! Escaneie no seu WhatsApp`);
        } else {
          setStatus('QR Code recebido! Escaneie no seu WhatsApp');
        }
        return newCount;
      });
      
      // Validate QR format
      if (!sanitizedQrData.startsWith('2@') && sanitizedQrData.length < 50) {
        console.warn('[NewConnectionDialog] ⚠️ QR format unexpected - may not be WhatsApp QR');
        setStatus('QR recebido, mas formato pode estar incorreto. Tente escanear ou recarregar.');
      }
      
      try {
        // Check if it's already a base64 image
        if (sanitizedQrData.startsWith('data:image')) {
          console.log('[NewConnectionDialog] ℹ️ QR is already base64 image');
          setQrImageUrl(sanitizedQrData);
        } else {
          // Generate QR code locally with proper parameters for WhatsApp
          console.log('[NewConnectionDialog] 🏭 Generating QR locally with optimal settings');
          const qrUrl = await QRCode.toDataURL(sanitizedQrData, {
            errorCorrectionLevel: 'M',  // Medium error correction - ideal for WhatsApp
            margin: 4,                  // Good margin for camera focus
            width: 320,                 // High resolution but not too heavy
            color: {
              dark: '#000000',          // Pure black for better contrast
              light: '#FFFFFF'          // Pure white background
            }
          });
          setQrImageUrl(qrUrl);
          console.log('[NewConnectionDialog] ✅ QR generated successfully, size:', qrUrl.length, 'chars');
        }
      } catch (error) {
        console.error('[NewConnectionDialog] ❌ Failed to generate QR locally:', error);
        setStreamError('Erro ao gerar QR Code');
        setStatus('Erro na geração do QR - tente recarregar');
      }
      
      setStreamError(null);
      console.log('[NewConnectionDialog] ✅ QR processing complete');
    } else if (evt.type === 'status') {
      setStatus(String(evt.data ?? 'Atualizando...'));
    } else if (evt.type === 'connected') {
      // CRITICAL: Set connectedRef IMMEDIATELY to prevent race conditions
      connectedRef.current = true;
      
      // Clear timeout when connected
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Clear auto-recovery timers when connected
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared restart timer - connected');
      }
      if (forceResetTimerRef.current) {
        clearTimeout(forceResetTimerRef.current);
        forceResetTimerRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared force reset timer - connected');
      }
      
      // Clear reopen timers when connected
      if (reopenAfterRestartRef.current) {
        clearTimeout(reopenAfterRestartRef.current);
        reopenAfterRestartRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared reopen after restart timer - connected');
      }
      if (reopenAfterForceResetRef.current) {
        clearTimeout(reopenAfterForceResetRef.current);
        reopenAfterForceResetRef.current = null;
        console.log('[NewConnectionDialog] ✅ Cleared reopen after force reset timer - connected');
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
    // Priority: use locally generated QR image
    if (qrImageUrl) return qrImageUrl;
    
    // Fallback: if we have raw QR data but no local image yet, show placeholder
    if (qrData && !qrImageUrl) {
      console.log('[NewConnectionDialog] ⚠️ QR data exists but no local image generated yet');
      return null;
    }
    
    return null;
  }, [qrImageUrl, qrData]);

  const hasError = !!streamError;
  const isLoading = !qrData && !hasError && !connected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialConnectionId ? 'Conectar WhatsApp Existente' : 'Nova Conexão WhatsApp'}
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
                {connection?.name ?? (initialConnectionId ? 'Conexão existente' : 'Nova conexão')}
              </div>
              <Badge variant="secondary" className="rounded-full">
                {connected ? 'Conectado' : hasError ? 'Erro' : isLoading ? 'Carregando QR' : 'QR pronto'}
              </Badge>
            </div>

            <div className="flex flex-col items-center gap-3">
              {qrImageSrc && !hasError ? (
                <img
                  src={qrImageSrc}
                  alt="QR Code para WhatsApp"
                  className="w-[320px] h-[320px] rounded-md border shadow-sm"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              ) : (
                <div className="w-[320px] h-[320px] max-w-full rounded-md border flex items-center justify-center text-sm text-muted-foreground">
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
