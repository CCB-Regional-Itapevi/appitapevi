-- Corrige acesso com RLS para os cadastros e recitativos do modulo RJM.
-- Execute esta migration no Supabase SQL Editor se as tabelas estiverem com RLS ativo.

BEGIN;

GRANT ALL ON TABLE public.rjm_recitativos TO authenticated;
GRANT ALL ON TABLE public.rjm_comuns TO authenticated;
GRANT ALL ON TABLE public.rjm_auxiliares TO authenticated;

ALTER TABLE public.rjm_recitativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rjm_comuns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rjm_auxiliares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rjm_recitativos_select_authenticated" ON public.rjm_recitativos;
CREATE POLICY "rjm_recitativos_select_authenticated"
ON public.rjm_recitativos
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "rjm_recitativos_insert_authenticated" ON public.rjm_recitativos;
CREATE POLICY "rjm_recitativos_insert_authenticated"
ON public.rjm_recitativos
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "rjm_recitativos_update_authenticated" ON public.rjm_recitativos;
CREATE POLICY "rjm_recitativos_update_authenticated"
ON public.rjm_recitativos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "rjm_recitativos_delete_authenticated" ON public.rjm_recitativos;
CREATE POLICY "rjm_recitativos_delete_authenticated"
ON public.rjm_recitativos
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "rjm_comuns_select_authenticated" ON public.rjm_comuns;
CREATE POLICY "rjm_comuns_select_authenticated"
ON public.rjm_comuns
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "rjm_comuns_insert_authenticated" ON public.rjm_comuns;
CREATE POLICY "rjm_comuns_insert_authenticated"
ON public.rjm_comuns
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "rjm_comuns_update_authenticated" ON public.rjm_comuns;
CREATE POLICY "rjm_comuns_update_authenticated"
ON public.rjm_comuns
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "rjm_comuns_delete_authenticated" ON public.rjm_comuns;
CREATE POLICY "rjm_comuns_delete_authenticated"
ON public.rjm_comuns
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "rjm_auxiliares_select_authenticated" ON public.rjm_auxiliares;
CREATE POLICY "rjm_auxiliares_select_authenticated"
ON public.rjm_auxiliares
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "rjm_auxiliares_insert_authenticated" ON public.rjm_auxiliares;
CREATE POLICY "rjm_auxiliares_insert_authenticated"
ON public.rjm_auxiliares
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "rjm_auxiliares_update_authenticated" ON public.rjm_auxiliares;
CREATE POLICY "rjm_auxiliares_update_authenticated"
ON public.rjm_auxiliares
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "rjm_auxiliares_delete_authenticated" ON public.rjm_auxiliares;
CREATE POLICY "rjm_auxiliares_delete_authenticated"
ON public.rjm_auxiliares
FOR DELETE
TO authenticated
USING (true);

COMMIT;
