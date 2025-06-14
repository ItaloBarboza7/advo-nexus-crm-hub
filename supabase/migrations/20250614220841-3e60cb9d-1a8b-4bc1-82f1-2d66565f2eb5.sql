
-- Adiciona uma restrição UNIQUE para garantir que um usuário só pode ter um perfil.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_user_id_key' AND conrelid = 'public.user_profiles'::regclass
    ) THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
    END IF;
END
$$;

-- Inserir o perfil para o usuário principal na tabela user_profiles
-- Isso garante que o usuário admin tenha um registro de perfil, o que é necessário para as verificações de permissão.
INSERT INTO public.user_profiles (user_id, name, email, parent_user_id)
VALUES ('a2b64752-b74c-43fb-8e2a-ee74a450d3dc', 'Admin Principal', 'teste3@gmail.com', NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Inserir o cargo de administrador para o usuário na tabela user_roles
-- Isso atribui explicitamente a função de 'admin' ao usuário, resolvendo a falha de autorização.
INSERT INTO public.user_roles (user_id, role)
VALUES ('a2b64752-b74c-43fb-8e2a-ee74a450d3dc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
