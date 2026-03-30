# Cenário 03 — CLASSE ABAP: Validador e Formatador de Documentos

> Demonstra OOP com métodos úteis e verificáveis. Zero dependência de BD.

## Campos do Wizard

| Campo | Valor |
|-------|-------|
| Tipo | CLAS |
| Nome | ZCL_VALIDADOR_DOCS |
| Herda de | (vazio) |
| Visibilidade | PUBLIC |

## Atributos
| Nome | Tipo | Visibilidade |
|------|------|--------------|
| MV_ULTIMO_ERRO | STRING | PRIVATE |
| MV_TOTAL_VALIDACOES | I | PRIVATE |
| MV_TOTAL_INVALIDOS | I | PRIVATE |

## Métodos
| Nome | Visibilidade | Descrição |
|------|--------------|-----------|
| VALIDAR_CPF | PUBLIC | Valida CPF (11 dígitos, dígitos verificadores) |
| VALIDAR_CNPJ | PUBLIC | Valida CNPJ (14 dígitos, dígitos verificadores) |
| FORMATAR_CPF | PUBLIC | Formata string numérica → 999.999.999-99 |
| FORMATAR_CNPJ | PUBLIC | Formata string numérica → 99.999.999/9999-99 |
| GET_ESTATISTICAS | PUBLIC | Retorna total_validacoes e total_invalidos |
| GET_ULTIMO_ERRO | PUBLIC | Retorna descrição do último erro de validação |
| LIMPAR_ESTATISTICAS | PUBLIC | Zera contadores internos |

## Contexto

```
Classe utilitária para validação e formatação de documentos fiscais brasileiros.
Implementa o algoritmo oficial de dígitos verificadores do CPF e CNPJ.

VALIDAR_CPF (iv_cpf TYPE string) RETURNING rv_valido TYPE abap_bool:
  - Remove pontos, traços e espaços do input
  - Verifica se tem exatamente 11 dígitos numéricos
  - Rejeita sequências repetidas (111.111.111-11, 000.000.000-00, etc.)
  - Calcula 1º dígito verificador: soma(digito_i * (10 - i)) MOD 11
  - Calcula 2º dígito verificador: soma(digito_i * (11 - i)) MOD 11
  - Atualiza MV_TOTAL_VALIDACOES; se inválido, incrementa MV_TOTAL_INVALIDOS
    e preenche MV_ULTIMO_ERRO com motivo

VALIDAR_CNPJ (iv_cnpj TYPE string) RETURNING rv_valido TYPE abap_bool:
  - Remove pontos, barras, traços
  - Verifica 14 dígitos numéricos
  - Algoritmo de dois dígitos verificadores (pesos 5,4,3,2,9,8,7,6,5,4,3,2)

FORMATAR_CPF (iv_cpf TYPE string) RETURNING rv_formatado TYPE string:
  - Input pode ser "12345678901" ou já formatado
  - Sempre retorna "123.456.789-01"
  - Se inválido, retorna o input original sem alteração

GET_ESTATISTICAS EXPORTING ev_total TYPE i, ev_invalidos TYPE i, ev_taxa_erro TYPE p5_2
```

## Regras de Negócio

1. Os métodos VALIDAR_* devem funcionar com input já formatado ou só números
2. CPFs/CNPJs com todos os dígitos iguais são sempre inválidos (ex: 11111111111)
3. GET_ESTATISTICAS deve calcular a taxa de erro em percentual
4. LIMPAR_ESTATISTICAS reseta os 3 atributos privados para zero

## Por que usar nesta demo
- Algoritmo verificável na hora (CPF 123.456.789-09 é inválido, 529.982.247-25 é válido)
- Mostra OOP real: atributos privados, múltiplos métodos, encapsulamento
- Código completamente autossuficiente
