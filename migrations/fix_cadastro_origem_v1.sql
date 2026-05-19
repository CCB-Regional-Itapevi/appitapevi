-- =============================================================================
-- FIX: Mapeamento de Origem de Cadastro
-- Projeto: REG-IT / APP_GLOBAL
-- Data: 2026-05-19
--
-- PROBLEMA:
--   Todos os cadastros chegavam como "Inscrição" / "Cadastro Público" porque:
--   1. Os apps (EBI, Visitas, etc.) não passavam `cadastro_origem` no signUp
--   2. A trigger `handle_new_user_profile` ignorava o campo `cadastro_origem`
--      do metadata e sempre gravava `sector = 'Inscrição'`
--
-- SOLUÇÃO:
--   1. Atualiza os perfis existentes lendo o `cadastro_origem` do metadata
--      armazenado em `auth.users.raw_user_meta_data`
--   2. Corrige a trigger para que novos cadastros usem o `cadastro_origem`
--      do metadata como fonte primária do setor
--
-- COMO EXECUTAR:
--   Cole este script no SQL Editor do Supabase e execute.
--   Operação segura: apenas faz UPDATE onde `cadastro_origem` existe no metadata.
-- =============================================================================

-- -----------------------------------------------------------------------
-- PARTE 1: Corrigir perfis existentes que estão como "Inscrição"
--          lendo o campo `cadastro_origem` do metadata do Auth
-- -----------------------------------------------------------------------

UPDATE public.profiles p
SET
    sector = CASE lower(unaccent(u.raw_user_meta_data->>'cadastro_origem'))
        WHEN 'ebi'            THEN 'Ebi'
        WHEN 'musicalizacao'  THEN 'Musicalizacao'
        WHEN 'musica'         THEN 'Musica'
        WHEN 'visitas'        THEN 'Visitas'
        WHEN 'darpe'          THEN 'Darpe'
        WHEN 'depac'          THEN 'Depac'
        WHEN 'gem'            THEN 'Gem'
        WHEN 'rjm'            THEN 'RJM'
        WHEN 'administrativo' THEN 'Administrativo'
        WHEN 'exames'         THEN 'RJM'
        ELSE 'Inscrição'
    END,
    updated_at = NOW()
FROM auth.users u
WHERE
    p.user_id = u.id
    -- Só atualiza onde existe um cadastro_origem no metadata
    AND NULLIF(TRIM(u.raw_user_meta_data->>'cadastro_origem'), '') IS NOT NULL
    -- E o setor atual ainda está como padrão genérico
    AND lower(unaccent(COALESCE(p.sector, ''))) IN ('inscricao', 'inscrição', '');

-- Confirmação: mostre quantos registros foram atualizados
-- (execute separadamente para ver o resultado)
SELECT
    sector,
    COUNT(*) AS total
FROM public.profiles
GROUP BY sector
ORDER BY total DESC;


-- -----------------------------------------------------------------------
-- PARTE 2: Corrigir a Trigger para que novos cadastros também leiam
--          o `cadastro_origem` do metadata ao criar o perfil
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_comum     TEXT;
    v_has_role  BOOLEAN;
    v_origem    TEXT;
    v_sector    TEXT;
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

    -- Lê o campo de origem do metadata (enviado pelos apps no signUp)
    v_origem := lower(unaccent(COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'cadastro_origem', ''),
        NULLIF(NEW.raw_user_meta_data->>'origem', ''),
        NULLIF(NEW.raw_user_meta_data->>'setor', ''),
        ''
    )));

    -- Mapeia o valor de origem para o setor correto da tabela sectors
    v_sector := CASE v_origem
        WHEN 'ebi'            THEN 'Ebi'
        WHEN 'musicalizacao'  THEN 'Musicalizacao'
        WHEN 'musica'         THEN 'Musica'
        WHEN 'visitas'        THEN 'Visitas'
        WHEN 'darpe'          THEN 'Darpe'
        WHEN 'depac'          THEN 'Depac'
        WHEN 'gem'            THEN 'Gem'
        WHEN 'rjm'            THEN 'RJM'
        WHEN 'exames'         THEN 'RJM'
        WHEN 'administrativo' THEN 'Administrativo'
        ELSE 'Inscrição'   -- fallback quando não veio origem
    END;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'role'
    ) INTO v_has_role;

    IF EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = NEW.id
    ) THEN
        -- Perfil já existe: atualiza os campos ausentes
        UPDATE public.profiles
        SET
            full_name = COALESCE(NULLIF(public.profiles.full_name, ''), v_full_name),
            comum     = COALESCE(NULLIF(public.profiles.comum, ''), v_comum),
            role      = CASE
                WHEN v_has_role THEN COALESCE(NULLIF(public.profiles.role, ''), 'Candidato')
                ELSE public.profiles.role
            END,
            role_id   = COALESCE(public.profiles.role_id, 6),
            -- Usa o setor da origem se o perfil ainda estiver como 'Inscrição'
            sector    = CASE
                WHEN lower(unaccent(COALESCE(public.profiles.sector, ''))) IN ('inscricao', 'inscrição', '')
                THEN v_sector
                ELSE public.profiles.sector
            END,
            status    = COALESCE(NULLIF(public.profiles.status, ''), 'pending')
        WHERE user_id = NEW.id;
    ELSE
        -- Cria novo perfil com o setor correto
        INSERT INTO public.profiles (
            user_id,
            full_name,
            comum,
            role,
            role_id,
            sector,
            status
        )
        VALUES (
            NEW.id,
            v_full_name,
            v_comum,
            'Candidato',
            6,
            v_sector,   -- <-- agora usa a origem real, não mais 'Inscrição' fixo
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Recria o trigger (já existe, mas precisa recriar para usar a nova função)
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

COMMENT ON FUNCTION public.handle_new_user_profile() IS
'Cria ou atualiza o perfil em public.profiles ao criar usuário em auth.users.
 Lê cadastro_origem/origem/setor do metadata para determinar o setor correto.
 Versão corrigida em 2026-05-19 para resolver bug de "Inscrição" genérico.';
