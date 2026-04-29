create extension if not exists "pgcrypto";

create table if not exists public.musica_justificativas (
    id uuid primary key default gen_random_uuid(),
    ensaio_id uuid null references public.musica_ensaios_regionais(id) on delete set null,
    tipo_evento text not null default 'Ensaio Regional',
    nome_evento text null,
    data_evento date null,
    nome text not null,
    comum text not null,
    municipio text null,
    cargo text null,
    instrumento text null,
    motivo text not null,
    status text not null default 'Recebida',
    contato text null,
    registrado_por text null,
    origem_aplicacao text not null default 'APP_GLOBAL',
    referencia_externa text null,
    observacoes text null,
    payload_origem jsonb null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint musica_justificativas_status_check
        check (status = 'Recebida'),
    constraint musica_justificativas_tipo_evento_check
        check (tipo_evento in ('Ensaio Regional', 'Reunião do Ministério', 'Reunião Técnica', 'Outros eventos da Música'))
);

alter table public.musica_justificativas add column if not exists ensaio_id uuid null references public.musica_ensaios_regionais(id) on delete set null;
alter table public.musica_justificativas add column if not exists tipo_evento text not null default 'Ensaio Regional';
alter table public.musica_justificativas add column if not exists nome_evento text null;
alter table public.musica_justificativas add column if not exists data_evento date null;
alter table public.musica_justificativas add column if not exists nome text not null default '';
alter table public.musica_justificativas add column if not exists comum text not null default '';
alter table public.musica_justificativas add column if not exists municipio text null;
alter table public.musica_justificativas add column if not exists cargo text null;
alter table public.musica_justificativas add column if not exists instrumento text null;
alter table public.musica_justificativas add column if not exists motivo text not null default '';
alter table public.musica_justificativas add column if not exists status text not null default 'Recebida';
alter table public.musica_justificativas add column if not exists contato text null;
alter table public.musica_justificativas add column if not exists registrado_por text null;
alter table public.musica_justificativas add column if not exists origem_aplicacao text not null default 'APP_GLOBAL';
alter table public.musica_justificativas add column if not exists referencia_externa text null;
alter table public.musica_justificativas add column if not exists observacoes text null;
alter table public.musica_justificativas add column if not exists payload_origem jsonb null;
alter table public.musica_justificativas add column if not exists created_at timestamptz not null default now();
alter table public.musica_justificativas add column if not exists updated_at timestamptz not null default now();

alter table public.musica_justificativas drop constraint if exists musica_justificativas_status_check;
alter table public.musica_justificativas add constraint musica_justificativas_status_check
    check (status = 'Recebida');

alter table public.musica_justificativas drop constraint if exists musica_justificativas_tipo_evento_check;
update public.musica_justificativas
set tipo_evento = case
    when lower(translate(tipo_evento, 'ãáâàéêíóôõúçÃÁÂÀÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) = 'reuniao do ministerio' then 'Reunião do Ministério'
    when lower(translate(tipo_evento, 'ãáâàéêíóôõúçÃÁÂÀÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) = 'reuniao tecnica' then 'Reunião Técnica'
    when lower(translate(tipo_evento, 'ãáâàéêíóôõúçÃÁÂÀÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('outro evento da musica', 'outros eventos da musica') then 'Outros eventos da Música'
    else 'Ensaio Regional'
end
where tipo_evento is null
   or tipo_evento not in ('Ensaio Regional', 'Reunião do Ministério', 'Reunião Técnica', 'Outros eventos da Música');

alter table public.musica_justificativas add constraint musica_justificativas_tipo_evento_check
    check (tipo_evento in ('Ensaio Regional', 'Reunião do Ministério', 'Reunião Técnica', 'Outros eventos da Música'));

create index if not exists idx_musica_justificativas_data on public.musica_justificativas (data_evento desc, tipo_evento);
create index if not exists idx_musica_justificativas_comum on public.musica_justificativas (municipio, comum);
create index if not exists idx_musica_justificativas_origem on public.musica_justificativas (origem_aplicacao, referencia_externa);

create unique index if not exists musica_justificativas_referencia_externa_unique
on public.musica_justificativas (origem_aplicacao, referencia_externa)
where referencia_externa is not null and referencia_externa <> '';

create or replace function public.musica_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_musica_justificativas_updated_at on public.musica_justificativas;
create trigger trg_musica_justificativas_updated_at
before update on public.musica_justificativas
for each row
execute function public.musica_touch_updated_at();

alter table public.musica_justificativas enable row level security;

drop policy if exists "musica_justificativas_select_authenticated" on public.musica_justificativas;
create policy "musica_justificativas_select_authenticated"
on public.musica_justificativas
for select
to authenticated
using (true);

drop policy if exists "musica_justificativas_write_authenticated" on public.musica_justificativas;
create policy "musica_justificativas_write_authenticated"
on public.musica_justificativas
for all
to authenticated
using (true)
with check (true);

drop policy if exists "musica_justificativas_insert_anon" on public.musica_justificativas;
create policy "musica_justificativas_insert_anon"
on public.musica_justificativas
for insert
to anon
with check (true);

grant select, insert, update, delete on table public.musica_justificativas to authenticated;
grant insert on table public.musica_justificativas to anon;

comment on table public.musica_justificativas is
    'Justificativas de ausencia da musica recebidas do APP_GLOBAL ou de aplicacoes externas.';
