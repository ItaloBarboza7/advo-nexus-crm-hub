
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, Zap, MoreVertical } from "lucide-react";
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

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
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

      {/* Message Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          {/* Attach Button */}
          <Button variant="ghost" size="sm" className="p-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
          </Button>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="pr-12 rounded-full border-gray-300"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          
          {/* Quick Replies Button */}
          <Button variant="ghost" size="sm" className="p-2">
            <Zap className="h-4 w-4 text-gray-500" />
          </Button>
          
          {/* Send Button - Round */}
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="rounded-full w-10 h-10 p-0 bg-green-500 hover:bg-green-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
