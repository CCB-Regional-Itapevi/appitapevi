# Importacao DARPE

- Arquivo analisado: `scripts/darpe_import_source.xlsx`
- Clinicas/localidades extraidas: **37**
- Colaboradores/musicos extraidos: **194**
- Atendimentos gerados a partir da agenda: **161**
- Locais da agenda sem correspondencia automatica: **0**
- Marcador tecnico: `IMPORTADO_DARPE_PLANILHA_2026_04_19`

## Arquivos gerados

- `scripts/darpe_import_output/darpe_seed.sql`
- `scripts/darpe_import_output/darpe_import_summary.json`
- `scripts/darpe_import_output/darpe_preview.json`

## Observacoes do mapeamento

- `Colaborador Atendente` alimenta `darpe_musicos`.
- `Clinica Detalhada` alimenta `darpe_clinicas`.
- `Agenda Simplificada` foi explodida em registros individuais para `darpe_atendimentos`.
- `Acordo 2103` e `Relacao Geral` foram usados para enriquecer responsaveis e observacoes dos locais.
