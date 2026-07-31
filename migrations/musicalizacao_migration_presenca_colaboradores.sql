-- Inclui Monitoras e Coordenadoras na frequência detalhada das atividades.

ALTER TABLE public.musicalizacao_presenca
ADD COLUMN IF NOT EXISTS colaborador_id UUID REFERENCES public.musicalizacao_monitores(id) ON DELETE CASCADE;

ALTER TABLE public.musicalizacao_presenca
ADD COLUMN IF NOT EXISTS participante_tipo TEXT DEFAULT 'aluno';

UPDATE public.musicalizacao_presenca
SET participante_tipo = CASE WHEN colaborador_id IS NOT NULL THEN 'colaborador' ELSE 'aluno' END
WHERE participante_tipo IS NULL OR participante_tipo NOT IN ('aluno', 'colaborador');

CREATE UNIQUE INDEX IF NOT EXISTS musicalizacao_presenca_aula_colaborador_uidx
ON public.musicalizacao_presenca (aula_id, colaborador_id)
WHERE colaborador_id IS NOT NULL;

COMMENT ON COLUMN public.musicalizacao_presenca.colaborador_id IS
'Monitora ou Coordenadora vinculada ao registro de frequência.';
