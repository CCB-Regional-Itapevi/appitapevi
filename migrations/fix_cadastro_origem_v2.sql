-- =============================================================================
-- FIX DEFINITIVO: Coluna cadastro_origem na tabela profiles
-- Projeto: REG-IT / APP_GLOBAL
-- Data: 2026-05-19
--
-- PROBLEMA RAIZ:
--   O campo `cadastro_origem` vive em `auth.users.raw_user_meta_data`,
--   mas o painel admin lê apenas da tabela `profiles`. Por isso a coluna
--   "Origem" sempre fica vazia/fallback no painel de usuários pendentes.
--
-- SOLUÇÃO (execute TUDO de uma vez no SQL Editor do Supabase):
--   1. Adiciona coluna `cadastro_origem` e `cadastro_origem_label` na tabela profiles
--   2. Preenche com os dados do metadata para todos os usuários existentes
--   3. Corrige a trigger para gravar esses campos automaticamente em novos cadastros
-- =============================================================================


-- -----------------------------------------------------------------------
-- PASSO 1: Adicionar colunas à tabela profiles
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cadastro_origem       TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cadastro_origem_label TEXT DEFAULT '';


-- -----------------------------------------------------------------------
-- PASSO 2: Preencher as colunas para usuários já cadastrados
--          lendo o metadata de auth.users
-- -----------------------------------------------------------------------

UPDATE public.profiles p
SET
    cadastro_origem = COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'cadastro_origem'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'origem'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'setor'), ''),
        'cadastro_publico'
    ),
    cadastro_origem_label = COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'cadastro_origem_label'), ''),
        CASE lower(COALESCE(
            NULLIF(TRIM(u.raw_user_meta_data->>'cadastro_origem'), ''),
            NULLIF(TRIM(u.raw_user_meta_data->>'origem'), ''),
            NULLIF(TRIM(u.raw_user_meta_data->>'setor'), ''),
            ''
        ))
            WHEN 'ebi'            THEN 'EBI'
            WHEN 'musicalizacao'  THEN 'Musicalização'
            WHEN 'musica'         THEN 'Música'
            WHEN 'visitas'        THEN 'Visitas'
            WHEN 'darpe'          THEN 'DARPE'
            WHEN 'depac'          THEN 'DEPAC'
            WHEN 'gem'            THEN 'GEM'
            WHEN 'rjm'            THEN 'RJM'
            WHEN 'administrativo' THEN 'Administrativo'
            ELSE 'Cadastro Público'
        END
    ),
    -- Também corrige o sector enquanto estamos aqui
    sector = CASE lower(COALESCE(
        NULLIF(TRIM(u.raw_user_meta_data->>'cadastro_origem'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'origem'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'setor'), ''),
        ''
    ))
        WHEN 'ebi'            THEN 'Ebi'
        WHEN 'musicalizacao'  THEN 'Musicalizacao'
        WHEN 'musica'         THEN 'Musica'
        WHEN 'visitas'        THEN 'Visitas'
        WHEN 'darpe'          THEN 'Darpe'
        WHEN 'depac'          THEN 'Depac'
        WHEN 'gem'            THEN 'Gem'
        WHEN 'rjm'            THEN 'RJM'
        WHEN 'administrativo' THEN 'Administrativo'
        ELSE p.sector  -- mantém o que já tem se não houver origem
    END,
    updated_at = NOW()
FROM auth.users u
WHERE p.user_id = u.id;


-- -----------------------------------------------------------------------
-- PASSO 3: Corrigir a trigger para gravar cadastro_origem em novos cadastros
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name            TEXT;
    v_comum                TEXT;
    v_has_role             BOOLEAN;
    v_origem_key           TEXT;
    v_origem_label         TEXT;
    v_sector               TEXT;
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

    -- Captura a chave de origem do metadata (enviada pelos apps no signUp)
    v_origem_key := lower(COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'cadastro_origem'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'origem'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'setor'), ''),
        'cadastro_publico'
    ));

    -- Mapeia para a label legível
    v_origem_label := CASE v_origem_key
        WHEN 'ebi'            THEN 'EBI'
        WHEN 'musicalizacao'  THEN 'Musicalização'
        WHEN 'musica'         THEN 'Música'
        WHEN 'visitas'        THEN 'Visitas'
        WHEN 'darpe'          THEN 'DARPE'
        WHEN 'depac'          THEN 'DEPAC'
        WHEN 'gem'            THEN 'GEM'
        WHEN 'rjm'            THEN 'RJM'
        WHEN 'administrativo' THEN 'Administrativo'
        ELSE COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'cadastro_origem_label'), ''),
            'Cadastro Público'
        )
    END;

    -- Mapeia para o sector correto da tabela sectors
    v_sector := CASE v_origem_key
        WHEN 'ebi'            THEN 'Ebi'
        WHEN 'musicalizacao'  THEN 'Musicalizacao'
        WHEN 'musica'         THEN 'Musica'
        WHEN 'visitas'        THEN 'Visitas'
        WHEN 'darpe'          THEN 'Darpe'
        WHEN 'depac'          THEN 'Depac'
        WHEN 'gem'            THEN 'Gem'
        WHEN 'rjm'            THEN 'RJM'
        WHEN 'administrativo' THEN 'Administrativo'
        ELSE 'Inscrição'
    END;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) INTO v_has_role;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
        UPDATE public.profiles
        SET
            full_name            = COALESCE(NULLIF(public.profiles.full_name, ''), v_full_name),
            comum                = COALESCE(NULLIF(public.profiles.comum, ''), v_comum),
            role                 = CASE WHEN v_has_role THEN COALESCE(NULLIF(public.profiles.role, ''), 'Candidato') ELSE public.profiles.role END,
            role_id              = COALESCE(public.profiles.role_id, 6),
            sector               = CASE
                WHEN lower(unaccent(COALESCE(public.profiles.sector, ''))) IN ('inscricao', 'inscrição', '')
                THEN v_sector
                ELSE public.profiles.sector
            END,
            cadastro_origem      = COALESCE(NULLIF(public.profiles.cadastro_origem, ''), v_origem_key),
            cadastro_origem_label = COALESCE(NULLIF(public.profiles.cadastro_origem_label, ''), v_origem_label),
            status               = COALESCE(NULLIF(public.profiles.status, ''), 'pending')
        WHERE user_id = NEW.id;
    ELSE
        INSERT INTO public.profiles (
            user_id, full_name, comum, role, role_id,
            sector, status, cadastro_origem, cadastro_origem_label
        ) VALUES (
            NEW.id, v_full_name, v_comum, 'Candidato', 6,
            v_sector, 'pending', v_origem_key, v_origem_label
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();


-- -----------------------------------------------------------------------
-- VERIFICAÇÃO: Confirme o resultado após executar
-- -----------------------------------------------------------------------

SELECT
    p.full_name,
    p.cadastro_origem,
    p.cadastro_origem_label,
    p.sector,
    p.status
FROM public.profiles p
WHERE p.status = 'pending'
ORDER BY p.created_at ASC
LIMIT 20;
