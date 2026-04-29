-- Migration: Audit logs hardening and query optimization (v4)
-- Goal: restrict audit trail consultation to Master users only
-- and improve performance for timeline and filter screens.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc
    ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_action_created_at
    ON public.audit_logs (user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action_created_at
    ON public.audit_logs (module, action, created_at DESC);

DROP POLICY IF EXISTS "Allow select for Master and Admin only" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow select for Master only" ON public.audit_logs;

CREATE POLICY "Allow select for Master only"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.get_my_role_id() = 1);

COMMENT ON TABLE public.audit_logs IS 'Professional audit trail for authentication, navigation and sensitive business actions. Read access restricted to Master users.';
