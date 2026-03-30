# Cenário 02 — FUNCTION MODULE: Calculadora de Desconto Progressivo

> Demonstra geração de FM com interface completa. Puro cálculo — sem DB.

## Campos do Wizard

| Campo | Valor |
|-------|-------|
| Tipo | FUNC |
| Nome | ZFM_CALC_DESCONTO |
| Grupo de Funções | ZDEMO_FINANCEIRO |
| Descrição | Calcula desconto progressivo sobre valor de venda |

## Interface

### Importing
| Parâmetro | Tipo | Opcional |
|-----------|------|----------|
| IV_VALOR_BRUTO | DMBTR | Não |
| IV_QUANTIDADE | I | Não |
| IV_CLIENTE_PREMIUM | ABAP_BOOL | Sim |

### Exporting
| Parâmetro | Tipo |
|-----------|------|
| EV_PERCENTUAL_DESCONTO | P5_2 |
| EV_VALOR_DESCONTO | DMBTR |
| EV_VALOR_FINAL | DMBTR |
| EV_FAIXA_DESCONTO | CHAR20 |

### Exceptions
| Nome | Descrição |
|------|-----------|
| VALOR_INVALIDO | Valor bruto menor ou igual a zero |
| QUANTIDADE_INVALIDA | Quantidade menor ou igual a zero |

## Contexto

```
Function Module que calcula o desconto progressivo de acordo com a quantidade
comprada e se o cliente é premium. Toda a lógica é interna — sem acesso a BD.

Tabela de descontos (hardcoded na lógica interna):
  Qtd 1–9    → 0%   (sem desconto)
  Qtd 10–29  → 5%
  Qtd 30–49  → 10%
  Qtd 50–99  → 15%
  Qtd 100+   → 20%

Bônus cliente premium: +3% sobre o percentual da faixa.
  Exemplo: Qtd 30, premium = 10% + 3% = 13%

Cálculos:
  EV_VALOR_DESCONTO = IV_VALOR_BRUTO * percentual / 100
  EV_VALOR_FINAL    = IV_VALOR_BRUTO - EV_VALOR_DESCONTO
  EV_FAIXA_DESCONTO = texto descritivo da faixa (ex: "30-49 unidades + Premium")

RAISE VALOR_INVALIDO se IV_VALOR_BRUTO <= 0
RAISE QUANTIDADE_INVALIDA se IV_QUANTIDADE <= 0
```

## Regras de Negócio

1. O desconto máximo possível é 23% (20% faixa + 3% premium)
2. Valor final nunca pode ser negativo — se por algum cálculo ficar <= 0, forçar mínimo 0.01
3. EV_FAIXA_DESCONTO deve ser preenchido mesmo quando percentual = 0 (ex: "1-9 unidades — sem desconto")
4. Usar P5_2 para percentuais — nunca FLOAT

## Por que usar nesta demo
- Mostra interface completa de FM (importing, exporting, exceptions)
- Lógica clara e verificável na hora
- Fácil de testar mentalmente: 50 unidades premium → 18%
