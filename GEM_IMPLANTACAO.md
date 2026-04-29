# Implantacao do G.E.M

Este modulo ja esta integrado no front do `APP_GLOBAL`.

## Arquivo principal para executar no Supabase

Use este arquivo:

- [musica_gem_setup_completo.sql](/C:/Users/Usuário/OneDrive/APLICATIVOS%20REGIONAL/APP_GLOBAL/musica_gem_setup_completo.sql)

Ele faz em uma unica execucao:

- cria as tabelas `musica_*`
- cria os indices
- aplica `GRANT` para usuarios autenticados
- insere as fases do MSA
- ativa RLS
- cria as policies

## Arquivos auxiliares

Se preferir executar separado:

- [musica_gem_schema.sql](/C:/Users/Usuário/OneDrive/APLICATIVOS%20REGIONAL/APP_GLOBAL/musica_gem_schema.sql)
- [musica_gem_security_policies.sql](/C:/Users/Usuário/OneDrive/APLICATIVOS%20REGIONAL/APP_GLOBAL/musica_gem_security_policies.sql)

## Fluxo esperado apos a implantacao

1. Usuario com setor `Gem` entra no sistema.
2. O login redireciona para `gem.alunos`.
3. O menu lateral exibe `G.E.M`.
4. O usuario cadastra aluno e acessa o resumo.
5. Os lancamentos passam a gravar nas tabelas `musica_acompanhamento_*`.

## Conferencia rapida no banco

Rode estas consultas no SQL Editor:

```sql
select count(*) as fases from public.musica_msa_fases;

select tablename
from pg_tables
where schemaname = 'public'
  and tablename like 'musica_%'
order by tablename;
```

## Conferencia rapida no sistema

- abrir `#/gem/alunos`
- cadastrar um aluno teste
- abrir o resumo
- lancar um item em `MSA`
- conferir se o registro apareceu na tabela `public.musica_acompanhamento_msa`
