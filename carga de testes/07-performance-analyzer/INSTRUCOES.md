# Carga de Testes — 07 Performance Analyzer

## Objetivo
Testar o módulo **Performance** que analisa código ABAP e identifica anti-patterns.

## Como testar

### Cenário 1 — Código com muitos problemas (score baixo)
1. Abra o módulo **Performance** na sidebar
2. Cole o conteúdo de `codigo_com_problemas.abap` no textarea
3. Clique em **Analisar Performance**

**Resultado esperado:**
- Score: entre 0–35 (Crítico ou Ruim)
- Pelo menos 3–5 issues de severidade `critical` ou `high`
- Issues esperados:
  - SELECT * sem campos específicos (CRITICAL)
  - SELECT dentro de LOOP (CRITICAL)
  - SELECT em loop dentro de loop (CRITICAL)
  - CONCATENATE dentro de LOOP (MEDIUM)
  - READ TABLE sem BINARY SEARCH (MEDIUM)
  - FREE não chamado (LOW)
  - FIELD-SYMBOLS não usados em LOOPs (LOW)

---

### Cenário 2 — Código otimizado (score alto)
1. Limpe o textarea
2. Cole o conteúdo de `codigo_otimizado.abap`
3. Analisar

**Resultado esperado:**
- Score: entre 80–100 (Bom ou Excelente)
- Poucos ou nenhum issue crítico
- Elogios nas recomendações gerais (HASHED TABLE, FOR ALL ENTRIES, FIELD-SYMBOLS)

---

### Cenário 3 — Código vazio/inválido
1. Clique em Analisar com textarea vazio
2. Deve mostrar mensagem de erro: "Cole o código ABAP para analisar."

---

## O que verificar

**Painel esquerdo:**
- [ ] Textarea aceita código longo sem travar
- [ ] Erro exibido quando textarea vazio
- [ ] Loading spinner durante análise
- [ ] Botão desabilitado durante loading
- [ ] Botão "Nova análise" aparece após resultado

**Painel direito — Resultado:**
- [ ] ScoreGauge (gráfico circular SVG) com número e cor correta
  - 80–100: verde
  - 60–79: laranja
  - 40–59: vermelho escuro
  - 0–39: vermelho vivo
- [ ] Badges de severidade: Crítico (vermelho), Alto (laranja), Médio (amarelo), Baixo (azul)
- [ ] Contagem de issues por severidade correta
- [ ] Summary text do código
- [ ] IssueCards com título, descrição, impacto
- [ ] Badge colorido de severidade em cada card
- [ ] `line_hint` exibido como código inline
- [ ] Botão "Ver código corrigido" expande AbapHighlight
- [ ] Recomendações gerais em azul no final
