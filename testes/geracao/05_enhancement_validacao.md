# Cenário 05 — ENHANCEMENT: Validação de Limite de Aprovação

> Demonstra BAdI/Enhancement — contexto mais técnico para audiência SAP.

## Campos do Wizard

| Campo | Valor |
|-------|-------|
| Tipo | ENHO |
| Nome | ZENH_LIMITE_APROV |
| Programa alvo | ZSDEMO_PEDIDO (programa Z simulado) |
| Tipo de Enhancement | Enhancement Spot |
| Spot/BAdI | ES_ZDEMO_PEDIDO |
| Descrição | Valida limite de aprovação antes de gravar pedido |

## Contexto

```
Enhancement que intercepta a gravação de um pedido de compra para validar
se o valor total ultrapassa o limite de aprovação do usuário logado.

A tabela de limites é simulada como tabela interna local (não há SELECT):
  Usuário        | Limite (R$)
  APROVADOR01    | 50.000,00
  APROVADOR02    | 100.000,00
  APROVADOR03    | 500.000,00
  (qualquer outro usuário) | 10.000,00

Fluxo do Enhancement:
  1. Capturar SY-UNAME (usuário logado)
  2. Buscar limite correspondente na tabela interna local
  3. Receber o valor total do pedido via variável do programa original (simulado
     como importação de uma variável GV_VALOR_TOTAL do tipo DMBTR)
  4. Se GV_VALOR_TOTAL > limite_usuario:
     - Emitir MESSAGE E com o texto:
       "Valor R$ X.XXX,XX excede seu limite de aprovação R$ Y.YYY,YY"
     - Isso impede a gravação (MESSAGE tipo E)
  5. Se dentro do limite: escrever no log via WRITE linha de auditoria
     "Pedido aprovado por &SY-UNAME& — valor R$ X,XX — &SY-DATUM&"
```

## Regras de Negócio

1. O enhancement deve funcionar mesmo se o usuário não estiver na tabela (usa limite padrão 10.000)
2. A mensagem de erro deve mostrar tanto o valor do pedido quanto o limite do usuário
3. Usar ENHANCEMENT ... ENDENHANCEMENT com nota clara de qual ponto do programa é ampliado
4. Adicionar comentário explicando que em produção a tabela seria ZTABELA_LIMITES (BD real)

## Por que usar nesta demo
- Enhancement é o tipo mais temido pelos consultores — demonstra que o modelo conhece a sintaxe
- Contexto de negócio real (aprovação por alçada)
- Nenhuma dependência de BD (tabela de limites é interna)
