
import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { Chat, User } from './types';

interface QueueListProps {
  chats: Chat[];
  users: User[];
  onTransferChat: (chatId: string, userId: string) => void;
  onChatSelect: (chat: Chat) => void;
  activeChat: Chat | null;
}

const QueueList: React.FC<QueueListProps> = ({ 
  chats, 
  users, 
  onTransferChat, 
  onChatSelect, 
  activeChat 
}) => {
  const [selectedUsers, setSelectedUsers] = React.useState<{[key: string]: string}>({});

  const handleTransfer = (chatId: string) => {
    const userId = selectedUsers[chatId];
    if (userId) {
      onTransferChat(chatId, userId);
      setSelectedUsers(prev => ({ ...prev, [chatId]: '' }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((chat) => (
        <div key={chat.id} className="border-b border-gray-100 last:border-b-0">
          <div
            onClick={() => onChatSelect(chat)}
            className={`flex items-center space-x-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
              activeChat?.id === chat.id ? 'bg-blue-50' : ''
            }`}
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                {chat.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm truncate text-gray-900">{chat.contact.name}</h4>
                <span className="text-xs text-gray-500">
                  {chat.lastMessage.timestamp.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 truncate flex-1 mr-2">
                  {chat.lastMessage.text}
                </p>
                <div className="flex items-center space-x-2">
                  {chat.tags.map((tag) => (
                    <Badge 
                      key={tag}
                      variant="outline" 
                      className="text-xs px-2 py-0 h-5 bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Transfer section */}
          <div className="px-4 pb-4">
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
              <UserPlus className="h-4 w-4 text-gray-500" />
              <Select
                value={selectedUsers[chat.id] || ''}
                onValueChange={(value) => setSelectedUsers(prev => ({ ...prev, [chat.id]: value }))}
              >
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue placeholder="Selecionar atendente" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(user => user.isOnline).map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={() => handleTransfer(chat.id)}
                disabled={!selectedUsers[chat.id]}
                className="h-8 px-3 text-xs"
              >
                Transferir
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QueueList;
