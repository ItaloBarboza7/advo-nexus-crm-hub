
export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isFromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
}

export interface Chat {
  id: string;
  contact: Contact;
  messages: Message[];
  lastMessage: Message;
  unreadCount: number;
  assignedTo?: string;
  department?: string;
  tags: string[];
  status: 'active' | 'queue' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  isOnline: boolean;
  avatar?: string;
}
