
-- Helper: atualiza updated_at automaticamente
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Sessões do Baileys (estado de autenticação) - somente service_role acessa
create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  creds_json jsonb not null,
  keys_json jsonb not null,
  version text not null,
  last_sync_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id)
);

alter table public.whatsapp_sessions enable row level security;

-- Apenas o service_role pode gerenciar
create policy "Service role can manage whatsapp_sessions"
on public.whatsapp_sessions
as permissive
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create trigger set_timestamp_whatsapp_sessions
before update on public.whatsapp_sessions
for each row
execute procedure public.set_current_timestamp_updated_at();

-- 2) Contatos
create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  wa_id text not null, -- JID/phone no formato do WhatsApp
  name text,
  profile_pic_url text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, wa_id)
);

alter table public.whatsapp_contacts enable row level security;

-- Tenants podem ver seus próprios contatos
create policy "Tenants can view own whatsapp_contacts"
on public.whatsapp_contacts
for select
to authenticated
using (tenant_id = get_tenant_id());

-- Serviço gerencia tudo
create policy "Service role can manage whatsapp_contacts"
on public.whatsapp_contacts
as permissive
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create trigger set_timestamp_whatsapp_contacts
before update on public.whatsapp_contacts
for each row
execute procedure public.set_current_timestamp_updated_at();

-- 3) Chats
create table if not exists public.whatsapp_chats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  contact_id uuid references public.whatsapp_contacts(id) on delete set null,
  jid text not null, -- JID do chat (contato ou grupo)
  type text not null default 'user' check (type in ('user','group')),
  name text,
  last_message_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, jid)
);

alter table public.whatsapp_chats enable row level security;

create policy "Tenants can view own whatsapp_chats"
on public.whatsapp_chats
for select
to authenticated
using (tenant_id = get_tenant_id());

create policy "Service role can manage whatsapp_chats"
on public.whatsapp_chats
as permissive
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create trigger set_timestamp_whatsapp_chats
before update on public.whatsapp_chats
for each row
execute procedure public.set_current_timestamp_updated_at();

-- 4) Mensagens
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  chat_id uuid not null references public.whatsapp_chats(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','system')),
  status text not null default 'sent' check (status in ('pending','sent','delivered','read','failed')),
  wa_message_id text, -- id do WhatsApp (quando disponível)
  author_wa_id text,
  body text,
  type text not null default 'text' check (type in ('text','image','audio','video','document','sticker','location','contact','reaction')),
  media_url text,
  media_mime_type text,
  media_size int,
  created_by_user_id uuid, -- quem criou a outbound (quando vier do app)
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_chat_time on public.whatsapp_messages(chat_id, timestamp desc);

alter table public.whatsapp_messages enable row level security;

-- Tenants podem ver suas próprias mensagens
create policy "Tenants can view own whatsapp_messages"
on public.whatsapp_messages
for select
to authenticated
using (tenant_id = get_tenant_id());

-- Serviço gerencia tudo
create policy "Service role can manage whatsapp_messages"
on public.whatsapp_messages
as permissive
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Opcional: permitir que usuário insira outbound (o serviço pode consumi-la e enviar)
create policy "Tenants can insert outbound whatsapp_messages"
on public.whatsapp_messages
for insert
to authenticated
with check (
  tenant_id = get_tenant_id()
  and direction = 'outbound'
  and created_by_user_id = auth.uid()
);

create trigger set_timestamp_whatsapp_messages
before update on public.whatsapp_messages
for each row
execute procedure public.set_current_timestamp_updated_at();
