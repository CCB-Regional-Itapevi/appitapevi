-- Permite classificar as colaboradoras da Musicalização por função.
-- A tabela usada pelo módulo no aplicativo é musicalizacao_monitores.

ALTER TABLE public.musicalizacao_monitores
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Monitora';

UPDATE public.musicalizacao_monitores
SET role = CASE
    WHEN lower(coalesce(role, '')) LIKE '%coorden%' THEN 'Coordenadora'
    ELSE 'Monitora'
END
WHERE role IS NULL
   OR btrim(role) = ''
   OR lower(role) IN ('monitor', 'monitora', 'monitor(a)', 'coordenador', 'coordenadora', 'coordenador(a)');

ALTER TABLE public.musicalizacao_monitores
ALTER COLUMN role SET DEFAULT 'Monitora';

COMMENT ON COLUMN public.musicalizacao_monitores.role IS
'Função da colaboradora na Musicalização: Monitora ou Coordenadora.';
