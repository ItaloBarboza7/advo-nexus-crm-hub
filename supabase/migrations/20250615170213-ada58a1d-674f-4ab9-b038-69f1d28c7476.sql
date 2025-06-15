
-- Adiciona motivos de perda padrão globais para todos os usuários/tenants (default system reasons).
INSERT INTO public.loss_reasons (reason, is_fixed, user_id)
VALUES 
  ('Não tinha Direito', false, NULL),
  ('Preço', false, NULL),
  ('Documentação', false, NULL);
