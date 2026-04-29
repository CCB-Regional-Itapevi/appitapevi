-- Politicas de seguranca (RLS) para o modulo G.E.M.
-- Execute este script no SQL Editor do Supabase apos criar as tabelas musica_*.

BEGIN;

GRANT ALL ON TABLE public.musica_acompanhamento_aluno TO authenticated;
GRANT ALL ON TABLE public.musica_acompanhamento_msa TO authenticated;
GRANT ALL ON TABLE public.musica_acompanhamento_provas TO authenticated;
GRANT ALL ON TABLE public.musica_acompanhamento_metodo TO authenticated;
GRANT ALL ON TABLE public.musica_acompanhamento_hinario TO authenticated;
GRANT ALL ON TABLE public.musica_acompanhamento_escala TO authenticated;
GRANT ALL ON TABLE public.musica_acompanhamento_atividades TO authenticated;
GRANT ALL ON TABLE public.musica_msa_fases TO authenticated;

ALTER TABLE public.musica_acompanhamento_aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_acompanhamento_msa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_acompanhamento_provas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_acompanhamento_metodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_acompanhamento_hinario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_acompanhamento_escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_acompanhamento_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musica_msa_fases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "musica_acompanhamento_aluno_select_authenticated" ON public.musica_acompanhamento_aluno;
CREATE POLICY "musica_acompanhamento_aluno_select_authenticated"
ON public.musica_acompanhamento_aluno
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_aluno_insert_authenticated" ON public.musica_acompanhamento_aluno;
CREATE POLICY "musica_acompanhamento_aluno_insert_authenticated"
ON public.musica_acompanhamento_aluno
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_aluno_update_authenticated" ON public.musica_acompanhamento_aluno;
CREATE POLICY "musica_acompanhamento_aluno_update_authenticated"
ON public.musica_acompanhamento_aluno
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_aluno_delete_authenticated" ON public.musica_acompanhamento_aluno;
CREATE POLICY "musica_acompanhamento_aluno_delete_authenticated"
ON public.musica_acompanhamento_aluno
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_msa_select_authenticated" ON public.musica_acompanhamento_msa;
CREATE POLICY "musica_acompanhamento_msa_select_authenticated"
ON public.musica_acompanhamento_msa
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_msa_insert_authenticated" ON public.musica_acompanhamento_msa;
CREATE POLICY "musica_acompanhamento_msa_insert_authenticated"
ON public.musica_acompanhamento_msa
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_msa_update_authenticated" ON public.musica_acompanhamento_msa;
CREATE POLICY "musica_acompanhamento_msa_update_authenticated"
ON public.musica_acompanhamento_msa
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_msa_delete_authenticated" ON public.musica_acompanhamento_msa;
CREATE POLICY "musica_acompanhamento_msa_delete_authenticated"
ON public.musica_acompanhamento_msa
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_provas_select_authenticated" ON public.musica_acompanhamento_provas;
CREATE POLICY "musica_acompanhamento_provas_select_authenticated"
ON public.musica_acompanhamento_provas
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_provas_insert_authenticated" ON public.musica_acompanhamento_provas;
CREATE POLICY "musica_acompanhamento_provas_insert_authenticated"
ON public.musica_acompanhamento_provas
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_provas_update_authenticated" ON public.musica_acompanhamento_provas;
CREATE POLICY "musica_acompanhamento_provas_update_authenticated"
ON public.musica_acompanhamento_provas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_provas_delete_authenticated" ON public.musica_acompanhamento_provas;
CREATE POLICY "musica_acompanhamento_provas_delete_authenticated"
ON public.musica_acompanhamento_provas
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_metodo_select_authenticated" ON public.musica_acompanhamento_metodo;
CREATE POLICY "musica_acompanhamento_metodo_select_authenticated"
ON public.musica_acompanhamento_metodo
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_metodo_insert_authenticated" ON public.musica_acompanhamento_metodo;
CREATE POLICY "musica_acompanhamento_metodo_insert_authenticated"
ON public.musica_acompanhamento_metodo
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_metodo_update_authenticated" ON public.musica_acompanhamento_metodo;
CREATE POLICY "musica_acompanhamento_metodo_update_authenticated"
ON public.musica_acompanhamento_metodo
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_metodo_delete_authenticated" ON public.musica_acompanhamento_metodo;
CREATE POLICY "musica_acompanhamento_metodo_delete_authenticated"
ON public.musica_acompanhamento_metodo
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_hinario_select_authenticated" ON public.musica_acompanhamento_hinario;
CREATE POLICY "musica_acompanhamento_hinario_select_authenticated"
ON public.musica_acompanhamento_hinario
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_hinario_insert_authenticated" ON public.musica_acompanhamento_hinario;
CREATE POLICY "musica_acompanhamento_hinario_insert_authenticated"
ON public.musica_acompanhamento_hinario
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_hinario_update_authenticated" ON public.musica_acompanhamento_hinario;
CREATE POLICY "musica_acompanhamento_hinario_update_authenticated"
ON public.musica_acompanhamento_hinario
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_hinario_delete_authenticated" ON public.musica_acompanhamento_hinario;
CREATE POLICY "musica_acompanhamento_hinario_delete_authenticated"
ON public.musica_acompanhamento_hinario
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_escala_select_authenticated" ON public.musica_acompanhamento_escala;
CREATE POLICY "musica_acompanhamento_escala_select_authenticated"
ON public.musica_acompanhamento_escala
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_escala_insert_authenticated" ON public.musica_acompanhamento_escala;
CREATE POLICY "musica_acompanhamento_escala_insert_authenticated"
ON public.musica_acompanhamento_escala
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_escala_update_authenticated" ON public.musica_acompanhamento_escala;
CREATE POLICY "musica_acompanhamento_escala_update_authenticated"
ON public.musica_acompanhamento_escala
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_escala_delete_authenticated" ON public.musica_acompanhamento_escala;
CREATE POLICY "musica_acompanhamento_escala_delete_authenticated"
ON public.musica_acompanhamento_escala
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_atividades_select_authenticated" ON public.musica_acompanhamento_atividades;
CREATE POLICY "musica_acompanhamento_atividades_select_authenticated"
ON public.musica_acompanhamento_atividades
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_acompanhamento_atividades_insert_authenticated" ON public.musica_acompanhamento_atividades;
CREATE POLICY "musica_acompanhamento_atividades_insert_authenticated"
ON public.musica_acompanhamento_atividades
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_atividades_update_authenticated" ON public.musica_acompanhamento_atividades;
CREATE POLICY "musica_acompanhamento_atividades_update_authenticated"
ON public.musica_acompanhamento_atividades
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "musica_acompanhamento_atividades_delete_authenticated" ON public.musica_acompanhamento_atividades;
CREATE POLICY "musica_acompanhamento_atividades_delete_authenticated"
ON public.musica_acompanhamento_atividades
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "musica_msa_fases_select_authenticated" ON public.musica_msa_fases;
CREATE POLICY "musica_msa_fases_select_authenticated"
ON public.musica_msa_fases
FOR SELECT
TO authenticated
USING (true);

COMMIT;
