
-- Habilitar Realtime (com checagem idempotente) nas tabelas do WhatsApp

do $$
begin
  -- whatsapp_messages
  if not exists (
    select 1 from pg_publication_tables 
    where publication = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'whatsapp_messages'
  ) then
    execute 'alter table public.whatsapp_messages replica identity full';
    execute 'alter publication supabase_realtime add table public.whatsapp_messages';
  end if;

  -- whatsapp_chats
  if not exists (
    select 1 from pg_publication_tables 
    where publication = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'whatsapp_chats'
  ) then
    execute 'alter table public.whatsapp_chats replica identity full';
    execute 'alter publication supabase_realtime add table public.whatsapp_chats';
  end if;

  -- whatsapp_connections
  if not exists (
    select 1 from pg_publication_tables 
    where publication = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'whatsapp_connections'
  ) then
    execute 'alter table public.whatsapp_connections replica identity full';
    execute 'alter publication supabase_realtime add table public.whatsapp_connections';
  end if;

  -- whatsapp_contacts
  if not exists (
    select 1 from pg_publication_tables 
    where publication = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'whatsapp_contacts'
  ) then
    execute 'alter table public.whatsapp_contacts replica identity full';
    execute 'alter publication supabase_realtime add table public.whatsapp_contacts';
  end if;
end
$$;
