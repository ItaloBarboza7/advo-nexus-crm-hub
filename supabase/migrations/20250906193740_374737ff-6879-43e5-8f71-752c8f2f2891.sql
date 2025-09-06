-- Add unique indexes to WhatsApp tables for better performance and data integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_contacts_wa_id_connection 
ON whatsapp_contacts(wa_id, connection_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_chats_jid_connection 
ON whatsapp_chats(jid, connection_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_message_connection 
ON whatsapp_messages(wa_message_id, connection_id) 
WHERE wa_message_id IS NOT NULL;