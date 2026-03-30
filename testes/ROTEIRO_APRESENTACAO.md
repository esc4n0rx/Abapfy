# Roteiro de Apresentação — ABAP Tools

## Antes de começar
- [ ] App aberto e logado
- [ ] Provedor de IA configurado (Claude ou GPT-4o recomendados)
- [ ] Abrir esta pasta em paralelo para copiar os contextos

---

## BLOCO 1 — Geração de Código (20 min)

### Demo 1.1 — Report com ALV (impacto visual imediato)
**Arquivo:** `geracao/01_report_lista_tarefas.md`

1. Clicar em "Novo Código ABAP" → **Criar Manualmente**
2. Selecionar tipo **REPORT**
3. Preencher campos: `ZDEMO_TAREFAS` / `ZDM01` / empresa `1000`
4. Em "Contexto": colar o bloco de contexto do arquivo
5. Regras: adicionar as 4 regras do arquivo
6. Gerar → mostrar o ALV com semáforos de cor sendo gerado

**O que chamar atenção:**
- Quantidade de arquivos gerados (PROG + TOP + SEL + F01)
- Sintaxe ABAP correta automaticamente
- Semáforo de cor já implementado

---

### Demo 1.2 — Function Module
**Arquivo:** `geracao/02_funcao_calculo_desconto.md`

1. Tipo **FUNC** → nome `ZFM_CALC_DESCONTO`
2. Na aba Interface → adicionar os parâmetros do arquivo
3. Contexto → colar o bloco do arquivo
4. Gerar → mostrar a interface completa com RAISE exceptions

**O que chamar atenção:**
- Interface IMPORTING/EXPORTING/EXCEPTIONS gerada corretamente
- Algoritmo de faixa de desconto implementado
- RAISE para cada exception declarada

---

### Demo 1.3 — Classe OOP
**Arquivo:** `geracao/03_classe_validador_cpf.md`

1. Tipo **CLAS** → nome `ZCL_VALIDADOR_DOCS`
2. Atributos e métodos conforme o arquivo
3. Gerar → mostrar CLASS DEFINITION + IMPLEMENTATION

**O que chamar atenção:**
- Algoritmo de dígito verificador implementado (verificável na hora)
- Atributos privados com prefixo correto mv_
- Todos os métodos com implementação completa

---

### Demo 1.4 — Geração por EF (diferencial)
**Arquivo:** `geracao/04_programa_processador_notas.md` (usar como referência do que a EF geraria)

1. Clicar em "Novo Código ABAP" → **Carregar Especificação Funcional**
2. Mostrar o fluxo de upload do .docx
3. Explicar que o modelo lê as seções automaticamente
4. Se tiver uma EF real, usar. Senão: mostrar o fluxo visual e mencionar que os campos são extraídos automaticamente

---

## BLOCO 2 — Análise de Performance (8 min)

### Demo 2.1 — Código com Problemas
**Arquivo:** `performance/relatorio_problemas.abap`

1. Ir para a aba **Performance** (ou Code Review com foco em performance)
2. Colar o conteúdo do arquivo
3. Analisar → mostrar os alertas

**Problemas que devem aparecer:**
- SELECT * (3 ocorrências)
- SELECT dentro de LOOP (crítico)
- FOR ALL ENTRIES sem verificação de tabela vazia
- SORT duplicado
- READ TABLE sem BINARY SEARCH
- Variável declarada e não usada (gv_dummy)
- DESCRIBE TABLE dentro de LOOP

### Demo 2.2 — Versão Otimizada (opcional, se der tempo)
**Arquivo:** `performance/relatorio_otimizado.abap`

1. Mostrar o mesmo relatório depois de otimizado
2. Destacar: FOR ALL ENTRIES com CHECK, SELECT com campos, tabela HASHED, FIELD-SYMBOLS

---

## BLOCO 3 — Code Review (8 min)

### Demo 3.1 — Programa Legado
**Arquivo:** `code_review/programa_legado.abap`

1. Ir para a aba **Code Review**
2. Colar o conteúdo
3. Iniciar review → mostrar as sugestões

**Problemas que devem aparecer:**
- Nomenclatura: variáveis t1, t2, v1, v2, v3 (sem semântica)
- SELECT * em loop
- Divisão por zero (média calculada antes de verificar v3 = 0)
- Lógica de "v4+0(5) = 'TOTAL'" — manipulação de string frágil
- Parâmetros de seleção sem label (p1, p2)

### Demo 3.2 — Classe com Problemas de Design
**Arquivo:** `code_review/classe_sem_padroes.abap`

**Problemas que devem aparecer:**
- BREAK-POINT esquecido no código
- Método `run` faz tudo (God Method — viola SRP)
- Loop aninhado sem condição O(n²)
- SELECT * sem filtro de mandante
- Alíquota ICMS hardcoded ('0.18')
- Exception `cx_salv_msg` capturada e ignorada
- Código morto: REUSE_ALV após CL_SALV_TABLE

### Demo 3.3 — Include com Erros Estruturais
**Arquivo:** `code_review/include_misturado.abap`

**Problemas que devem aparecer:**
- REUSE_ALV + CL_SALV_TABLE no mesmo programa (mistura proibida)
- fieldcat sem CLEAR antes de cada campo (contaminação de atributos)
- Mensagem de erro sem incluir o material na string
- Exception ignorada silenciosamente

---

## Pontos de destaque para o discurso

1. **"Zero setup de SAP"** — todos os programas de geração usam tabelas internas, rodam em qualquer ambiente
2. **"O modelo conhece as regras"** — CLEAR no fieldcat, BINARY SEARCH, FAE check — não precisa lembrar
3. **"Do contexto ao código em segundos"** — o tempo de geração é o argumento mais forte
4. **"EF → código direto"** — diferencial do mercado: consultor passa a EF e recebe o código

---

## Perguntas frequentes (prepare resposta)

**"O código precisa de ajuste manual?"**
> Sim, sempre. O modelo gera 80-90% do trabalho. A responsabilidade final é do consultor.

**"Funciona para objetos SAP padrão (transações standard)?"**
> Sim, principalmente para Enhancements (BAdI, Exits). O consultor informa o nome do programa alvo.

**"Os dados ficam seguros?"**
> O código gerado fica salvo localmente na conta do usuário. Nenhum código SAP é enviado sem consentimento.

**"Funciona offline?"**
> Para geração via Claude CLI (Claude Code local), sim. Para APIs externas, precisa de internet.
