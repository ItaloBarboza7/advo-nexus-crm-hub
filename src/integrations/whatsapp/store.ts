import { supabase } from "@/integrations/supabase/client";

// Helper functions to normalize and save WhatsApp data to Supabase

/**
 * Ensure a contact exists in the database
 */
export async function ensureContact(contactData: any, connectionId: string, tenantId: string) {
  try {
    console.log('[WhatsAppStore] 👤 Ensuring contact exists:', contactData);
    
    const wa_id = contactData.wa_id || contactData.id || contactData.jid || contactData.phone;
    const name = contactData.name || contactData.pushname || contactData.notify || 'Sem nome';
    
    if (!wa_id) {
      console.warn('[WhatsAppStore] ⚠️ Contact missing wa_id, skipping');
      return null;
    }
    
    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('wa_id', wa_id)
      .eq('connection_id', connectionId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existingContact) {
      console.log('[WhatsAppStore] ✅ Contact already exists:', existingContact.id);
      return existingContact;
    }
    
    // Create new contact
    const { data: newContact, error } = await supabase
      .from('whatsapp_contacts')
      .insert({
        wa_id,
        name,
        connection_id: connectionId,
        tenant_id: tenantId,
        profile_pic_url: contactData.profile_pic_url || null,
        is_blocked: contactData.is_blocked || false
      })
      .select()
      .single();
    
    if (error) {
      console.error('[WhatsAppStore] ❌ Error creating contact:', error);
      return null;
    }
    
    console.log('[WhatsAppStore] ✅ Contact created:', newContact.id);
    return newContact;
    
  } catch (error) {
    console.error('[WhatsAppStore] ❌ ensureContact error:', error);
    return null;
  }
}

/**
 * Ensure a chat exists in the database
 */
export async function ensureChat(chatData: any, connectionId: string, tenantId: string, contactId?: string) {
  try {
    console.log('[WhatsAppStore] 💬 Ensuring chat exists:', chatData);
    
    const jid = chatData.jid || chatData.id || chatData.chat_id;
    const chatName = chatData.name || chatData.subject || null;
    const chatType = chatData.type || (jid?.includes('@g.us') ? 'group' : 'user');
    
    if (!jid) {
      console.warn('[WhatsAppStore] ⚠️ Chat missing jid, skipping');
      return null;
    }
    
    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .eq('jid', jid)
      .eq('connection_id', connectionId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (existingChat) {
      console.log('[WhatsAppStore] ✅ Chat already exists:', existingChat.id);
      return existingChat;
    }
    
    // Create new chat
    const { data: newChat, error } = await supabase
      .from('whatsapp_chats')
      .insert({
        jid,
        name: chatName,
        type: chatType,
        connection_id: connectionId,
        tenant_id: tenantId,
        contact_id: contactId || null,
        unread_count: chatData.unread_count || 0,
        last_message_at: chatData.last_message_at ? new Date(chatData.last_message_at).toISOString() : null
      })
      .select()
      .single();
    
    if (error) {
      console.error('[WhatsAppStore] ❌ Error creating chat:', error);
      return null;
    }
    
    console.log('[WhatsAppStore] ✅ Chat created:', newChat.id);
    return newChat;
    
  } catch (error) {
    console.error('[WhatsAppStore] ❌ ensureChat error:', error);
    return null;
  }
}

/**
 * Insert or update a message in the database
 */
export async function insertOrUpdateMessage(messageData: any, chatId: string, connectionId: string, tenantId: string) {
  try {
    console.log('[WhatsAppStore] 📝 Inserting/updating message:', messageData);
    
    const wa_message_id = messageData.wa_message_id || messageData.id || messageData.key?.id;
    const body = messageData.body || messageData.text || messageData.message?.body || '';
    const direction = messageData.direction || (messageData.fromMe ? 'outbound' : 'inbound');
    const messageType = messageData.type || 'text';
    const status = messageData.status || 'sent';
    const timestamp = messageData.timestamp ? new Date(messageData.timestamp * 1000) : new Date();
    const authorWaId = messageData.author_wa_id || messageData.from || messageData.participant || null;
    
    if (!wa_message_id) {
      console.warn('[WhatsAppStore] ⚠️ Message missing wa_message_id, generating one');
    }
    
    // Check if message already exists
    if (wa_message_id) {
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('wa_message_id', wa_message_id)
        .eq('chat_id', chatId)
        .single();
      
      if (existingMessage) {
        // Update existing message (status, etc.)
        const { data: updatedMessage, error } = await supabase
          .from('whatsapp_messages')
          .update({
            status,
            body: body || existingMessage.body,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMessage.id)
          .select()
          .single();
        
        if (error) {
          console.error('[WhatsAppStore] ❌ Error updating message:', error);
          return null;
        }
        
        console.log('[WhatsAppStore] ✅ Message updated:', updatedMessage.id);
        return updatedMessage;
      }
    }
    
    // Create new message
    const { data: newMessage, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        wa_message_id: wa_message_id || `generated_${Date.now()}_${Math.random()}`,
        chat_id: chatId,
        connection_id: connectionId,
        tenant_id: tenantId,
        body,
        type: messageType,
        direction,
        status,
        timestamp: timestamp.toISOString(),
        author_wa_id: authorWaId,
        media_url: messageData.media_url || null,
        media_mime_type: messageData.media_mime_type || null,
        media_size: messageData.media_size || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('[WhatsAppStore] ❌ Error creating message:', error);
      return null;
    }
    
    console.log('[WhatsAppStore] ✅ Message created:', newMessage.id);
    
    // Update chat's last_message_at
    await supabase
      .from('whatsapp_chats')
      .update({
        last_message_at: timestamp.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId);
    
    return newMessage;
    
  } catch (error) {
    console.error('[WhatsAppStore] ❌ insertOrUpdateMessage error:', error);
    return null;
  }
}

/**
 * Process incoming WhatsApp event and save to database
 */
export async function processWhatsAppEvent(event: any, connectionId: string, tenantId: string) {
  try {
    console.log('[WhatsAppStore] 🔄 Processing WhatsApp event:', event.type);
    
    switch (event.type) {
      case 'contact':
      case 'contacts':
        const contacts = Array.isArray(event.data) ? event.data : [event.data];
        const contactResults = [];
        
        for (const contactData of contacts) {
          const contact = await ensureContact(contactData, connectionId, tenantId);
          if (contact) contactResults.push(contact);
        }
        
        return { type: 'contacts', data: contactResults };
      
      case 'chat':
      case 'chats':
        const chats = Array.isArray(event.data) ? event.data : [event.data];
        const chatResults = [];
        
        for (const chatData of chats) {
          // First ensure contact if it's a private chat
          let contactId = null;
          if (chatData.type !== 'group' && chatData.contact) {
            const contact = await ensureContact(chatData.contact, connectionId, tenantId);
            contactId = contact?.id || null;
          }
          
          const chat = await ensureChat(chatData, connectionId, tenantId, contactId);
          if (chat) chatResults.push(chat);
        }
        
        return { type: 'chats', data: chatResults };
      
      case 'message':
      case 'messages':
        const messages = Array.isArray(event.data) ? event.data : [event.data];
        const messageResults = [];
        
        for (const messageData of messages) {
          // Ensure chat exists first
          const chatJid = messageData.chat_id || messageData.from || messageData.to;
          if (!chatJid) {
            console.warn('[WhatsAppStore] ⚠️ Message missing chat info, skipping');
            continue;
          }
          
          // Try to find existing chat
          let { data: chat } = await supabase
            .from('whatsapp_chats')
            .select('*')
            .eq('jid', chatJid)
            .eq('connection_id', connectionId)
            .eq('tenant_id', tenantId)
            .single();
          
          // If chat doesn't exist, create it
          if (!chat) {
            chat = await ensureChat({ jid: chatJid, type: 'user' }, connectionId, tenantId);
          }
          
          if (chat) {
            const message = await insertOrUpdateMessage(messageData, chat.id, connectionId, tenantId);
            if (message) messageResults.push(message);
          }
        }
        
        return { type: 'messages', data: messageResults };
      
      case 'sync_complete':
        console.log('[WhatsAppStore] ✅ WhatsApp sync completed');
        return { type: 'sync_complete', data: event.data };
      
      default:
        console.log('[WhatsAppStore] ℹ️ Unhandled event type:', event.type);
        return { type: event.type, data: event.data };
    }
    
  } catch (error) {
    console.error('[WhatsAppStore] ❌ processWhatsAppEvent error:', error);
    return { type: 'error', data: error };
  }
}