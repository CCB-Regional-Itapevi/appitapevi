-- Restore the access rules present in the source project.
-- Imported profiles.user_id is text; preserve it and compare UUIDs as text.
-- No profile data or user roles are changed. RLS remains enabled.
BEGIN;
DO $migration$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own_or_admin') THEN
        CREATE POLICY profiles_select_own_or_admin ON public.profiles
        FOR SELECT TO authenticated
        USING (user_id::text = auth.uid()::text OR public.get_my_role_id() <= 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own') THEN
        CREATE POLICY profiles_insert_own ON public.profiles
        FOR INSERT TO authenticated
        WITH CHECK (user_id::text = auth.uid()::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own_or_admin') THEN
        CREATE POLICY profiles_update_own_or_admin ON public.profiles
        FOR UPDATE TO authenticated
        USING (user_id::text = auth.uid()::text OR public.get_my_role_id() <= 2)
        WITH CHECK (user_id::text = auth.uid()::text OR public.get_my_role_id() <= 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_delete_master') THEN
        CREATE POLICY profiles_delete_master ON public.profiles
        FOR DELETE TO authenticated
        USING (public.get_my_role_id() = 1);
    END IF;
END
$migration$;
NOTIFY pgrst, 'reload schema';
COMMIT;
