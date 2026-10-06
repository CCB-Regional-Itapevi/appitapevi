# SAC - Sistema Administrativo Congregação

## Regional Itapevi

O **SAC** é uma plataforma para a gestão administrativa da **Regional Itapevi**, com cadastro de congregações, ministério e usuários, além de atividades dos setores que integram este projeto.

## Funcionalidades

- Autenticação pelo Supabase Auth.
- Administração: congregações, ministério, liberação de usuários, usuários e auditoria.
- E.B.I.: atividades, crianças e colaboradores.
- Visitas: lançamentos, visitados e grupos de visita.
- Downloads.

## Tecnologias utilizadas

- **Frontend:** AngularJS (v1.x).
- **Estilização:** Bootstrap 3 e CSS.
- **Backend e banco de dados:** Supabase (PostgreSQL e Auth).
- **Ícones:** FontAwesome.
- **Notificações:** SweetAlert2.
- **Traduções:** Angular Translate.

## Como executar localmente

É necessário ter o Node.js 22 instalado. Copie `.env.example` para `.env.local` e preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` antes de iniciar.

```bash
git clone https://github.com/CCB-Regional-Itapevi/appitapevi.git
cd appitapevi
npm start
```

Abra **http://localhost:8080** no navegador. O comando inicia o servidor estático definido em `serve-local.js`, sem dependências adicionais de npm.

## Configuração do Supabase

O frontend utiliza a URL do projeto e uma chave pública do Supabase. As permissões de acesso aos dados devem ser definidas no banco por políticas de Row Level Security (RLS).

O servidor local lê `.env.local` ao iniciar e entrega apenas a URL e a chave pública em `js/supabase-config.js`. Reinicie `npm start` depois de alterar o arquivo. Os serviços compartilham um cliente, e a sessão é identificada pelo projeto configurado.

Somente `AuthService`, `EbiService` e `VisitasService` utilizam essa conexão neste projeto. RJM, DARPE, musicalização, música, GEM e Santa Ceia pertencem a outros projetos: seus serviços e recursos específicos não são carregados nem publicados aqui. As rotas e registros de controladores desses módulos foram desativados. Os arquivos antigos permanecem no checkout, sem mudanças de conexão, para preservar a referência anterior.

Na Vercel, cadastre `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em **Settings → Environment Variables**, nos ambientes necessários, e faça um novo deploy. O `.env.local` não é enviado pelo Git. `vercel.json` executa `npm run build` e publica somente `dist/`, com os recursos públicos e a configuração pública gerada. Não publique a raiz do repositório.

`SUPABASE_SECRET_KEY` é opcional e reservada a operações administrativas no servidor. O sistema não a utiliza no navegador. O build rejeita chaves `sb_secret_...` e `service_role` no campo público; se a configuração estiver ausente, ele falha em vez de conectar ao projeto anterior.

Use `npm test` para verificar o bloqueio de chaves administrativas, a publicação dos arquivos e a proteção do servidor local. A configuração de conexão não migra tabelas, políticas RLS, usuários nem arquivos do Storage.

Chaves administrativas, como `service_role` e `sb_secret`, não devem ser incluídas no frontend nem versionadas no repositório.

## Licença

Este projeto é de uso restrito da Regional Itapevi. Todos os direitos reservados.

Desenvolvido para a Regional Itapevi.
