-- Migration v6: persistent login counters on profiles
-- Goal: keep consolidated access counters directly on the user profile,
-- similar to APP_SAM, while audit/session tracking remains detailed.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS contador_logins bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS data_ultimo_login timestamptz NULL,
    ADD COLUMN IF NOT EXISTS contador_logouts bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS data_ultimo_logout timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_contador_logins_desc
    ON public.profiles (contador_logins DESC, data_ultimo_login DESC);

UPDATE public.profiles AS profile
SET
    contador_logins = COALESCE(login_totals.total_logins, profile.contador_logins, 0),
    data_ultimo_login = COALESCE(login_totals.last_login_at, profile.data_ultimo_login),
    contador_logouts = COALESCE(logout_totals.total_logouts, profile.contador_logouts, 0),
    data_ultimo_logout = COALESCE(logout_totals.last_logout_at, profile.data_ultimo_logout)
FROM (
    SELECT
        user_id,
        COUNT(*) FILTER (WHERE action = 'LOGIN')::bigint AS total_logins,
        MAX(created_at) FILTER (WHERE action = 'LOGIN') AS last_login_at
    FROM public.audit_logs
    WHERE user_id IS NOT NULL
    GROUP BY user_id
) AS login_totals
LEFT JOIN (
    SELECT
        user_id,
        COUNT(*) FILTER (WHERE action IN ('LOGOUT', 'AUTH_FORCE_LOGOUT_INACTIVE'))::bigint AS total_logouts,
        MAX(created_at) FILTER (WHERE action IN ('LOGOUT', 'AUTH_FORCE_LOGOUT_INACTIVE')) AS last_logout_at
    FROM public.audit_logs
    WHERE user_id IS NOT NULL
    GROUP BY user_id
) AS logout_totals
    ON logout_totals.user_id = login_totals.user_id
WHERE profile.user_id = login_totals.user_id;

COMMENT ON COLUMN public.profiles.contador_logins IS 'Total consolidado de logins bem-sucedidos do usuário.';
COMMENT ON COLUMN public.profiles.data_ultimo_login IS 'Data/hora do último login bem-sucedido do usuário.';
COMMENT ON COLUMN public.profiles.contador_logouts IS 'Total consolidado de encerramentos de sessão do usuário.';
COMMENT ON COLUMN public.profiles.data_ultimo_logout IS 'Data/hora do último logout do usuário.';
