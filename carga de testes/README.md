# Carga de Testes — Abapfy

Massa de testes para validar cada funcionalidade nova implementada na v1.0.8.

## Estrutura

| Pasta | Funcionalidade | O que testar |
|-------|---------------|--------------|
| `01-syntax-highlight/` | AbapHighlight component | Cores de keywords, strings, comentários, números |
| `02-historico-geracoes/` | Módulo Histórico | Filtros, busca, visualização, exclusão |
| `03-estimativa-esforco/` | EffortSection em Especificações | Complexidade, horas, fases, riscos |
| `04-snippet-library/` | Módulo Snippets | Built-in + snippets customizados, filtros |
| `05-dtec-generator/` | Módulo DTec | Geração de documentação técnica |
| `06-enhancement-finder/` | Módulo Enhancement Finder | BAdIs e User Exits por módulo SAP |
| `07-performance-analyzer/` | Módulo Performance | Score, severidades, IssueCards, fix code |
| `08-chat-projeto/` | Módulo Chat Projeto | Upload de arquivos, contexto, streaming |

## Como usar

Cada subpasta contém:
- **INSTRUCOES.md** — passo a passo detalhado do que testar
- **Arquivos de código/contexto** — conteúdo real para colar nas views

Siga a ordem das pastas: as primeiras testam features que as seguintes dependem (ex: syntax highlight está presente em todos os módulos com código).

## Checklist geral

- [ ] 01 — Syntax highlight com cores corretas em REPORT e CLAS
- [ ] 02 — Histórico lista programas gerados com filtro por tipo
- [ ] 03 — Estimativa de esforço baixa para EF simples, alta para EF complexa
- [ ] 04 — Snippets built-in + adição/exclusão de snippet customizado
- [ ] 05 — DTec gerado a partir de código + contexto
- [ ] 06 — Enhancement Finder retorna BAdIs relevantes para o módulo
- [ ] 07 — Performance score baixo para código ruim, alto para código otimizado
- [ ] 08 — Chat com contexto de arquivos + streaming de resposta
