
import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Contact, Chat } from './types';

interface ContactsListProps {
  contacts: Contact[];
  chats: Chat[];
  onChatSelect: (chat: Chat) => void;
}

const ContactsList: React.FC<ContactsListProps> = ({ contacts, chats, onChatSelect }) => {
  const findChatByContact = (contactId: string) => {
    return chats.find(chat => chat.contact.id === contactId);
  };

  const handleOpenChat = (contact: Contact) => {
    const existingChat = findChatByContact(contact.id);
    if (existingChat) {
      onChatSelect(existingChat);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {contacts.map((contact) => {
        const hasChat = findChatByContact(contact.id);
        
        return (
          <div
            key={contact.id}
            className="flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors"
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900">{contact.name}</h4>
              <p className="text-xs text-gray-500">{contact.phone}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasChat && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenChat(contact)}
                  className="h-8 px-3 text-xs"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Abrir Chat
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContactsList;
