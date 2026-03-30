# Cenário 04 — PROGRAMA: Processador de Notas Fiscais (batch)

> Demo de programa batch com lógica real e saída formatada. Totalmente local.

## Campos do Wizard

| Campo | Valor |
|-------|-------|
| Tipo | PROG |
| Nome | ZDEMO_PROC_NF |
| Descrição | Processador de notas fiscais — dados internos para demonstração |

## Contexto

```
Programa de processamento em lote de notas fiscais usando exclusivamente
tabelas internas. Simula um cenário real de fechamento fiscal.

Estrutura das notas (criar TYPE local):
  - NR_NOTA    CHAR10   Número da NF
  - FORNECEDOR CHAR40   Nome do fornecedor
  - VALOR      DMBTR    Valor total da NF
  - IMPOSTO    DMBTR    Valor do imposto (ICMS)
  - STATUS     CHAR1    'A'=Aprovada, 'P'=Pendente, 'R'=Rejeitada
  - CATEGORIA  CHAR20   Tipo (MATERIAL, SERVICO, ATIVO)
  - DATA_EMISSAO DATS   Data de emissão

Populamento interno (12 notas hardcoded, mistura de status e categorias):
  NF-001 | Fornecedor Alpha Ltda   | 15.500,00 | 2.790,00 | A | MATERIAL | 01.06.2025
  NF-002 | Beta Serviços SA        |  8.200,00 |   984,00 | P | SERVICO  | 03.06.2025
  NF-003 | Gamma Ind. Ltda         | 42.000,00 | 7.560,00 | A | ATIVO    | 05.06.2025
  NF-004 | Delta Comércio          |  3.100,00 |   558,00 | R | MATERIAL | 07.06.2025
  NF-005 | Epsilon Tech SA         | 22.800,00 | 4.104,00 | A | SERVICO  | 08.06.2025
  NF-006 | Zeta Produtos Ltda      |  9.750,00 | 1.755,00 | P | MATERIAL | 10.06.2025
  NF-007 | Eta Soluções            | 61.200,00 |11.016,00 | A | ATIVO    | 12.06.2025
  NF-008 | Theta Import            |  4.600,00 |   828,00 | R | MATERIAL | 14.06.2025
  NF-009 | Iota Sistemas Ltda      | 18.300,00 | 3.294,00 | A | SERVICO  | 15.06.2025
  NF-010 | Kappa Distribuidora     | 33.500,00 | 6.030,00 | P | MATERIAL | 18.06.2025
  NF-011 | Lambda Engenharia       | 77.000,00 |13.860,00 | A | ATIVO    | 20.06.2025
  NF-012 | My Fornecedor Express   |  5.200,00 |   936,00 | A | SERVICO  | 22.06.2025

Processamento:
  1. Calcular totais por STATUS:
     - Total aprovadas: valor + imposto
     - Total pendentes: quantidade e valor
     - Total rejeitadas: quantidade e valor
  2. Calcular totais por CATEGORIA (MATERIAL, SERVICO, ATIVO)
  3. Calcular alíquota média efetiva de imposto (total_imposto / total_valor * 100)
  4. Identificar a nota de maior e menor valor entre as APROVADAS

Saída via WRITE formatada:
  - Cabeçalho com data/hora de processamento (SY-DATUM, SY-UZEIT)
  - Seção "RESUMO POR STATUS" com totais
  - Seção "RESUMO POR CATEGORIA" com totais
  - Seção "DESTAQUES" com maior e menor NF aprovada
  - Seção "ALÍQUOTA MÉDIA" com percentual calculado
  - Linha separadora usando ULINE entre seções
```

## Regras de Negócio

1. Notas REJEITADAS não entram no cálculo de alíquota média
2. Valores monetários exibidos com separador de milhar (FORMAT CURRENCY)
3. Total de impostos pendentes deve gerar aviso: "ATENÇÃO: R$ X,XX em impostos pendentes de aprovação"
4. Alíquota média deve ser exibida com 2 casas decimais e símbolo %
5. Nenhum SELECT, CALL FUNCTION ou acesso a BD — tudo em tabela interna local

## Por que usar nesta demo
- Lógica de negócio real e verificável (os números batem)
- Output via WRITE é simples de mostrar em tela
- Demonstra que o modelo gera cálculos corretos com estruturas internas
