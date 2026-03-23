# Carga de Testes — 02 Histórico de Gerações

## Objetivo
Popular o módulo **Histórico** com programas gerados via ABAP, e testar as funcionalidades de busca, filtro e visualização.

## Como gerar massa de dados

### Passo a passo
1. Abra o módulo **ABAP** na sidebar
2. Use os prompts abaixo para gerar 5–6 programas de tipos diferentes
3. Após gerar, acesse o módulo **Histórico** para verificar

---

## Prompts para gerar programas

### 1. REPORT simples
**Tipo:** REPORT
**Prompt:** "Gerar um relatório de estoque com parâmetros de seleção por material e centro. Deve exibir saldo atual, valor em estoque e última movimentação. Usar ALV para exibição."

### 2. Function Module
**Tipo:** FUNC
**Prompt:** "Criar uma function module chamada Z_GET_DADOS_CLIENTE que recebe um KUNNR e retorna nome, endereço completo, grupo de contas e classificação de crédito. Tratar exceções para cliente não encontrado e sistema indisponível."

### 3. Classe ABAP (OOP)
**Tipo:** CLAS
**Prompt:** "Criar uma classe ZCL_PROCESSADOR_NF para processar notas fiscais. Deve ter métodos para validar CNPJ, calcular impostos (ICMS, PIS, COFINS), e persistir via BAPI de MM. Implementar interface ZIF_PROCESSADOR."

### 4. Enhancement (BAdI)
**Tipo:** ENHO
**Prompt:** "Criar uma implementação de BAdI para o MD_ADD_BUSINESS_PARTNER_DATA que adiciona validação de CPF/CNPJ customizado durante a criação de parceiro de negócios. Usar regex para validação."

### 5. Programa de conversão (PROG)
**Tipo:** PROG
**Prompt:** "Criar um programa de conversão de dados legacy para SAP. O programa lê um arquivo CSV do servidor de aplicações com dados de fornecedores (LIFNR, NAME1, STRAS, ORT01, LAND1, STCD1) e cria os fornecedores via BAPI_VENDOR_CREATE com tratamento de erros e log detalhado."

### 6. Report com ALV Tree
**Tipo:** REPORT
**Prompt:** "Relatório de estrutura de BOM (Bill of Materials) hierárquico usando ALV Tree. Recebe um material e explode a BOM até N níveis. Mostrar material, descrição, quantidade, unidade e tipo de item. Incluir totalizadores por nível."

---

## O que testar no Histórico

- [ ] Todos os 6 programas aparecem na lista esquerda
- [ ] Filtro por tipo funciona: ALL / REPORT / FUNC / CLAS / ENHO / PROG
- [ ] Campo de busca filtra por nome do programa
- [ ] Clicar num programa exibe os arquivos no painel direito
- [ ] Código aparece com syntax highlight
- [ ] Botão "Copiar tudo" copia o código para clipboard
- [ ] Botão de exclusão remove o programa (com confirmação)
- [ ] Após excluir, programa some da lista
