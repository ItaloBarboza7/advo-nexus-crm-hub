
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
import { supabase } from "@/integrations/supabase/client";
import { whatsappGateway, getTenantId } from "@/integrations/whatsapp/gateway";
import { processWhatsAppEvent } from "@/integrations/whatsapp/store";
import "./whatsapp/scope.css";

export function AtendimentoContent() {
  const [activeView, setActiveView] = useState<'chats' | 'connections' | 'settings'>('chats');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [eventsStream, setEventsStream] = useState<{ close: () => void } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser] = useState<User>({
    id: '1',
    name: 'Usuário Admin',
    email: 'admin@empresa.com',
    department: 'Atendimento',
    isOnline: true
  });
  const { toast } = useToast();

  // Load active connections and real WhatsApp data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Load active connections
        const connections = await whatsappGateway.listConnections();
        const activeConns = connections.filter(conn => conn.status === 'connected');
        setActiveConnections(activeConns);
        
        console.log('[AtendimentoContent] 🔄 Active connections:', activeConns.length);
        
        // Load chats and messages from Supabase
        await loadChatsFromSupabase();
        
        // Start events stream for the first active connection
        if (activeConns.length > 0) {
          startEventsStream(activeConns[0].id);
        }
        
      } catch (error) {
        console.error('[AtendimentoContent] ❌ Error loading initial data:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do WhatsApp",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const loadChatsFromSupabase = async () => {
      try {
        // Load chats with contacts and recent messages
        const { data: chatsData, error: chatsError } = await supabase
          .from('whatsapp_chats')
          .select(`
            *,
            whatsapp_contacts (
              id,
              wa_id,
              name,
              profile_pic_url
            )
          `)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (chatsError) {
          console.error('[AtendimentoContent] ❌ Error loading chats:', chatsError);
          return;
        }

        // Transform Supabase data to Chat format
        const transformedChats: Chat[] = await Promise.all(
          (chatsData || []).map(async (chatData: any) => {
            // Load messages for this chat
            const { data: messagesData } = await supabase
              .from('whatsapp_messages')
              .select('*')
              .eq('chat_id', chatData.id)
              .order('timestamp', { ascending: true })
              .limit(50);

            const messages: Message[] = (messagesData || []).map((msg: any) => ({
              id: msg.id,
              text: msg.body || '',
              timestamp: new Date(msg.timestamp),
              isFromMe: msg.direction === 'outbound',
              status: msg.status
            }));

            const contact: Contact = {
              id: chatData.whatsapp_contacts?.id || chatData.id,
              name: chatData.whatsapp_contacts?.name || chatData.name || 'Sem nome',
              phone: chatData.whatsapp_contacts?.wa_id || chatData.jid || '',
              avatar: chatData.whatsapp_contacts?.profile_pic_url
            };

            return {
              id: chatData.id,
              contact,
              messages,
              lastMessage: messages[messages.length - 1] || {
                id: 'empty',
                text: '',
                timestamp: new Date(chatData.created_at),
                isFromMe: false,
                status: 'sent'
              },
              unreadCount: chatData.unread_count || 0,
              tags: [],
              status: 'active' as const,
              createdAt: new Date(chatData.created_at),
              updatedAt: new Date(chatData.updated_at)
            };
          })
        );

        setChats(transformedChats);
        console.log('[AtendimentoContent] ✅ Loaded chats:', transformedChats.length);

      } catch (error) {
        console.error('[AtendimentoContent] ❌ Error loading chats from Supabase:', error);
      }
    };

    const startEventsStream = (connectionId: string) => {
      if (eventsStream) {
        eventsStream.close();
      }

      console.log('[AtendimentoContent] 🔄 Starting events stream for connection:', connectionId);
      
      const stream = whatsappGateway.openEventsStream(connectionId, async (event) => {
        console.log('[AtendimentoContent] 📨 WhatsApp event received:', event.type);
        
        try {
          // Process event and save to Supabase
          const result = await processWhatsAppEvent(event, connectionId, await getTenantId());
          
          if (result.type === 'chats' || result.type === 'messages') {
            // Reload chats when new data comes in
            await loadChatsFromSupabase();
          }
          
          if (result.type === 'sync_complete') {
            toast({
              title: "Sincronização Completa",
              description: "WhatsApp sincronizado com sucesso!",
            });
          }
        } catch (error) {
          console.error('[AtendimentoContent] ❌ Error processing WhatsApp event:', error);
        }
      });

      setEventsStream(stream);
    };

    loadInitialData();

    // Cleanup events stream on unmount
    return () => {
      if (eventsStream) {
        eventsStream.close();
      }
    };
  }, []);

  // Real-time subscriptions to Supabase tables
  useEffect(() => {
    // Subscribe to chat changes
    const chatsChannel = supabase
      .channel('whatsapp_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_chats'
        },
        (payload) => {
          console.log('[AtendimentoContent] 🔄 Chat change detected:', payload);
          // Reload chats when changes occur
          loadChatsFromSupabase();
        }
      )
      .subscribe();

    // Subscribe to message changes
    const messagesChannel = supabase
      .channel('whatsapp_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('[AtendimentoContent] 📝 Message change detected:', payload);
          // Reload chats to update last messages
          loadChatsFromSupabase();
        }
      )
      .subscribe();

    const loadChatsFromSupabase = async () => {
      try {
        const { data: chatsData, error: chatsError } = await supabase
          .from('whatsapp_chats')
          .select(`
            *,
            whatsapp_contacts (
              id,
              wa_id,
              name,
              profile_pic_url
            )
          `)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (chatsError) {
          console.error('[AtendimentoContent] ❌ Error loading chats:', chatsError);
          return;
        }

        const transformedChats: Chat[] = await Promise.all(
          (chatsData || []).map(async (chatData: any) => {
            const { data: messagesData } = await supabase
              .from('whatsapp_messages')
              .select('*')
              .eq('chat_id', chatData.id)
              .order('timestamp', { ascending: true })
              .limit(50);

            const messages: Message[] = (messagesData || []).map((msg: any) => ({
              id: msg.id,
              text: msg.body || '',
              timestamp: new Date(msg.timestamp),
              isFromMe: msg.direction === 'outbound',
              status: msg.status
            }));

            const contact: Contact = {
              id: chatData.whatsapp_contacts?.id || chatData.id,
              name: chatData.whatsapp_contacts?.name || chatData.name || 'Sem nome',
              phone: chatData.whatsapp_contacts?.wa_id || chatData.jid || '',
              avatar: chatData.whatsapp_contacts?.profile_pic_url
            };

            return {
              id: chatData.id,
              contact,
              messages,
              lastMessage: messages[messages.length - 1] || {
                id: 'empty',
                text: '',
                timestamp: new Date(chatData.created_at),
                isFromMe: false,
                status: 'sent'
              },
              unreadCount: chatData.unread_count || 0,
              tags: [],
              status: 'active' as const,
              createdAt: new Date(chatData.created_at),
              updatedAt: new Date(chatData.updated_at)
            };
          })
        );

        setChats(transformedChats);
      } catch (error) {
        console.error('[AtendimentoContent] ❌ Error loading chats from Supabase:', error);
      }
    };

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
  };

  const handleSendMessage = async (chatId: string, message: string) => {
    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat || activeConnections.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhuma conexão ativa encontrada",
          variant: "destructive",
        });
        return;
      }

      // Use the first active connection
      const connectionId = activeConnections[0].id;
      const to = chat.contact.phone;

      console.log('[AtendimentoContent] 📤 Sending message:', { chatId, to, message: message.substring(0, 50) });

      // Send via WhatsApp Gateway
      await whatsappGateway.sendText(connectionId, to, message);

      // Save to Supabase (will be handled by the events stream, but we can add it directly too)
      await supabase
        .from('whatsapp_messages')
        .insert({
          chat_id: chatId,
          connection_id: connectionId,
          tenant_id: await getTenantId(),
          body: message,
          type: 'text',
          direction: 'outbound',
          status: 'sent',
          timestamp: new Date().toISOString(),
          created_by_user_id: currentUser.id
        });

      toast({
        title: "Mensagem Enviada",
        description: "Mensagem enviada com sucesso!",
      });

    } catch (error) {
      console.error('[AtendimentoContent] ❌ Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    }
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
              {activeConnections.length > 0 ? `${activeConnections.length} Conexão(ões) Ativa(s)` : 'Nenhuma Conexão'}
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
                  onSendMessage={handleSendMessage}
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
