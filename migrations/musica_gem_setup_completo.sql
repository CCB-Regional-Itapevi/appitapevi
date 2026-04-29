-- Implantacao completa do modulo G.E.M. com prefixo musica_
-- Ordem incluida no proprio arquivo:
-- 1. Cria/atualiza schema
-- 2. Concede grants
-- 3. Cria seeds das fases
-- 4. Ativa RLS
-- 5. Cria policies

BEGIN;

create extension if not exists "pgcrypto";

create table if not exists public.musica_acompanhamento_aluno (
    id uuid primary key default gen_random_uuid(),
    nome_aluno text not null,
    status text not null default 'Ativo',
    lancado_por text null,
    mensagens integer not null default 0,
    comum_congregacao text null,
    cargo_ministerio text null,
    nivel text null,
    instrumento text null,
    registro_msa text null,
    observacoes text null,
    municipio text null,
    foto_url text null,
    programa_minimo_percentual numeric(5,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.musica_msa_fases (
    id uuid primary key default gen_random_uuid(),
    fase text not null unique,
    ordem integer not null unique,
    pagina_inicial integer null,
    pagina_final integer null,
    licao_inicial integer null,
    licao_final integer null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_acompanhamento_msa (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.musica_acompanhamento_aluno(id) on delete cascade,
    data_aula date not null,
    fase text not null,
    paginas text null,
    licoes text null,
    clave text null,
    observacoes text null,
    autorizado_por text null,
    comum_congregacao text null,
    municipio text null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_acompanhamento_provas (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.musica_acompanhamento_aluno(id) on delete cascade,
    data_prova date not null,
    modulo text not null,
    nota numeric(5,2) null,
    observacoes text null,
    autorizado_por text null,
    comum_congregacao text null,
    municipio text null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_acompanhamento_metodo (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.musica_acompanhamento_aluno(id) on delete cascade,
    data_inicio date not null,
    metodo text not null,
    pagina text null,
    licao text null,
    observacoes text null,
    autorizado_por text null,
    comum_congregacao text null,
    municipio text null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_acompanhamento_hinario (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.musica_acompanhamento_aluno(id) on delete cascade,
    data date not null,
    hino text not null,
    voz text null,
    observacoes text null,
    autorizado_por text null,
    comum_congregacao text null,
    municipio text null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_acompanhamento_escala (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.musica_acompanhamento_aluno(id) on delete cascade,
    data date not null,
    escala text not null,
    observacoes text null,
    autorizado_por text null,
    comum_congregacao text null,
    municipio text null,
    created_at timestamptz not null default now()
);

create table if not exists public.musica_acompanhamento_atividades (
    id uuid primary key default gen_random_uuid(),
    aluno_id uuid not null references public.musica_acompanhamento_aluno(id) on delete cascade,
    tipo_atividade text not null,
    titulo text not null,
    descricao text null,
    data_atividade date not null default current_date,
    documento_url text null,
    documento_path text null,
    nome_documento text null,
    comum_congregacao text null,
    municipio text null,
    created_at timestamptz not null default now()
);

create index if not exists idx_musica_aluno_nome on public.musica_acompanhamento_aluno (nome_aluno);
create index if not exists idx_musica_aluno_comum on public.musica_acompanhamento_aluno (comum_congregacao);
create index if not exists idx_musica_msa_aluno on public.musica_acompanhamento_msa (aluno_id, data_aula desc);
create index if not exists idx_musica_provas_aluno on public.musica_acompanhamento_provas (aluno_id, data_prova desc);
create index if not exists idx_musica_metodo_aluno on public.musica_acompanhamento_metodo (aluno_id, data_inicio desc);
create index if not exists idx_musica_hinario_aluno on public.musica_acompanhamento_hinario (aluno_id, data desc);
create index if not exists idx_musica_escala_aluno on public.musica_acompanhamento_escala (aluno_id, data desc);
create index if not exists idx_musica_atividades_aluno on public.musica_acompanhamento_atividades (aluno_id, data_atividade desc);

grant all on table public.musica_acompanhamento_aluno to authenticated;
grant all on table public.musica_acompanhamento_msa to authenticated;
grant all on table public.musica_acompanhamento_provas to authenticated;
grant all on table public.musica_acompanhamento_metodo to authenticated;
grant all on table public.musica_acompanhamento_hinario to authenticated;
grant all on table public.musica_acompanhamento_escala to authenticated;
grant all on table public.musica_acompanhamento_atividades to authenticated;
grant all on table public.musica_msa_fases to authenticated;

insert into public.musica_msa_fases (fase, ordem)
select fase, ordem
from (
    values
        ('Fase 1.1 - 1.4', 1),
        ('Fase 2.1 - 2.6', 2),
        ('Fase 3.1 - 3.4', 3),
        ('Fase 4.1 - 4.5', 4),
        ('Fase 4.6 - 5.2', 5),
        ('Fase 5.3 - 6.1', 6),
        ('Fase 6.2 - 6.6', 7),
        ('Fase 6.7 - 7.3', 8),
        ('Fase 7.4 - 8.1', 9),
        ('Fase 8.2 - 11.2', 10),
        ('Fase 11.3 - 12.2', 11),
        ('Fase 12.3 - 13.2', 12),
        ('Fase 13.3 - 14.2', 13),
        ('Fase 14.3 - 15.2', 14),
        ('Fase 15.3 - 15.6', 15),
        ('Fase 15.7 - 16.0', 16)
) as seed(fase, ordem)
on conflict (fase) do nothing;

alter table public.musica_acompanhamento_aluno enable row level security;
alter table public.musica_acompanhamento_msa enable row level security;
alter table public.musica_acompanhamento_provas enable row level security;
alter table public.musica_acompanhamento_metodo enable row level security;
alter table public.musica_acompanhamento_hinario enable row level security;
alter table public.musica_acompanhamento_escala enable row level security;
alter table public.musica_acompanhamento_atividades enable row level security;
alter table public.musica_msa_fases enable row level security;

drop policy if exists "musica_acompanhamento_aluno_select_authenticated" on public.musica_acompanhamento_aluno;
create policy "musica_acompanhamento_aluno_select_authenticated" on public.musica_acompanhamento_aluno for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_aluno_insert_authenticated" on public.musica_acompanhamento_aluno;
create policy "musica_acompanhamento_aluno_insert_authenticated" on public.musica_acompanhamento_aluno for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_aluno_update_authenticated" on public.musica_acompanhamento_aluno;
create policy "musica_acompanhamento_aluno_update_authenticated" on public.musica_acompanhamento_aluno for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_aluno_delete_authenticated" on public.musica_acompanhamento_aluno;
create policy "musica_acompanhamento_aluno_delete_authenticated" on public.musica_acompanhamento_aluno for delete to authenticated using (true);

drop policy if exists "musica_acompanhamento_msa_select_authenticated" on public.musica_acompanhamento_msa;
create policy "musica_acompanhamento_msa_select_authenticated" on public.musica_acompanhamento_msa for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_msa_insert_authenticated" on public.musica_acompanhamento_msa;
create policy "musica_acompanhamento_msa_insert_authenticated" on public.musica_acompanhamento_msa for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_msa_update_authenticated" on public.musica_acompanhamento_msa;
create policy "musica_acompanhamento_msa_update_authenticated" on public.musica_acompanhamento_msa for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_msa_delete_authenticated" on public.musica_acompanhamento_msa;
create policy "musica_acompanhamento_msa_delete_authenticated" on public.musica_acompanhamento_msa for delete to authenticated using (true);

drop policy if exists "musica_acompanhamento_provas_select_authenticated" on public.musica_acompanhamento_provas;
create policy "musica_acompanhamento_provas_select_authenticated" on public.musica_acompanhamento_provas for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_provas_insert_authenticated" on public.musica_acompanhamento_provas;
create policy "musica_acompanhamento_provas_insert_authenticated" on public.musica_acompanhamento_provas for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_provas_update_authenticated" on public.musica_acompanhamento_provas;
create policy "musica_acompanhamento_provas_update_authenticated" on public.musica_acompanhamento_provas for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_provas_delete_authenticated" on public.musica_acompanhamento_provas;
create policy "musica_acompanhamento_provas_delete_authenticated" on public.musica_acompanhamento_provas for delete to authenticated using (true);

drop policy if exists "musica_acompanhamento_metodo_select_authenticated" on public.musica_acompanhamento_metodo;
create policy "musica_acompanhamento_metodo_select_authenticated" on public.musica_acompanhamento_metodo for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_metodo_insert_authenticated" on public.musica_acompanhamento_metodo;
create policy "musica_acompanhamento_metodo_insert_authenticated" on public.musica_acompanhamento_metodo for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_metodo_update_authenticated" on public.musica_acompanhamento_metodo;
create policy "musica_acompanhamento_metodo_update_authenticated" on public.musica_acompanhamento_metodo for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_metodo_delete_authenticated" on public.musica_acompanhamento_metodo;
create policy "musica_acompanhamento_metodo_delete_authenticated" on public.musica_acompanhamento_metodo for delete to authenticated using (true);

drop policy if exists "musica_acompanhamento_hinario_select_authenticated" on public.musica_acompanhamento_hinario;
create policy "musica_acompanhamento_hinario_select_authenticated" on public.musica_acompanhamento_hinario for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_hinario_insert_authenticated" on public.musica_acompanhamento_hinario;
create policy "musica_acompanhamento_hinario_insert_authenticated" on public.musica_acompanhamento_hinario for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_hinario_update_authenticated" on public.musica_acompanhamento_hinario;
create policy "musica_acompanhamento_hinario_update_authenticated" on public.musica_acompanhamento_hinario for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_hinario_delete_authenticated" on public.musica_acompanhamento_hinario;
create policy "musica_acompanhamento_hinario_delete_authenticated" on public.musica_acompanhamento_hinario for delete to authenticated using (true);

drop policy if exists "musica_acompanhamento_escala_select_authenticated" on public.musica_acompanhamento_escala;
create policy "musica_acompanhamento_escala_select_authenticated" on public.musica_acompanhamento_escala for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_escala_insert_authenticated" on public.musica_acompanhamento_escala;
create policy "musica_acompanhamento_escala_insert_authenticated" on public.musica_acompanhamento_escala for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_escala_update_authenticated" on public.musica_acompanhamento_escala;
create policy "musica_acompanhamento_escala_update_authenticated" on public.musica_acompanhamento_escala for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_escala_delete_authenticated" on public.musica_acompanhamento_escala;
create policy "musica_acompanhamento_escala_delete_authenticated" on public.musica_acompanhamento_escala for delete to authenticated using (true);

drop policy if exists "musica_acompanhamento_atividades_select_authenticated" on public.musica_acompanhamento_atividades;
create policy "musica_acompanhamento_atividades_select_authenticated" on public.musica_acompanhamento_atividades for select to authenticated using (true);
drop policy if exists "musica_acompanhamento_atividades_insert_authenticated" on public.musica_acompanhamento_atividades;
create policy "musica_acompanhamento_atividades_insert_authenticated" on public.musica_acompanhamento_atividades for insert to authenticated with check (true);
drop policy if exists "musica_acompanhamento_atividades_update_authenticated" on public.musica_acompanhamento_atividades;
create policy "musica_acompanhamento_atividades_update_authenticated" on public.musica_acompanhamento_atividades for update to authenticated using (true) with check (true);
drop policy if exists "musica_acompanhamento_atividades_delete_authenticated" on public.musica_acompanhamento_atividades;
create policy "musica_acompanhamento_atividades_delete_authenticated" on public.musica_acompanhamento_atividades for delete to authenticated using (true);

drop policy if exists "musica_msa_fases_select_authenticated" on public.musica_msa_fases;
create policy "musica_msa_fases_select_authenticated" on public.musica_msa_fases for select to authenticated using (true);

COMMIT;

-- Verificacao opcional apos a execucao:
-- select count(*) from public.musica_msa_fases;
-- select tablename from pg_tables where schemaname = 'public' and tablename like 'musica_%';
