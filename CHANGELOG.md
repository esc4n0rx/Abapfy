# Changelog — Abapfy

Todas as mudanças notáveis do projeto estão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.0.10] — 2026-03-23

### Corrigido
- **Auto-updater em repositório privado** — `electron-updater` falhava com 404 no `releases.atom` por falta de autenticação. Token `RELEASES_TOKEN` agora é injetado no build via `define` (electron-vite) e configurado em `autoUpdater.requestHeaders`
- Workflow CI atualizado para passar `RELEASES_TOKEN` na etapa de build

---

## [1.0.9] — 2026-03-23

### Adicionado
- **Syntax Highlight ABAP** — componente `AbapHighlight` com coloração de keywords, strings, comentários e números em todas as views que exibem código
- **Módulo Histórico** — listagem de programas ABAP gerados com filtro por tipo (REPORT, FUNC, CLAS, ENHO, PROG), busca por nome, visualização com syntax highlight, cópia e exclusão
- **Estimativa de Esforço** — seção colapsável dentro do módulo Especificações que calcula complexidade, total de horas, breakdown por fase, riscos e premissas via IA
- **Módulo Snippets** — biblioteca com 14 snippets ABAP built-in (ALV, Database, BAPI, OOP, etc.) + suporte a snippets customizados persistidos em localStorage
- **Módulo DTec** — gerador de documentação técnica SAP/ABAP (estrutura, tabelas, parâmetros, lógica, dependências) com suporte a upload de arquivos
- **Módulo Enhancement Finder** — encontra BAdIs e User Exits por módulo SAP com ranking, compatibilidade S/4HANA, prós/contras e código skeleton
- **Módulo Performance** — analisador de anti-patterns ABAP com score 0–100, severidades (critical/high/medium/low), código de correção expandível
- **Módulo Chat Projeto** — chat com IA tendo como contexto arquivos ABAP enviados, com streaming de resposta e suporte a CLI e API
- **DTec: upload de arquivos** — arquivos `.abap` podem ser subidos diretamente; CLI recebe caminho em disco, API recebe conteúdo embutido na mensagem

### Corrigido
- Versão hardcoded removida de `DashboardView` e `LoginView` — agora lida dinamicamente via `window.api.getAppVersion()`

---

## [1.0.8] — 2026-03-22

### Corrigido
- **Janela em branco no Windows** — causa raiz: `BrowserRouter` com protocolo `file://` fazia `history.pushState('/login')` resolver para `file:///login` (inválido). Corrigido trocando para `HashRouter`

---

## [1.0.7] — 2026-03-22

### Corrigido
- Janela não exibida na inicialização no Windows — alterado `show: true` → `show: false` + evento `ready-to-show` para exibir somente após renderer carregar

---

## [1.0.6] — 2026-03-20

### Corrigido
- Removido timeout de 120s na integração Codex e 180s no agente Claude Code — projetos complexos exigem tempo indeterminado
- Logo incorreta corrigida
- Error boundary adicionado

---

## [1.0.5] — 2026-03-18

### Adicionado
- Configuração de tipo de release para publicação direta (não draft) no GitHub Releases

---

## [1.0.4] — 2026-03-17

### Corrigido
- Workflow de CI/CD agora usa environment `DEV` para acessar secrets do Supabase

---

## [1.0.3] — 2026-03-16

### Adicionado
- Script de verificação de ambiente na inicialização (startup env checker)
- Timeout configurável para conexão com Supabase

---

## [1.0.0 – 1.0.2] — 2026-03-01 a 2026-03-15

### Lançamento inicial
- Autenticação via Supabase (login/registro)
- Módulo ABAP: gerador de programas com IA (REPORT, FUNC, CLAS, ENHO, PROG)
- Módulo Code Review: análise de código com chat iterativo e streaming
- Módulo Especificações: geração de EFs funcionais
- Configurações: provedores de IA (Claude, GPT, Gemini, Codex, Claude Code CLI)
- Módulo Atualizações: auto-updater via GitHub Releases
- Design system SAP Fiori com modo claro/escuro
