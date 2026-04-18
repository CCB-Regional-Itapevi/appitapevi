-- Migration isolada para cadastro de grupos de visita.
-- Nao altera visitas_comuns, visitas_agenda, visitas_irmandade nem visitas_lancamentos.

create extension if not exists pgcrypto;

create table if not exists public.visitas_grupos (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    municipio text not null,
    comum_base text null,
    codigo_comum text null,
    lider_nome text null,
    lider_telefone text null,
    dia_visita text null,
    periodicidade text not null default 'Semanal',
    capacidade int not null default 0 check (capacidade >= 0),
    status text not null default 'Ativo',
    observacoes text null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    created_by uuid null,
    updated_by uuid null
);

create index if not exists idx_visitas_grupos_municipio
    on public.visitas_grupos (municipio);

create index if not exists idx_visitas_grupos_status
    on public.visitas_grupos (status);

create index if not exists idx_visitas_grupos_nome
    on public.visitas_grupos (nome);

create or replace function public.set_visitas_grupos_audit_fields()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        new.created_at = coalesce(new.created_at, timezone('utc', now()));
        new.created_by = coalesce(new.created_by, auth.uid());
    end if;

    new.nome = nullif(btrim(coalesce(new.nome, '')), '');
    new.municipio = nullif(btrim(coalesce(new.municipio, '')), '');
    new.comum_base = nullif(btrim(coalesce(new.comum_base, '')), '');
    new.codigo_comum = nullif(btrim(coalesce(new.codigo_comum, '')), '');
    new.lider_nome = nullif(btrim(coalesce(new.lider_nome, '')), '');
    new.lider_telefone = nullif(btrim(coalesce(new.lider_telefone, '')), '');
    new.dia_visita = nullif(btrim(coalesce(new.dia_visita, '')), '');
    new.periodicidade = coalesce(nullif(btrim(coalesce(new.periodicidade, '')), ''), 'Semanal');
    new.status = coalesce(nullif(btrim(coalesce(new.status, '')), ''), 'Ativo');
    new.capacidade = greatest(coalesce(new.capacidade, 0), 0);
    new.updated_at = timezone('utc', now());
    new.updated_by = auth.uid();

    return new;
end;
$$;

drop trigger if exists trg_visitas_grupos_audit_fields on public.visitas_grupos;
create trigger trg_visitas_grupos_audit_fields
before insert or update on public.visitas_grupos
for each row
execute function public.set_visitas_grupos_audit_fields();

grant all on table public.visitas_grupos to authenticated;
grant all on table public.visitas_grupos to service_role;

alter table public.visitas_grupos enable row level security;

drop policy if exists visitas_grupos_select_authenticated on public.visitas_grupos;
create policy visitas_grupos_select_authenticated
on public.visitas_grupos
for select
to authenticated
using (true);

drop policy if exists visitas_grupos_insert_authenticated on public.visitas_grupos;
create policy visitas_grupos_insert_authenticated
on public.visitas_grupos
for insert
to authenticated
with check (public.can_manage_visitas());

drop policy if exists visitas_grupos_update_authenticated on public.visitas_grupos;
create policy visitas_grupos_update_authenticated
on public.visitas_grupos
for update
to authenticated
using (public.can_manage_visitas())
with check (public.can_manage_visitas());

drop policy if exists visitas_grupos_delete_authenticated on public.visitas_grupos;
create policy visitas_grupos_delete_authenticated
on public.visitas_grupos
for delete
to authenticated
using (public.can_manage_visitas());
