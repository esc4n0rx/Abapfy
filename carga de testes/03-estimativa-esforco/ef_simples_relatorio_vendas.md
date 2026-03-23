# EF Simples — Relatório de Vendas por Período

## Contexto para gerar a EF

Cole o texto abaixo no campo de **contexto** do módulo Especificações para gerar uma EF e depois testar a Estimativa de Esforço.

---

## Descrição do Requisito

**Solicitante:** Diretoria Comercial
**Data:** Março/2026
**Sistema:** SAP ECC 6.0 EHP8
**Módulo:** SD (Sales & Distribution)

### Problema atual
Atualmente os analistas de vendas precisam acessar 3 transações diferentes (VA05, VF05, S_ALR_87012186) para consolidar as informações de pedidos, entregas e faturamento. O processo leva em média 45 minutos por análise e está sujeito a erros de compilação manual.

### O que precisa ser feito
Criar um relatório único em ABAP que consolide:
1. Pedidos de venda do período (tabela VBAK/VBAP)
2. Status de entrega (tabela LIKP/LIPS)
3. Status de faturamento (tabela VBRK/VBRP)

### Parâmetros de entrada
- Data do pedido (intervalo, obrigatório)
- Cliente (opcional, múltipla seleção)
- Organização de vendas (obrigatório)
- Canal de distribuição (opcional)
- Moeda de exibição (default: BRL)

### Saída esperada
Relatório ALV com:
- Número do pedido
- Cliente (número + razão social)
- Data do pedido
- Valor líquido na moeda do pedido
- Valor líquido convertido para moeda de exibição
- Status do pedido (Aberto / Parcialmente entregue / Totalmente entregue)
- Status de faturamento (Não faturado / Parcial / Total)
- Número da NF (se existir)

### Regras de negócio
- Pedidos cancelados (GBSTK = 'C') não devem aparecer
- Conversão de moeda deve usar taxa do dia do pedido
- Totalizar por cliente e rodapé geral
- Permitir exportar para Excel

### Usuários afetados
~15 analistas de vendas das filiais SP, RJ, MG
