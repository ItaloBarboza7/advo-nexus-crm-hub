
-- Adiciona uma coluna na tabela 'user_profiles' para vincular um membro ao seu administrador.
-- Isso vai armazenar o ID do usuário que criou o membro.
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adiciona o valor 'member' ao tipo de cargo 'app_role', caso ainda não exista.
-- Isso nos permitirá diferenciar administradores de membros.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';
