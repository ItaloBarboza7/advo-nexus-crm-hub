
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, UserPlus, Tag, MoreVertical } from "lucide-react";
import { Chat, User } from './types';

interface ChatWindowProps {
  chat: Chat;
  users: User[];
  onTransferChat: (chatId: string, userId: string) => void;
  onAddTag: (chatId: string, tag: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, 
  users, 
  onTransferChat, 
  onAddTag 
}) => {
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleTransfer = () => {
    if (selectedUser) {
      onTransferChat(chat.id, selectedUser);
      setSelectedUser('');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(chat.id, newTag.trim());
      setNewTag('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
              {chat.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-gray-900">{chat.contact.name}</h3>
            <p className="text-sm text-gray-500">{chat.contact.phone}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Tags */}
          <div className="flex items-center space-x-1">
            {chat.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">
          {chat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.isFromMe
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.isFromMe ? 'text-blue-100' : 'text-gray-500'}`}>
                  {msg.timestamp.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2 mb-3">
          {/* Transfer */}
          <div className="flex items-center space-x-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Transferir para..." />
              </SelectTrigger>
              <SelectContent>
                {users.filter(user => user.isOnline && user.id !== chat.assignedTo).map((user) => (
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
              variant="outline"
              onClick={handleTransfer}
              disabled={!selectedUser}
              className="h-8 px-3 text-xs"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Transferir
            </Button>
          </div>

          {/* Add Tag */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-32 h-8 text-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="h-8 px-3 text-xs"
            >
              <Tag className="h-3 w-3 mr-1" />
              Tag
            </Button>
          </div>
        </div>

        {/* Message Input */}
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
