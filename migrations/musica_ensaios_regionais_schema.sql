create extension if not exists "pgcrypto";

create table if not exists public.musica_ensaios_regionais (
    id uuid primary key default gen_random_uuid(),
    titulo text not null default 'Ensaio Regional',
    data_ensaio date not null,
    mes_referencia text null,
    ciclo text null,
    sede_principal text null,
    status text not null default 'Planejado',
    relatorio_modelo text not null default 'Unificado por municipio e comum',
    observacoes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.musica_ensaio_locais (
    id uuid primary key default gen_random_uuid(),
    ensaio_id uuid not null references public.musica_ensaios_regionais(id) on delete cascade,
    municipio text not null,
    localidade text not null,
    comum_referencia text null,
    endereco text null,
    ordem integer not null default 0,
    observacoes text null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_ensaio_presencas (
    id uuid primary key default gen_random_uuid(),
    ensaio_id uuid not null references public.musica_ensaios_regionais(id) on delete cascade,
    municipio text not null,
    comum_congregacao text not null,
    local_ensaio text not null default '',
    musicos integer not null default 0,
    organistas integer not null default 0,
    irmandade integer not null default 0,
    ministerio integer not null default 0,
    apoio integer not null default 0,
    outros integer not null default 0,
    encarregado_local boolean not null default false,
    nome_encarregado text null,
    total_presentes integer generated always as (musicos + organistas + irmandade + ministerio + apoio + outros) stored,
    ausentes_justificados integer not null default 0,
    observacoes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint musica_ensaio_presencas_unique unique (ensaio_id, local_ensaio, municipio, comum_congregacao)
);

alter table public.musica_ensaio_presencas add column if not exists local_ensaio text not null default '';
alter table public.musica_ensaio_presencas add column if not exists irmandade integer not null default 0;
alter table public.musica_ensaio_presencas add column if not exists ministerio integer not null default 0;
alter table public.musica_ensaio_presencas add column if not exists apoio integer not null default 0;
alter table public.musica_ensaio_presencas add column if not exists outros integer not null default 0;
alter table public.musica_ensaio_presencas add column if not exists encarregado_local boolean not null default false;
alter table public.musica_ensaio_presencas add column if not exists nome_encarregado text null;
update public.musica_ensaio_presencas set local_ensaio = '' where local_ensaio is null;
alter table public.musica_ensaio_presencas alter column local_ensaio set default '';
alter table public.musica_ensaio_presencas alter column local_ensaio set not null;
alter table public.musica_ensaio_presencas drop constraint if exists musica_ensaio_presencas_unique;
alter table public.musica_ensaio_presencas add constraint musica_ensaio_presencas_unique unique (ensaio_id, local_ensaio, municipio, comum_congregacao);

create table if not exists public.musica_ensaio_participantes (
    id uuid primary key default gen_random_uuid(),
    ensaio_id uuid not null references public.musica_ensaios_regionais(id) on delete cascade,
    uuid_externo text null,
    nome_completo text not null,
    comum text null,
    cidade text null,
    cargo text null,
    nivel text null,
    instrumento text null,
    naipe_instrumento text null,
    classe_organista text null,
    local_ensaio text null,
    data_ensaio timestamptz null,
    registrado_por text null,
    sync_status text null,
    synced_at timestamptz null,
    anotacoes text null,
    duplicata text null,
    origem_arquivo text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint musica_ensaio_participantes_unique unique (ensaio_id, uuid_externo, nome_completo)
);

create index if not exists idx_musica_ensaios_data on public.musica_ensaios_regionais (data_ensaio desc);
create index if not exists idx_musica_locais_ensaio on public.musica_ensaio_locais (ensaio_id, ordem);
drop index if exists public.idx_musica_presencas_ensaio;
create index if not exists idx_musica_presencas_ensaio on public.musica_ensaio_presencas (ensaio_id, local_ensaio, municipio, comum_congregacao);
create index if not exists idx_musica_participantes_ensaio on public.musica_ensaio_participantes (ensaio_id, nome_completo);

create or replace function public.musica_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_musica_ensaios_updated_at on public.musica_ensaios_regionais;
create trigger trg_musica_ensaios_updated_at
before update on public.musica_ensaios_regionais
for each row
execute function public.musica_touch_updated_at();

drop trigger if exists trg_musica_presencas_updated_at on public.musica_ensaio_presencas;
create trigger trg_musica_presencas_updated_at
before update on public.musica_ensaio_presencas
for each row
execute function public.musica_touch_updated_at();

drop trigger if exists trg_musica_participantes_updated_at on public.musica_ensaio_participantes;
create trigger trg_musica_participantes_updated_at
before update on public.musica_ensaio_participantes
for each row
execute function public.musica_touch_updated_at();

alter table public.musica_ensaios_regionais enable row level security;
alter table public.musica_ensaio_locais enable row level security;
alter table public.musica_ensaio_presencas enable row level security;
alter table public.musica_ensaio_participantes enable row level security;

drop policy if exists "musica_ensaios_select_authenticated" on public.musica_ensaios_regionais;
create policy "musica_ensaios_select_authenticated"
on public.musica_ensaios_regionais
for select
to authenticated
using (true);

drop policy if exists "musica_ensaios_write_authenticated" on public.musica_ensaios_regionais;
create policy "musica_ensaios_write_authenticated"
on public.musica_ensaios_regionais
for all
to authenticated
using (true)
with check (true);

drop policy if exists "musica_locais_select_authenticated" on public.musica_ensaio_locais;
create policy "musica_locais_select_authenticated"
on public.musica_ensaio_locais
for select
to authenticated
using (true);

drop policy if exists "musica_locais_write_authenticated" on public.musica_ensaio_locais;
create policy "musica_locais_write_authenticated"
on public.musica_ensaio_locais
for all
to authenticated
using (true)
with check (true);

drop policy if exists "musica_presencas_select_authenticated" on public.musica_ensaio_presencas;
create policy "musica_presencas_select_authenticated"
on public.musica_ensaio_presencas
for select
to authenticated
using (true);

drop policy if exists "musica_presencas_write_authenticated" on public.musica_ensaio_presencas;
create policy "musica_presencas_write_authenticated"
on public.musica_ensaio_presencas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "musica_participantes_select_authenticated" on public.musica_ensaio_participantes;
create policy "musica_participantes_select_authenticated"
on public.musica_ensaio_participantes
for select
to authenticated
using (true);

drop policy if exists "musica_participantes_write_authenticated" on public.musica_ensaio_participantes;
create policy "musica_participantes_write_authenticated"
on public.musica_ensaio_participantes
for all
to authenticated
using (true)
with check (true);
