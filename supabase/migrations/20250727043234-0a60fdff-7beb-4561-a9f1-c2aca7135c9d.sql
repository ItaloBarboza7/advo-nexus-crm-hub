
-- Primeiro, vamos verificar se existe uma fonte "site" padrão na tabela
-- Se existir, vamos garantir que ela tenha user_id NULL (fonte global/padrão)
UPDATE lead_sources 
SET user_id = NULL 
WHERE name = 'site' AND user_id IS NOT NULL;

-- Vamos também criar uma fonte padrão "site" caso não exista
INSERT INTO lead_sources (name, label, user_id)
SELECT 'site', 'Site', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE name = 'site' AND user_id IS NULL
);

-- Vamos fazer o mesmo para outras fontes comuns que podem causar conflito
INSERT INTO lead_sources (name, label, user_id)
SELECT 'facebook', 'Facebook', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE name = 'facebook' AND user_id IS NULL
);

INSERT INTO lead_sources (name, label, user_id)
SELECT 'instagram', 'Instagram', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE name = 'instagram' AND user_id IS NULL
);

INSERT INTO lead_sources (name, label, user_id)
SELECT 'google', 'Google', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE name = 'google' AND user_id IS NULL
);

INSERT INTO lead_sources (name, label, user_id)
SELECT 'indicacao', 'Indicação', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE name = 'indicacao' AND user_id IS NULL
);

-- Remover duplicatas que possam ter sido criadas pelos usuários
-- mas que já existem como fontes padrão
DELETE FROM lead_sources 
WHERE user_id IS NOT NULL 
AND name IN (
    SELECT name FROM lead_sources WHERE user_id IS NULL
);
