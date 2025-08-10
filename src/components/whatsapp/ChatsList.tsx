
import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Chat } from './types';

interface ChatsListProps {
  chats: Chat[];
  onChatSelect: (chat: Chat) => void;
  activeChat: Chat | null;
}

const ChatsList: React.FC<ChatsListProps> = ({ chats, onChatSelect, activeChat }) => {
  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onChatSelect(chat)}
          className={`flex items-center space-x-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            activeChat?.id === chat.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
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
            
            <div className="flex items-center justify-between">
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
                {chat.unreadCount > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {chat.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatsList;
