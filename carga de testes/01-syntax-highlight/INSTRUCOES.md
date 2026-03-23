# Carga de Testes — 01 Syntax Highlight

## Objetivo
Testar o componente `AbapHighlight` que realça a sintaxe do código ABAP nas views.

## Como testar

### No módulo ABAP (Gerador)
1. Abra o módulo **ABAP** na sidebar
2. Gere qualquer programa (ex: "Relatório de vendas por período")
3. Após gerado, abra o arquivo — o código deve aparecer com cores:
   - **Azul claro** → palavras-chave ABAP (`SELECT`, `LOOP`, `IF`, `DATA`, etc.)
   - **Verde** → strings (`'texto'`)
   - **Cinza** → comentários (`* comentário` ou `" comentário inline`)
   - **Laranja** → números

### No módulo Histórico
1. Abra o módulo **Histórico**
2. Clique em qualquer programa já gerado
3. O painel direito deve mostrar os arquivos com syntax highlight

## Arquivos de referência
- `ZRELATORIO_VENDAS.abap` — Report com SELECTION-SCREEN, SELECT, LOOP, FIELD-SYMBOLS, PERFORM, FORM
- `ZCLAS_ORDEM_COMPRA.abap` — Classe OOP com DEFINITION/IMPLEMENTATION, BAPI, exception class, COND #

## O que verificar
- [ ] Keywords em azul (`REPORT`, `CLASS`, `METHOD`, `SELECT`, `LOOP AT`, `IF`, `TYPES`, `DATA`)
- [ ] Strings em verde (`'BRL'`, `'NB'`, `'I'`, etc.)
- [ ] Comentários `*&---` e `"` em cinza
- [ ] Números (`10`, `30`, `0.06`) em laranja/vermelho
- [ ] Nenhuma palavra dentro de string sendo colorida como keyword
- [ ] Performance OK mesmo em arquivos com 100+ linhas
