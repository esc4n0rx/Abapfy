# Testes para Apresentação — ABAP Tools

## Estrutura

```
testes/
  geracao/       → Contextos prontos para gerar código via wizard
  performance/   → Código ABAP pronto para demo de análise de performance
  code_review/   → Código ABAP pronto para demo de Code Review
```

## Roteiro sugerido para a apresentação

### 1. Geração de Código (≈ 3 min cada)
- Abrir "Novo Código ABAP" → Criar Manualmente
- Copiar os campos do arquivo `.md` correspondente
- Gerar e mostrar os arquivos criados

**Ordem recomendada:**
1. `01_report_lista_tarefas.md` → demo visual rápida (ALV)
2. `02_funcao_calculo_desconto.md` → demo de Function Module
3. `03_classe_validador_cpf.md` → demo de OOP
4. `04_programa_processador_notas.md` → demo de batch

### 2. Performance (≈ 2 min)
- Abrir a aba de Performance
- Colar o conteúdo de `performance/relatorio_problemas.abap`
- Mostrar os alertas identificados

### 3. Code Review (≈ 2 min)
- Abrir a aba de Code Review
- Colar o conteúdo de `code_review/programa_legado.abap`
- Mostrar as sugestões de melhoria

---
> Todos os programas usam **tabelas internas locais** — sem SELECT, sem RFC.
> Podem ser executados em qualquer ambiente SAP sem dependências externas.
