# Cenário 01 — REPORT: Lista de Tarefas com ALV

> Programa simples e visual. Ótimo para abrir a demo — resultado imediato no ALV.

## Campos do Wizard

| Campo | Valor |
|-------|-------|
| Tipo | REPORT |
| Nome | ZDEMO_TAREFAS |
| Transação | ZDM01 |
| Empresa | 1000 |
| Descrição | Gerenciador de tarefas com ALV — dados internos |

## Contexto / Fluxo

```
Programa demonstrativo de gerenciamento de tarefas usando exclusivamente
tabelas internas — sem acesso a banco de dados SAP.

Fluxo:
1. No evento INITIALIZATION, popular uma tabela interna com 8 tarefas de exemplo
   com os campos: número sequencial, título, responsável, prioridade (ALTA/MÉDIA/BAIXA),
   status (ABERTA/EM ANDAMENTO/CONCLUÍDA) e data de vencimento.

2. Exibir as tarefas em ALV usando CL_SALV_TABLE com:
   - Coluna STATUS com semáforo de cor:
       CONCLUÍDA   → verde  (C_GREEN)
       EM ANDAMENTO → amarelo (C_YELLOW)
       ABERTA       → vermelho (C_RED)
   - Coluna PRIORIDADE com ícone
   - Botões padrão habilitados (sort, filter, export Excel)
   - Título do ALV: "Gerenciador de Tarefas — ABAP Tools Demo"

Dados de exemplo a criar na tabela interna (hardcoded):
  1 | Migrar tabela ZMM001       | João Silva    | ALTA   | EM ANDAMENTO | 30.06.2025
  2 | Revisar enhancement ME21N  | Maria Santos  | ALTA   | ABERTA       | 15.06.2025
  3 | Criar RFC Z_GET_MATERIAL   | Carlos Lima   | MÉDIA  | CONCLUÍDA    | 01.06.2025
  4 | Documentar BAdI MR_POSTED  | Ana Oliveira  | BAIXA  | ABERTA       | 30.07.2025
  5 | Otimizar ZREL_ESTOQUE      | João Silva    | ALTA   | EM ANDAMENTO | 20.06.2025
  6 | Testar integração Fiori    | Pedro Costa   | MÉDIA  | ABERTA       | 10.07.2025
  7 | Corrigir dump ZFIN_FECHA   | Maria Santos  | ALTA   | CONCLUÍDA    | 05.06.2025
  8 | Atualizar SCI transport    | Carlos Lima   | BAIXA  | ABERTA       | 31.07.2025
```

## Regras de Negócio

1. Tarefas com vencimento já passado e status ABERTA devem exibir a linha em vermelho
2. Ordenar por padrão: PRIORIDADE desc, DATA_VENCIMENTO asc
3. Rodapé do ALV deve exibir contagem por status: X abertas, Y em andamento, Z concluídas
4. Não usar SELECT, CALL FUNCTION ou CALL METHOD de classes externas — apenas CL_SALV_TABLE

## Por que usar nesta demo
- Resultado visual imediato no ALV com cores
- Demonstra que o modelo entende estruturas complexas (semáforo, fieldcat)
- Zero dependência de ambiente SAP
