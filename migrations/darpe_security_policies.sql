-- SCRIPT DE SEGURANÇA (RLS) PARA O MÓDULO D.A.R.P.E.
-- Execute este script no SQL Editor do seu Supabase para liberar o acesso aos dados.

BEGIN;

-- 1. Garantir que o RLS está ativado para as tabelas
ALTER TABLE public.darpe_musicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.darpe_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.darpe_atendimentos ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas se existirem (para evitar erros ao rodar novamente)
DROP POLICY IF EXISTS darpe_musicos_select_authenticated ON public.darpe_musicos;
DROP POLICY IF EXISTS darpe_musicos_all_master_admin ON public.darpe_musicos;
DROP POLICY IF EXISTS darpe_clinicas_select_authenticated ON public.darpe_clinicas;
DROP POLICY IF EXISTS darpe_clinicas_all_master_admin ON public.darpe_clinicas;
DROP POLICY IF EXISTS darpe_atendimentos_select_authenticated ON public.darpe_atendimentos;
DROP POLICY IF EXISTS darpe_atendimentos_all_master_admin ON public.darpe_atendimentos;

-- ==========================================
-- POLÍTICAS PARA: darpe_musicos
-- ==========================================

-- Permissão de leitura para todos os usuários logados
CREATE POLICY darpe_musicos_select_authenticated
ON public.darpe_musicos FOR SELECT
TO authenticated
USING (true);

-- Permissão total (Insert/Update/Delete) apenas para Master (1) e Admin (2)
CREATE POLICY darpe_musicos_all_master_admin
ON public.darpe_musicos FOR ALL
TO authenticated
USING (coalesce(public.get_my_role_id(), 99) <= 2)
WITH CHECK (coalesce(public.get_my_role_id(), 99) <= 2);

-- ==========================================
-- POLÍTICAS PARA: darpe_clinicas
-- ==========================================

-- Permissão de leitura para todos os usuários logados
CREATE POLICY darpe_clinicas_select_authenticated
ON public.darpe_clinicas FOR SELECT
TO authenticated
USING (true);

-- Permissão total (Insert/Update/Delete) apenas para Master (1) e Admin (2)
CREATE POLICY darpe_clinicas_all_master_admin
ON public.darpe_clinicas FOR ALL
TO authenticated
USING (coalesce(public.get_my_role_id(), 99) <= 2)
WITH CHECK (coalesce(public.get_my_role_id(), 99) <= 2);

-- ==========================================
-- POLÍTICAS PARA: darpe_atendimentos
-- ==========================================

-- Permissão de leitura para todos os usuários logados
CREATE POLICY darpe_atendimentos_select_authenticated
ON public.darpe_atendimentos FOR SELECT
TO authenticated
USING (true);

-- Permissão total (Insert/Update/Delete) apenas para Master (1) e Admin (2)
CREATE POLICY darpe_atendimentos_all_master_admin
ON public.darpe_atendimentos FOR ALL
TO authenticated
USING (coalesce(public.get_my_role_id(), 99) <= 2)
WITH CHECK (coalesce(public.get_my_role_id(), 99) <= 2);

COMMIT;

-- INSTRUÇÃO: Copie todo este conteúdo, cole no SQL Editor do Supabase e clique em 'Run'.
-- Isso desbloqueará os dados para que o aplicativo possa exibi-los.
