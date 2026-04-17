-- Migration v5: reliable access session tracking for audit dashboards
-- Goal: count real system accesses/login sessions without depending on page-view logs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.audit_access_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz NULL,
    status text NOT NULL DEFAULT 'active',
    logout_reason text NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_access_sessions_status_check CHECK (
        status IN ('active', 'logged_out', 'inactive_timeout', 'expired')
    )
);

CREATE INDEX IF NOT EXISTS idx_audit_access_sessions_started_at_desc
    ON public.audit_access_sessions (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_access_sessions_user_started_at_desc
    ON public.audit_access_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_access_sessions_status_started_at_desc
    ON public.audit_access_sessions (status, started_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_access_sessions_updated_at ON public.audit_access_sessions;
CREATE TRIGGER trg_audit_access_sessions_updated_at
BEFORE UPDATE ON public.audit_access_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.audit_access_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for own audit access sessions" ON public.audit_access_sessions;
CREATE POLICY "Allow insert for own audit access sessions"
ON public.audit_access_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Allow update for own audit access sessions" ON public.audit_access_sessions;
CREATE POLICY "Allow update for own audit access sessions"
ON public.audit_access_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.get_my_role_id() = 1)
WITH CHECK (auth.uid() = user_id OR public.get_my_role_id() = 1);

DROP POLICY IF EXISTS "Allow select for Master on audit access sessions" ON public.audit_access_sessions;
CREATE POLICY "Allow select for Master on audit access sessions"
ON public.audit_access_sessions
FOR SELECT
TO authenticated
USING (public.get_my_role_id() = 1);

-- Backfill access sessions from historical LOGIN/LOGOUT records when available.
INSERT INTO public.audit_access_sessions (
    id,
    user_id,
    started_at,
    last_activity_at,
    ended_at,
    status,
    logout_reason,
    details
)
SELECT
    gen_random_uuid(),
    login_log.user_id,
    login_log.created_at,
    COALESCE(logout_log.created_at, login_log.created_at),
    logout_log.created_at,
    COALESCE(
        CASE
            WHEN logout_log.action = 'AUTH_FORCE_LOGOUT_INACTIVE' THEN 'inactive_timeout'
            WHEN logout_log.action = 'LOGOUT' THEN 'logged_out'
            ELSE 'active'
        END,
        'active'
    ) AS status,
    COALESCE(logout_log.details ->> 'reason', logout_log.action, NULL) AS logout_reason,
    jsonb_strip_nulls(jsonb_build_object(
        'source', 'audit_backfill',
        'actor_name', COALESCE(login_log.details ->> 'actor_name', profile.full_name, profile.username, profile.email),
        'email', COALESCE(login_log.details ->> 'email', profile.email),
        'resolved_role', login_log.details ->> 'resolved_role',
        'resolved_sector', login_log.details ->> 'resolved_sector'
    )) AS details
FROM public.audit_logs AS login_log
LEFT JOIN LATERAL (
    SELECT candidate.action, candidate.created_at, candidate.details
    FROM public.audit_logs AS candidate
    WHERE candidate.user_id = login_log.user_id
      AND candidate.created_at >= login_log.created_at
      AND candidate.action IN ('LOGOUT', 'AUTH_FORCE_LOGOUT_INACTIVE')
    ORDER BY candidate.created_at ASC
    LIMIT 1
) AS logout_log ON true
LEFT JOIN public.profiles AS profile
    ON profile.user_id = login_log.user_id
WHERE login_log.action = 'LOGIN'
  AND NOT EXISTS (
      SELECT 1
      FROM public.audit_access_sessions AS existing_session
      WHERE existing_session.user_id = login_log.user_id
        AND existing_session.started_at = login_log.created_at
  );

CREATE OR REPLACE FUNCTION public.get_audit_access_summary(
    p_from_date timestamptz DEFAULT NULL,
    p_to_date timestamptz DEFAULT NULL,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    user_id uuid,
    actor_name text,
    total_accesses bigint,
    total_logins bigint,
    active_sessions bigint,
    last_access_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        access_session.user_id,
        COALESCE(
            MAX(NULLIF(access_session.details ->> 'actor_name', '')),
            MAX(NULLIF(profile.full_name, '')),
            MAX(NULLIF(profile.username, '')),
            MAX(NULLIF(profile.email, '')),
            'Sistema'
        ) AS actor_name,
        COUNT(*)::bigint AS total_accesses,
        COUNT(*)::bigint AS total_logins,
        COUNT(*) FILTER (
            WHERE access_session.status = 'active'
              AND access_session.ended_at IS NULL
        )::bigint AS active_sessions,
        MAX(access_session.started_at) AS last_access_at
    FROM public.audit_access_sessions AS access_session
    LEFT JOIN public.profiles AS profile
        ON profile.user_id = access_session.user_id
    WHERE public.get_my_role_id() = 1
      AND (p_from_date IS NULL OR access_session.started_at >= p_from_date)
      AND (p_to_date IS NULL OR access_session.started_at <= p_to_date)
      AND (p_user_id IS NULL OR access_session.user_id = p_user_id)
    GROUP BY access_session.user_id
    ORDER BY COUNT(*) DESC, MAX(access_session.started_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_access_summary(timestamptz, timestamptz, uuid) TO authenticated;

COMMENT ON TABLE public.audit_access_sessions IS 'Reliable per-session access log used to count real system accesses and logins.';
COMMENT ON FUNCTION public.get_audit_access_summary(timestamptz, timestamptz, uuid) IS 'Aggregated access-session summary for master audit dashboards.';
