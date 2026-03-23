# Carga de Testes — 08 Chat Projeto

## Objetivo
Testar o módulo **Chat Projeto** que permite conversar com a IA tendo como contexto arquivos ABAP do projeto.

## Arquivos disponíveis para upload
- `ZMODULO_ESTOQUE.abap` — Report de controle de estoque com MARD, MAKT
- `ZMODULO_FATURAMENTO.abap` — Function group com consulta e cancelamento de faturas VF

## Como testar

### Cenário 1 — Upload e perguntas básicas
1. Abra o módulo **Chat Projeto**
2. Faça upload dos dois arquivos `.abap` acima (usando o botão de anexar ou drag-and-drop)
3. Verifique que os chips dos arquivos aparecem com nome e número de linhas
4. Faça as perguntas abaixo:

---

### Perguntas para testar

**Pergunta 1 (sobre estrutura):**
```
Quais tabelas do banco de dados SAP são acessadas nesses programas?
```
*Esperado: lista MARD, MAKT, MARA, VBRK mencionadas com contexto*

---

**Pergunta 2 (sobre lógica):**
```
Como o módulo de estoque trata materiais sem estoque? O que acontece com registros onde labst, einme e retme são todos zero?
```
*Esperado: explicar o WHERE com OR que filtra apenas registros com saldo > 0*

---

**Pergunta 3 (sobre melhoria):**
```
O módulo de estoque tem algum problema de performance? Como eu poderia otimizá-lo?
```
*Esperado: identificar o SELECT SINGLE dentro do LOOP (para buscar meins) como problema N+1, sugerir SELECT com FOR ALL ENTRIES antes do loop*

---

**Pergunta 4 (sobre faturamento):**
```
Quais tipos de documento de fatura são consultados na função z_consultar_faturas? Por que só traz faturas com rfbsk = 'C'?
```
*Esperado: F2 (fatura padrão), RE (devolução), G2 (crédito); rfbsk = 'C' = faturado/contabilizado*

---

**Pergunta 5 (nova conversa):**
1. Clique em **Nova conversa**
2. SEM fazer upload de arquivos, pergunte: `O que é um BAPI no SAP?`
3. *Esperado: resposta genérica sem contexto de arquivos*

---

**Pergunta 6 (upload único):**
1. Nova conversa
2. Suba apenas `ZMODULO_FATURAMENTO.abap`
3. Pergunte: `Implemente um teste unitário ABAP para a função z_cancelar_fatura`
4. *Esperado: código de teste com mock ou stub para BILLING_DOCUMENT_REVERSE*

---

## O que verificar

**Painel esquerdo (arquivos):**
- [ ] Botão de upload/attach funciona
- [ ] Drag-and-drop de arquivos .abap funciona
- [ ] Chip do arquivo exibe nome + contagem de linhas
- [ ] Botão X no chip remove o arquivo do contexto
- [ ] Botão "Nova conversa" limpa chat E arquivos

**Painel direito (chat):**
- [ ] Mensagem do usuário alinhada à direita (azul)
- [ ] Mensagem do assistente à esquerda
- [ ] Markdown renderizado (código com syntax highlight, listas, negrito)
- [ ] Streaming funciona (texto aparece letra a letra)
- [ ] Indicador de "digitando..." durante loading
- [ ] Input de texto com Enter para enviar
- [ ] Botão de envio
- [ ] Campo de input limpa após envio
- [ ] Scroll automático para a última mensagem
- [ ] Histórico de mensagens mantido durante a conversa
