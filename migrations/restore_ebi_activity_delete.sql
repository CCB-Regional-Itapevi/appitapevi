BEGIN;
DO $migration$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ebi_atividades' AND policyname='ebi_delete_master_admin') THEN
  CREATE POLICY ebi_delete_master_admin ON public.ebi_atividades
  FOR DELETE TO authenticated USING (public.get_my_role_id() <= 2);
 END IF;
END
$migration$;
NOTIFY pgrst,'reload schema';
COMMIT;
