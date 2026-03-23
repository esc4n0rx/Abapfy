# Carga de Testes — 06 Enhancement Finder

## Objetivo
Testar o módulo **Enhancement Finder** que sugere BAdIs e User Exits para customizações SAP.

## Como testar

Use os cenários abaixo — cada um com módulo SAP e descrição diferentes.

---

## Cenário 1 — Validação na criação de pedido de venda (SD)

**Módulo SAP:** SD (Sales & Distribution)

**Descrição do requisito:**
```
Preciso adicionar uma validação customizada durante a criação de pedidos de venda na VA01.
A regra de negócio é: clientes com grupo de clientes 'Z001' (distribuidores) não podem criar
pedidos de materiais da categoria 'SERV' (serviços). O sistema deve bloquear o salvamento
e exibir uma mensagem de erro clara para o usuário.
```

**Resultado esperado:**
- BAdI: `BADI_SALESDOCU_PROCESS_SAVE` ou `MV45AFZZ` (User Exit USEREXIT_SAVE_DOCUMENT_PREPARE)
- Tipo: BAdI ou Enhancement Spot
- Compatível com S/4HANA: Sim (BAdI) / Não (User Exit clássico)

---

## Cenário 2 — Enriquecimento de dados na criação de BP (MM/SD)

**Módulo SAP:** MM (Materials Management)

**Descrição do requisito:**
```
Na criação de um novo fornecedor (Transaction BP), precisamos verificar automaticamente
se o CNPJ informado já existe em uma tabela Z de fornecedores bloqueados por compliance.
Se existir, deve impedir a criação e exibir a razão do bloqueio. Se não existir, deve
gravar automaticamente o número de aprovação do compliance na visão Z customizada.
```

**Resultado esperado:**
- BAdI: `VENDOR_ADD_DATA` ou `MD_ADD_BUSINESS_PARTNER_DATA`
- Menção à transação BP e framework de Business Partner

---

## Cenário 3 — Cálculo customizado no MRP (PP)

**Módulo SAP:** PP (Production Planning)

**Descrição do requisito:**
```
Durante o MRP (MD01/MD02), precisamos sobrescrever a data de disponibilidade calculada
pelo SAP para materiais críticos (marcados com indicador Z no mestre de materiais).
A nova lógica deve considerar um calendário de fornecedores específico (tabela Z) e
adicionar um buffer de segurança de N dias configurável por material.
```

**Resultado esperado:**
- BAdI: `MD_CHANGE_MRP_DATA` ou `BADI_MATERIAL_REQ_PLAN`
- Menção ao contexto de MRP e lead time

---

## Cenário 4 — Campos extras na NF-e (FI/SD)

**Módulo SAP:** FI (Finance)

**Descrição do requisito:**
```
Precisamos adicionar informações fiscais específicas do estado de SP na NF-e eletrônica.
O campo CEST (Código Especificador da Substituição Tributária) precisa ser preenchido
automaticamente a partir de uma tabela Z que cruza NCM x UF. O campo deve aparecer
no XML da NF-e no grupo de informações adicionais do produto.
```

**Resultado esperado:**
- BAdI: `J_1B_NF_OUTPUT_PARTNER` ou `J_1BNFE_OUTBOUND`
- Menção ao framework de NF-e SAP Brasil

---

## O que verificar

- [ ] Painel esquerdo: módulos SAP com ícones (SD, MM, PP, FI, etc.)
- [ ] Seleção de módulo ativa/destaca o item
- [ ] Campo de texto para descrever a customização
- [ ] Botão "Buscar Enhancements" dispara a análise
- [ ] Loading durante processamento
- [ ] Resultados ordenados por ranking (melhor recomendação primeiro)
- [ ] Badge de tipo (BAdI / User Exit / Enhancement Spot)
- [ ] Indicador S/4HANA compatível (verde) vs legado (amarelo)
- [ ] Prós e contras em grid
- [ ] Código skeleton expansível com syntax highlight
- [ ] Transação SAP exibida (ex: SE18 para BAdIs)
- [ ] Notas adicionais ao final
