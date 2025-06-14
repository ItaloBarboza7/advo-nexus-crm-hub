
-- Cria um enum para os tipos de usuário no sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Cria tabela de roles dos usuários (cada user pode ter um ou mais)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Adiciona RLS na tabela de roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Permite ao próprio usuário ver seus roles, e o admin (comprador) ver tudo
CREATE POLICY "User can see own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Função para verificar se um user tem determinado role (admin ou membro)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Exemplo de policy para acesso: permitir SELECT apenas se for admin
-- (Apenas referência, só implemente nas páginas que deve restringir)

-- CREATE POLICY "Admins only"
--   ON public.company_info
--   FOR SELECT
--   USING (public.has_role(auth.uid(), 'admin'));
