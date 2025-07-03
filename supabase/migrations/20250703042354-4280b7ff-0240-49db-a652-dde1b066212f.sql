-- Inserir o role de admin para o usuário teste6
INSERT INTO public.user_roles (user_id, role)
VALUES ('20548379-7f8c-4a8a-9fd8-b059158466db', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;