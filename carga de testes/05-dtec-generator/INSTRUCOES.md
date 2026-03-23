# Carga de Testes — 05 DTec Generator

## Objetivo
Testar o módulo **DTec** que gera documentação técnica automática a partir do código ABAP.

## Como testar

### Cenário 1 — Function Module de pagamento
1. Abra o módulo **DTec** na sidebar
2. Preencha os campos:
   - **Nome do objeto:** `ZBAPI_PAGAMENTO_PROCESSAR`
   - **Contexto adicional:** `Function module que processa pagamentos de fornecedores no módulo FI. Faz validações de empresa/fornecedor/valor, monta documento de lançamento contábil e chama BAPI_ACC_DOCUMENT_POST. Usado pelo módulo de contas a pagar.`
3. Cole o conteúdo de `ZBAPI_PAGAMENTO.abap` no campo de código
4. Clique em **Gerar DTec**

**Resultado esperado:**
- Nome/tipo do objeto preenchidos corretamente
- Módulo SAP: FI (Finance)
- Objetivo claro sobre o propósito do FM
- Estrutura do documento
- Tabelas: LFA1, T001, menção ao BAPI
- Parâmetros de importação/exportação documentados
- Lógica de processamento descrita em passos
- Tratamento de erros (exceções levantadas)
- Dependências: BAPI_ACC_DOCUMENT_POST, BAPI_TRANSACTION_COMMIT/ROLLBACK
- Notas de performance

---

### Cenário 2 — Sem código (só contexto)
1. Deixe o campo de código vazio
2. Nome: `ZREL_AGING_CONTAS`
3. Contexto: `Relatório de aging de contas a receber. Agrupa valores em aberto por faixa de vencimento (0–30 dias, 31–60 dias, 61–90 dias, >90 dias). Lê tabela BSID e BSAD. Exibe em ALV com subtotais por cliente.`
4. Gere o DTec

**Resultado esperado:** DTec gerado com base apenas no contexto, sem analisar código.

---

## O que verificar
- [ ] Loading durante geração
- [ ] DTec exibe todas as seções: objetivo, estrutura, tabelas, parâmetros, lógica, erros, dependências
- [ ] Seções são colapsáveis
- [ ] Tabelas SAP listadas como links/chips
- [ ] Botão "Copiar DTec" gera texto formatado
- [ ] DTec salvo na lista esquerda após geração
- [ ] Ao clicar em item salvo, o DTec é exibido novamente
- [ ] Múltiplos DTecs podem ser salvos
- [ ] Não requer código — contexto é suficiente
