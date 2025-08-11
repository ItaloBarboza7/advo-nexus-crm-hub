
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
  const streamRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setCreating(false);
      setConnection(null);
      setStatus('Aguardando ação');
      setQrData(null);
      setConnected(false);
    } else {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    }
  }, [open]);

  // Se veio com uma conexão já existente, iniciamos o stream direto
  useEffect(() => {
    if (!open) return;
    if (!initialConnectionId) return;

    setCreating(false);
    setStatus('Abrindo stream de QR...');
    // Como estamos reconectando, não precisamos do name.
    const stream = whatsappGateway.openQrStream(initialConnectionId, handleGatewayEvent);
    streamRef.current = stream;
    // Preencher meta da conexão (para exibir nome)
    setConnection({ id: initialConnectionId, name: 'Conexão', status: 'connecting' });

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConnectionId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Informe um nome', description: 'Dê um nome para identificar esta conexão.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    setStatus('Criando conexão...');
    try {
      const conn = await whatsappGateway.createConnection(name.trim());
      setConnection(conn);
      setStatus('Aguardando QR...');
      const stream = whatsappGateway.openQrStream(conn.id, handleGatewayEvent);
      streamRef.current = stream;
    } catch (e: any) {
      console.error('createConnection error', e);
      toast({ title: 'Erro ao criar conexão', description: e?.message ?? 'Falha inesperada', variant: 'destructive' });
      setStatus('Falha ao criar conexão');
    } finally {
      setCreating(false);
    }
  };

  const handleGatewayEvent = (evt: GatewayEvent) => {
    // console.log('GatewayEvent', evt);
    if (evt.type === 'qr') {
      setQrData(evt.data);
      setStatus('Escaneie o QR no seu WhatsApp');
    } else if (evt.type === 'status') {
      setStatus(String(evt.data ?? 'Atualizando...'));
    } else if (evt.type === 'connected') {
      setConnected(true);
      setStatus('Conectado com sucesso!');
      toast({ title: 'Conexão ativa', description: 'O WhatsApp foi conectado.' });
      if (connection && onConnected) onConnected({ ...connection, status: 'connected' });
      // Fecha em alguns segundos para UX suave
      setTimeout(() => onOpenChange(false), 900);
    } else if (evt.type === 'disconnected') {
      setConnected(false);
      setStatus('Desconectado');
    } else if (evt.type === 'error') {
      setStatus('Erro no stream');
    }
  };

  const qrImageSrc = useMemo(() => {
    if (!qrData) return null;
    if (qrData.startsWith('data:image')) return qrData;
    // Fallback: gerar QR por serviço externo se vier apenas o texto
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}`;
  }, [qrData]);

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
                {connected ? 'Conectado' : 'Aguardando conexão'}
              </Badge>
            </div>

            <div className="flex flex-col items-center gap-3">
              {qrImageSrc ? (
                <img
                  src={qrImageSrc}
                  alt="QR Code"
                  className="w-60 h-60 rounded-md border"
                />
              ) : (
                <div className="w-60 h-60 rounded-md border flex items-center justify-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando QR...
                  </div>
                </div>
              )}
              <div className="text-sm text-muted-foreground text-center">
                {status}
              </div>
            </div>

            <DialogFooter className="gap-2">
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
