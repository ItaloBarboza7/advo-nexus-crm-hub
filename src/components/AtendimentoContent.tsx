
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Search, Settings, Users, MessageCircle, Phone } from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  tag: string;
  initials: string;
  isActive?: boolean;
}

export function AtendimentoContent() {
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      name: 'Maria Santos',
      lastMessage: 'Olá, gostaria de saber mais sobre os serviços jurídicos...',
      time: '23:24',
      unread: 1,
      tag: 'suporte',
      initials: 'MS'
    },
    {
      id: '2',
      name: 'João Silva',
      lastMessage: 'Obrigado pelo atendimento!',
      time: '22:15',
      unread: 0,
      tag: 'vendas',
      initials: 'JS'
    }
  ]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Local Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold">WhatsApp Manager</h2>
            <Badge className="bg-green-100 text-green-800 border-green-200">Sistema Ativo</Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'connections' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('connections')}
            className="text-xs"
          >
            Conexões
          </Button>
          <Button
            variant={activeTab === 'chats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chats')}
            className="text-xs"
          >
            Chats
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="text-xs"
          >
            Configurações
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <Card className="flex h-[600px] overflow-hidden">
        {/* Left Column - Conversations */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-10 bg-muted/50"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button className="flex-1 px-4 py-3 text-sm font-medium text-primary border-b-2 border-primary bg-muted/30">
              Chats (1)
            </button>
            <button className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              Fila (1)
            </button>
            <button className="flex-1 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              Contatos (2)
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`flex items-center space-x-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation === conversation.id ? 'bg-muted border-r-2 border-primary' : ''
                }`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm truncate">{conversation.name}</h4>
                    <span className="text-xs text-muted-foreground">{conversation.time}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
                      {conversation.lastMessage}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs px-2 py-0 h-5"
                      >
                        {conversation.tag}
                      </Badge>
                      {conversation.unread > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          {conversation.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Chat Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-lg mb-1">Selecione uma conversa</h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma conversa da lista para começar a responder
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Conversas Ativas</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-muted-foreground">Números Conectados</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
