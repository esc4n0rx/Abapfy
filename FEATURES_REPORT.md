# Abapfy — Feature Ideas Report

> Análise baseada nas funcionalidades atuais do app (v1.0.8): geração de código ABAP, code review, especificações funcionais, agentes customizáveis e suporte a múltiplos providers de IA.

---

## 1. Histórico de Gerações

**O que é:** Salvar automaticamente cada programa gerado com metadados (nome, tipo, provider de IA usado, data, prompt utilizado) no Supabase, com tela de histórico pesquisável.

**Por que vale a pena:** Hoje ao fechar o app ou gerar um novo programa, o anterior se perde. Desenvolvedores SAP frequentemente precisam revisitar gerações anteriores, ajustar e re-gerar. O histórico também permite ver a evolução de um desenvolvimento ao longo do tempo.

**O que incluiria:**
- Lista de gerações com filtro por tipo (REPORT, CLASS, FUNC...) e busca por nome
- Botão "Re-gerar com mesmo contexto" — reabre o wizard já preenchido
- Comparação entre duas versões geradas do mesmo programa (diff side-by-side)
- Export de qualquer geração passada para `.abap`

---

## 2. Visualizador de Código com Syntax Highlight ABAP

**O que é:** Substituir a exibição de código gerado (atualmente texto puro) por um editor read-only com syntax highlighting para ABAP.

**Por que vale a pena:** O código gerado fica ilegível sem highlighting. Keywords como `SELECT`, `LOOP AT`, `CLASS`, `METHOD` se confundem com variáveis. Essa é a primeira coisa que qualquer desenvolvedor nota ao ver o output.

**O que incluiria:**
- Highlighting para palavras-chave ABAP, strings, comentários, tipos nativos
- Botão "Copiar bloco" por seção (declarations, implementation, etc.)
- Numeração de linhas
- Sugestão de biblioteca: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (mesmo editor do VS Code, leve e embedável no Electron)

---

## 3. Gerador de Documentação Técnica (DTec)

**O que é:** A partir de um código ABAP existente (colado ou carregado), gerar automaticamente a Documentação Técnica no formato padrão SAP — complementar à EF que já existe.

**Por que vale a pena:** A EF documenta *o que* fazer. A DTec documenta *como foi feito*: estrutura de classes, tabelas usadas, fluxo de execução, interface de parâmetros. É obrigatória em muitos projetos e extremamente repetitiva de escrever à mão.

**O que incluiria:**
- Input: código ABAP + contexto opcional
- Output: documento com seções padrão (Objetivo, Estrutura, Tabelas/Campos Utilizados, Lógica de Processamento, Exceções Tratadas)
- Export para DOCX com template próprio (igual ao fluxo da EF)
- Salvamento no Supabase junto com a especificação funcional correspondente

---

## 4. Análise de Performance e Boas Práticas

**O que é:** Módulo de análise estática inteligente que revisa código ABAP buscando anti-patterns de performance e violações de boas práticas SAP.

**Por que vale a pena:** É diferente do Code Review atual (que foca em bugs e correção lógica). Performance em ABAP é um tema específico — um `SELECT *` em tabela grande ou um `SELECT` dentro de `LOOP` pode derrubar o sistema em produção. Consultores seniores fazem isso manualmente hoje.

**Padrões que detectaria:**
- `SELECT *` onde poderiam ser selecionados apenas campos necessários
- `SELECT` dentro de `LOOP AT` (problema N+1)
- `LOOP AT` sem índice em tabela grande
- Ausência de `WHERE` em `SELECT` sobre tabelas transacionais (BKPF, BSEG, etc.)
- Variáveis declaradas mas não usadas
- Falta de `FREE` em tabelas internas após uso pesado

**Output:** Relatório com severidade (igual ao Code Review), linha do problema e sugestão de correção com código corrigido.

---

## 5. Biblioteca de Snippets ABAP

**O que é:** Biblioteca curada de snippets prontos para os padrões mais comuns em desenvolvimento SAP, pesquisável e organizável por categoria.

**Por que vale a pena:** Todo desenvolvedor ABAP tem um `.txt` com os snippets que usa sempre. Centralizar isso no Abapfy, com geração de variações via IA, economiza tempo real no dia a dia.

**Categorias iniciais:**
- ALV Grid / ALV List (setup completo)
- Leitura de tabelas padrão (MARA, BKPF, KNA1, etc.)
- Chamadas de BAPI comuns (BAPI_GOODSMVT_CREATE, BAPI_SALESORDER_CREATEFROMDAT2...)
- BAdI / Enhancement Spot skeleton
- Classes de exception e tratamento de erro
- Dialog / Screen (PBO/PAI)

**Funcionalidades:**
- Busca por palavra-chave ou categoria
- "Personalizar com IA" — adapta o snippet para o contexto do usuário
- Adicionar snippets próprios (privados, salvos no Supabase)
- Compartilhar snippet com a comunidade (público)

---

## 6. Enhancement Finder

**O que é:** O usuário descreve em linguagem natural o que quer customizar no SAP (ex: "quero adicionar um campo na tela de pedido de compra" ou "validar fornecedor no momento do save da NF"), e a IA sugere qual BAdI, User Exit ou Enhancement Spot usar.

**Por que vale a pena:** Encontrar o ponto de enhancement certo é uma das tarefas mais demoradas para consultores. Exige conhecimento específico de cada módulo SAP (MM, FI, SD, PP...). É muito pesquisa em documentação, fóruns e testes.

**O que incluiria:**
- Campo de descrição livre da necessidade
- Seleção do módulo SAP (MM, FI, SD, CO, PP, HR...)
- Output: lista ranqueada de enhancement points com: nome, descrição, quando é chamado, exemplo de implementação
- Geração automática do esqueleto de código para o enhancement escolhido

---

## 7. Chat de Projeto (Contexto Persistente)

**O que é:** Uma sessão de chat onde o usuário carrega múltiplos arquivos ABAP de um projeto e conversa livremente com a IA sobre eles — perguntas, refatorações, explicações, debugging.

**Por que vale a pena:** O Code Review atual analisa de forma estruturada e retorna JSON. Mas às vezes o desenvolvedor precisa de uma conversa: "Por que esse método está dando dump?", "Como refatoro essa classe?", "Explica esse SELECT complexo." O contexto dos arquivos persiste durante toda a sessão.

**Diferencial em relação ao Code Review:**
- Chat livre (não structured JSON output)
- Múltiplos arquivos como contexto base permanente
- Histórico de conversa salvo por projeto
- Pode ser usado junto com Claude Code ou Codex para executar mudanças reais

---

## 8. Estimativa de Esforço

**O que é:** A partir de uma descrição de requisito ou de uma EF existente, a IA gera uma estimativa de esforço de desenvolvimento em horas/dias com justificativa.

**Por que vale a pena:** Estimativa é um dos maiores pontos de dor em projetos SAP. Chefes de projeto e arquitetos precisam justificar horas para o cliente. Ter uma estimativa assistida por IA — mesmo como ponto de partida — economiza tempo e dá mais confiança para quem precisa precificar.

**Output incluiria:**
- Esforço total estimado (horas)
- Breakdown por fase: análise, desenvolvimento, testes unitários, homologação, documentação
- Nível de complexidade (simples / médio / complexo / muito complexo)
- Principais riscos que podem aumentar o esforço
- Premissas assumidas

---

## 9. Gerador de Testes ABAP (ABAP Unit)

**O que é:** A partir de um código ABAP (classe, function module, report), gerar automaticamente uma classe de testes com ABAP Unit cobrindo os cenários principais.

**Por que vale a pena:** Testes unitários em ABAP são subutilizados porque dão trabalho para escrever. Com geração automática, a barreira de entrada cai significativamente. Projetos mais modernos (S/4HANA, Clean ABAP) já exigem cobertura de testes.

**O que incluiria:**
- Detecta automaticamente métodos públicos e pontos de teste
- Gera `TEST-CLASS` com `SETUP`, `TEARDOWN` e métodos de teste para cada cenário
- Cobre casos de sucesso, erro e edge cases
- Adiciona mocks para dependências externas (tabelas, BAPIs)

---

## 10. Validador de Naming Conventions

**O que é:** Valida se o código ABAP gerado ou importado segue as naming conventions do projeto (padrão SAP ou customizado).

**Por que vale a pena:** Cada empresa SAP tem suas convenções: prefixos de variáveis (`lv_`, `lt_`, `ls_`, `lo_`), nomes de programas (`Z` ou `Y`), classes, módulos de função. Hoje essa validação é manual ou feita em code review humano.

**O que incluiria:**
- Regras padrão pré-configuradas (Hungarian Notation para ABAP, prefixo Z/Y)
- Personalização das regras por usuário/empresa (salvas no Supabase)
- Relatório de violações com linha, nome atual e nome sugerido
- Opção "Corrigir automaticamente com IA" — renomeia respeitando as regras

---

## Priorização Sugerida

| # | Feature | Impacto | Esforço | Prioridade |
|---|---------|---------|---------|------------|
| 1 | Histórico de Gerações | Alto | Médio | Alta |
| 2 | Syntax Highlight ABAP | Alto | Baixo | Alta |
| 3 | DTec Generator | Alto | Médio | Alta |
| 4 | Análise de Performance | Alto | Alto | Média |
| 5 | Snippet Library | Médio | Médio | Média |
| 6 | Enhancement Finder | Alto | Médio | Média |
| 7 | Chat de Projeto | Médio | Alto | Média |
| 8 | Estimativa de Esforço | Médio | Baixo | Média |
| 9 | Gerador de Testes | Alto | Alto | Baixa |
| 10 | Naming Validator | Médio | Baixo | Baixa |

---

*Gerado em 2026-03-23 | Abapfy v1.0.8*
