-- Migration: Cadastro origin tracking for approvals and audit delegation
-- Purpose: identify which app/module originated each new profile request.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cadastro_origem TEXT,
    ADD COLUMN IF NOT EXISTS cadastro_origem_label TEXT,
    ADD COLUMN IF NOT EXISTS cadastro_origem_setor_sugerido TEXT,
    ADD COLUMN IF NOT EXISTS cadastro_origem_rota TEXT,
    ADD COLUMN IF NOT EXISTS cadastro_origem_url TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_status_cadastro_origem
    ON public.profiles (status, cadastro_origem);

CREATE OR REPLACE FUNCTION public.resolve_cadastro_origem_label(p_origem TEXT, p_label TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(BTRIM(p_label), ''),
        CASE lower(unaccent(COALESCE(p_origem, '')))
            WHEN 'ebi' THEN 'EBI'
            WHEN 'visitas' THEN 'Visitas'
            WHEN 'musica' THEN 'Musica'
            WHEN 'musicalizacao' THEN 'Musicalizacao'
            WHEN 'darpe' THEN 'DARPE'
            WHEN 'depac' THEN 'DEPAC'
            WHEN 'gem' THEN 'G.E.M'
            WHEN 'rjm' THEN 'RJM'
            WHEN 'administrativo' THEN 'Administrativo'
            ELSE NULL
        END,
        'Cadastro publico'
    );
$$;

CREATE OR REPLACE FUNCTION public.resolve_cadastro_origem_setor(p_origem TEXT, p_setor TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(BTRIM(p_setor), ''),
        CASE lower(unaccent(COALESCE(p_origem, '')))
            WHEN 'ebi' THEN 'Ebi'
            WHEN 'visitas' THEN 'Visitas'
            WHEN 'musica' THEN 'Musica'
            WHEN 'musicalizacao' THEN 'Musicalizacao'
            WHEN 'darpe' THEN 'Darpe'
            WHEN 'depac' THEN 'Depac'
            WHEN 'gem' THEN 'Gem'
            WHEN 'rjm' THEN 'RJM'
            WHEN 'administrativo' THEN 'Administrativo'
            ELSE NULL
        END
    );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_comum TEXT;
    v_origem TEXT;
    v_origem_label TEXT;
    v_origem_setor TEXT;
    v_origem_rota TEXT;
    v_origem_url TEXT;
    v_has_role BOOLEAN;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    v_comum := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'comum', ''),
        NULLIF(NEW.raw_user_meta_data->>'comum_congregacao', '')
    );
    v_origem := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'cadastro_origem', ''),
        NULLIF(NEW.raw_user_meta_data->>'origem', ''),
        NULLIF(NEW.raw_user_meta_data->>'origin', ''),
        'cadastro_publico'
    );
    v_origem_label := public.resolve_cadastro_origem_label(
        v_origem,
        NEW.raw_user_meta_data->>'cadastro_origem_label'
    );
    v_origem_setor := public.resolve_cadastro_origem_setor(
        v_origem,
        NEW.raw_user_meta_data->>'cadastro_origem_setor_sugerido'
    );
    v_origem_rota := NULLIF(NEW.raw_user_meta_data->>'cadastro_origem_rota', '');
    v_origem_url := NULLIF(NEW.raw_user_meta_data->>'cadastro_origem_url', '');

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'role'
    ) INTO v_has_role;

    IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = NEW.id
    ) THEN
        UPDATE public.profiles
        SET
            full_name = COALESCE(NULLIF(public.profiles.full_name, ''), v_full_name),
            comum = COALESCE(NULLIF(public.profiles.comum, ''), v_comum),
            role = CASE
                WHEN v_has_role THEN COALESCE(NULLIF(public.profiles.role, ''), 'Candidato')
                ELSE public.profiles.role
            END,
            role_id = COALESCE(public.profiles.role_id, 6),
            sector = COALESCE(NULLIF(public.profiles.sector, ''), 'Inscricao'),
            status = COALESCE(NULLIF(public.profiles.status, ''), 'pending'),
            cadastro_origem = COALESCE(NULLIF(public.profiles.cadastro_origem, ''), v_origem),
            cadastro_origem_label = COALESCE(NULLIF(public.profiles.cadastro_origem_label, ''), v_origem_label),
            cadastro_origem_setor_sugerido = COALESCE(NULLIF(public.profiles.cadastro_origem_setor_sugerido, ''), v_origem_setor),
            cadastro_origem_rota = COALESCE(NULLIF(public.profiles.cadastro_origem_rota, ''), v_origem_rota),
            cadastro_origem_url = COALESCE(NULLIF(public.profiles.cadastro_origem_url, ''), v_origem_url)
        WHERE user_id = NEW.id;
    ELSE
        INSERT INTO public.profiles (
            user_id,
            full_name,
            comum,
            role,
            role_id,
            sector,
            status,
            cadastro_origem,
            cadastro_origem_label,
            cadastro_origem_setor_sugerido,
            cadastro_origem_rota,
            cadastro_origem_url
        )
        VALUES (
            NEW.id,
            v_full_name,
            v_comum,
            'Candidato',
            6,
            'Inscricao',
            'pending',
            v_origem,
            v_origem_label,
            v_origem_setor,
            v_origem_rota,
            v_origem_url
        );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.cadastro_origem IS
'Origem tecnica do cadastro: ebi, visitas, musica, musicalizacao, darpe, depac, gem, rjm, administrativo ou cadastro_publico.';

COMMENT ON COLUMN public.profiles.cadastro_origem_label IS
'Nome amigavel da origem exibido na liberacao de usuarios e auditoria.';

COMMENT ON COLUMN public.profiles.cadastro_origem_setor_sugerido IS
'Setor sugerido para delegar a analise/liberacao do cadastro.';
