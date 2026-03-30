*&---------------------------------------------------------------------*
*& ZDEMO_PERF_RUIM — Relatório com problemas de performance
*& Use este código na aba de Análise de Performance do ABAP Tools
*& Problemas intencionais: SELECT *, SELECT em LOOP, FAE sem check, etc.
*&---------------------------------------------------------------------*
REPORT zdemo_perf_ruim.

* ── Declarações globais ────────────────────────────────────────────────
TABLES: ekko, ekpo, lfa1, mara.

DATA: gt_pedidos   TYPE STANDARD TABLE OF ekko,
      gt_itens     TYPE STANDARD TABLE OF ekpo,
      gt_fornec    TYPE STANDARD TABLE OF lfa1,
      gs_pedido    TYPE ekko,
      gs_item      TYPE ekpo,
      gs_fornec    TYPE lfa1,
      gv_total     TYPE dmbtr,
      gv_contador  TYPE i,
      gv_msg       TYPE string,
      gv_dummy     TYPE string.          " variável declarada mas nunca usada

SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-001.
  SELECT-OPTIONS: s_ebeln FOR ekko-ebeln,
                  s_lifnr FOR ekko-lifnr.
  PARAMETERS: p_werks TYPE ekpo-werks.
SELECTION-SCREEN END OF BLOCK b1.

* ── Início da seleção ──────────────────────────────────────────────────
START-OF-SELECTION.

  " PROBLEMA 1: SELECT * sem especificar campos
  SELECT * FROM ekko
    INTO TABLE gt_pedidos
    WHERE ebeln IN s_ebeln
      AND lifnr IN s_lifnr.

  " PROBLEMA 2: SELECT dentro de LOOP (N+1 queries — crítico!)
  LOOP AT gt_pedidos INTO gs_pedido.
    gv_contador = gv_contador + 1.

    " Busca itens para cada pedido individualmente — muito lento
    SELECT * FROM ekpo
      INTO TABLE gt_itens
      WHERE ebeln = gs_pedido-ebeln.

    " Busca fornecedor dentro do loop — outra query por iteração
    SELECT SINGLE * FROM lfa1
      INTO gs_fornec
      WHERE lifnr = gs_pedido-lifnr.

    " Acumula total sem verificação
    LOOP AT gt_itens INTO gs_item.
      gv_total = gv_total + gs_item-netpr.
    ENDLOOP.

  ENDLOOP.

  " PROBLEMA 3: FOR ALL ENTRIES sem verificar tabela vazia
  " Se gt_pedidos estiver vazia, seleciona TUDO da tabela
  SELECT * FROM mara
    INTO TABLE DATA(gt_materiais)
    FOR ALL ENTRIES IN gt_pedidos
    WHERE matnr = gt_pedidos-matnr.

  " PROBLEMA 4: Conversão implícita de tipos em loop
  DATA: lv_valor_str TYPE string.
  LOOP AT gt_itens INTO gs_item.
    lv_valor_str = gs_item-netpr.    " conversão implícita DMBTR → STRING
    CONCATENATE gv_msg lv_valor_str INTO gv_msg SEPARATED BY '/'.
  ENDLOOP.

  " PROBLEMA 5: SORT desnecessário (já viria ordenado do SELECT com ORDER BY)
  SORT gt_pedidos BY ebeln ASCENDING.
  SORT gt_itens   BY ebeln ebelp ASCENDING.
  SORT gt_pedidos BY ebeln ASCENDING.  " sort duplicado

  " PROBLEMA 6: READ TABLE sem BINARY SEARCH em tabela grande
  DATA: lv_ebeln TYPE ebeln VALUE '4500000001'.
  READ TABLE gt_pedidos INTO gs_pedido WITH KEY ebeln = lv_ebeln.

  " PROBLEMA 7: DELETE desnecessário dentro de loop com condição complexa
  DATA lt_temp LIKE gt_itens.
  lt_temp = gt_itens.
  LOOP AT lt_temp INTO gs_item.
    IF gs_item-netpr < 0 OR gs_item-loekz = 'X' OR gs_item-elikz = 'X'.
      DELETE lt_temp.  " delete table index implícito — frágil
    ENDIF.
  ENDLOOP.

  " PROBLEMA 8: DESCRIBE TABLE dentro de loop
  DATA: lv_lines TYPE i.
  LOOP AT gt_pedidos INTO gs_pedido.
    DESCRIBE TABLE gt_itens LINES lv_lines.  " recalcula a cada iteração
    IF lv_lines > 100.
      WRITE: / 'Muitos itens para pedido', gs_pedido-ebeln.
    ENDIF.
  ENDLOOP.

  " Output simples
  WRITE: / 'Total processado:', gv_total,
         / 'Pedidos:', gv_contador.
