# SAC - Sistema Administrativo Congregação

## Regional Itapevi

O **SAC** é uma plataforma para a gestão administrativa da **Regional Itapevi**, com cadastro de congregações, ministério e usuários, além de atividades dos setores que integram este projeto.

## Funcionalidades

- Autenticação pelo Supabase Auth.
- Administração: congregações, ministério, liberação de usuários, usuários, auditoria e Santa Ceia.
- E.B.I.: atividades, crianças e colaboradores.
- Visitas: lançamentos, visitados e grupos de visita.
- Reunião de Jovens: atividades, recitativos, auxiliares e cadastro da mocidade.
- Downloads.

## Tecnologias utilizadas

- **Frontend:** AngularJS (v1.x).
- **Estilização:** Bootstrap 3 e CSS.
- **Backend e banco de dados:** Supabase (PostgreSQL e Auth).
- **Ícones:** FontAwesome.
- **Notificações:** SweetAlert2.
- **Traduções:** Angular Translate.

## Como executar localmente

É necessário ter o Node.js instalado.

```bash
git clone https://github.com/CCB-Regional-Itapevi/appitapevi.git
cd appitapevi
npm start
```

Abra **http://localhost:8080** no navegador. O comando inicia o servidor estático definido em `serve-local.js`, sem dependências adicionais de npm.

## Configuração do Supabase

O frontend utiliza a URL do projeto e uma chave pública do Supabase. As permissões de acesso aos dados devem ser definidas no banco por políticas de Row Level Security (RLS).

Chaves administrativas, como `service_role` e `sb_secret`, não devem ser incluídas no frontend nem versionadas no repositório.

## Licença

Este projeto é de uso restrito da Regional Itapevi. Todos os direitos reservados.

Desenvolvido para a Regional Itapevi.
