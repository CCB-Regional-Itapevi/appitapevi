BEGIN;
CREATE OR REPLACE VIEW public.app_profiles WITH (security_invoker=true) AS
SELECT * FROM public.profiles p
WHERE COALESCE(p.role_id::integer <= 2,false)
OR lower(COALESCE(p.sector,'')) IN ('global','administrativo','admin','master')
OR (lower(COALESCE(p.sector,'')) NOT IN ('musica','musicalizacao','musicaliza??o','m?sica','darpe','rjm','depac','gem') AND (lower(COALESCE(p.cadastro_origem,'')) IN ('ebi','visitas','app_visitas_regional','administrativo') OR (lower(COALESCE(p.cadastro_origem,'')) IN ('','cadastro_publico') AND lower(COALESCE(p.sector,'')) IN ('ebi','visitas','inscri??o','inscricao',''))))
WITH LOCAL CHECK OPTION;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.app_profiles TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
