BEGIN;
DO $migration$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['ebi_atividades','ebi_criancas','ebi_monitores'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=table_name AND policyname='ebi_select_active_roles') THEN
   EXECUTE format('CREATE POLICY ebi_select_active_roles ON public.%I FOR SELECT TO authenticated USING (public.get_my_role_id() <= 2 OR (public.get_my_role_id() IN (3,4) AND lower(public.get_my_sector_name()) = ''ebi''))',table_name);
  END IF;
 END LOOP;
END
$migration$;
NOTIFY pgrst,'reload schema';
COMMIT;
