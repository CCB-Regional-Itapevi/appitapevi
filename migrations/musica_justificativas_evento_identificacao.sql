alter table public.musica_justificativas
    add column if not exists nome_evento text null;

update public.musica_justificativas
set nome_evento = case
    when lower(coalesce(tipo_evento, '')) in ('reuniao do ministerio', 'reunião do ministério') then 'Reuniao do Ministerio'
    when lower(coalesce(tipo_evento, '')) in ('reuniao tecnica', 'reunião técnica') then 'Reuniao Tecnica'
    when lower(coalesce(tipo_evento, '')) in ('outro evento da musica', 'outros eventos da musica', 'outro evento da música', 'outros eventos da música') then 'Outro evento da musica'
    else 'Ensaio Regional'
end
where coalesce(nome_evento, '') = '';

create index if not exists idx_musica_justificativas_evento_identificacao
on public.musica_justificativas (data_evento desc, nome_evento, tipo_evento);

comment on column public.musica_justificativas.nome_evento is
    'Identificacao nominal do evento selecionado na justificativa, por exemplo Reuniao do Ministerio ou Ensaio Regional.';
