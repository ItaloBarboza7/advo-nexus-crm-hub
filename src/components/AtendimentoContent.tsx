
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Users, Settings, Phone, Wifi, Search } from "lucide-react";
import ChatsList from "./whatsapp/ChatsList";
import QueueList from "./whatsapp/QueueList";
import ContactsList from "./whatsapp/ContactsList";
import ChatWindow from "./whatsapp/ChatWindow";
import ConnectionsPanel from "./whatsapp/ConnectionsPanel";
import SettingsPanel from "./whatsapp/SettingsPanel";
import { Chat, User, Contact, Message } from "./whatsapp/types";
import { useToast } from "@/hooks/use-toast";
import "./whatsapp/scope.css";

export function AtendimentoContent() {
  const [activeView, setActiveView] = useState<'chats' | 'connections' | 'settings'>('chats');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser] = useState<User>({
    id: '1',
    name: 'Usuário Admin',
    email: 'admin@empresa.com',
    department: 'Atendimento',
    isOnline: true
  });
  const { toast } = useToast();

  // Mock data initialization
  useEffect(() => {
    const mockChats: Chat[] = [
      {
        id: '1',
        contact: { id: '1', name: 'João Silva', phone: '+5511999999999' },
        messages: [
          {
            id: '1',
            text: 'Olá, preciso de ajuda com meu pedido',
            timestamp: new Date(),
            isFromMe: false,
            status: 'read'
          }
        ],
        lastMessage: {
          id: '1',
          text: 'Olá, preciso de ajuda com meu pedido',
          timestamp: new Date(),
          isFromMe: false,
          status: 'read'
        },
        unreadCount: 1,
        tags: ['vendas'],
        status: 'queue',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        contact: { id: '2', name: 'Maria Santos', phone: '+5511888888888' },
        messages: [
          {
            id: '2',
            text: 'Qual o horário de funcionamento?',
            timestamp: new Date(),
            isFromMe: false,
            status: 'delivered'
          }
        ],
        lastMessage: {
          id: '2',
          text: 'Qual o horário de funcionamento?',
          timestamp: new Date(),
          isFromMe: false,
          status: 'delivered'
        },
        unreadCount: 1,
        assignedTo: currentUser.id,
        tags: ['suporte'],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockUsers: User[] = [
      currentUser,
      {
        id: '2',
        name: 'Ana Costa',
        email: 'ana@empresa.com',
        department: 'Vendas',
        isOnline: true
      },
      {
        id: '3',
        name: 'Carlos Lima',
        email: 'carlos@empresa.com',
        department: 'Suporte',
        isOnline: false
      }
    ];

    setChats(mockChats);
    setUsers(mockUsers);
  }, []);

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
  };

  const handleTransferChat = (chatId: string, userId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, assignedTo: userId, status: 'active' as const }
        : chat
    ));
    toast({
      title: "Conversa Transferida",
      description: "A conversa foi transferida com sucesso.",
    });
  };

  const handleAddTag = (chatId: string, tag: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, tags: [...chat.tags, tag] }
        : chat
    ));
  };

  // Filter chats based on search query
  const filterChatsBySearch = (chatsToFilter: Chat[]) => {
    if (!searchQuery.trim()) return chatsToFilter;
    
    return chatsToFilter.filter(chat => 
      chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contact.phone.includes(searchQuery)
    );
  };

  const myChats = filterChatsBySearch(chats.filter(chat => chat.assignedTo === currentUser.id && chat.status === 'active'));
  const queueChats = filterChatsBySearch(chats.filter(chat => chat.status === 'queue'));
  const allContacts = chats.map(chat => chat.contact);

  return (
    <div className="wecf-scope min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Manager</h1>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Sistema Ativo
            </Badge>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={activeView === 'connections' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('connections')}
                className="flex items-center space-x-2"
              >
                <Wifi className="h-4 w-4" />
                <span>Conexões</span>
              </Button>
              <Button
                variant={activeView === 'chats' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('chats')}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chats</span>
              </Button>
            </div>
            
            <div className="flex items-center space-x-4 border-l pl-4">
              <span className="text-sm text-gray-600">
                {currentUser.name}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveView('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="h-[calc(100vh-80px)]">
        {activeView === 'connections' ? (
          <div className="p-6">
            <ConnectionsPanel />
          </div>
        ) : activeView === 'settings' ? (
          <SettingsPanel />
        ) : (
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Tabs defaultValue="chats" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3 m-4">
                  <TabsTrigger value="chats" className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Chats ({myChats.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="queue" className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Fila ({queueChats.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>Contatos ({allContacts.length})</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="chats" className="h-full m-0">
                    <ChatsList 
                      chats={myChats}
                      onChatSelect={handleChatSelect}
                      activeChat={activeChat}
                    />
                  </TabsContent>

                  <TabsContent value="queue" className="h-full m-0">
                    <QueueList 
                      chats={queueChats}
                      users={users}
                      onTransferChat={handleTransferChat}
                      onChatSelect={handleChatSelect}
                      activeChat={activeChat}
                    />
                  </TabsContent>

                  <TabsContent value="contacts" className="h-full m-0">
                    <ContactsList 
                      contacts={allContacts}
                      chats={chats}
                      onChatSelect={handleChatSelect}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {activeChat ? (
                <ChatWindow 
                  chat={activeChat}
                  users={users}
                  onTransferChat={handleTransferChat}
                  onAddTag={handleAddTag}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Selecione uma conversa
                    </h3>
                    <p className="text-gray-500">
                      Escolha uma conversa da lista para começar a responder
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
