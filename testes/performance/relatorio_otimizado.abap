*&---------------------------------------------------------------------*
*& ZDEMO_PERF_BOM — Versão otimizada do mesmo relatório
*& Use para mostrar o "antes e depois" após análise de performance
*&---------------------------------------------------------------------*
REPORT zdemo_perf_bom.

* ── Tipos locais ───────────────────────────────────────────────────────
TYPES: BEGIN OF ty_pedido,
         ebeln TYPE ekko-ebeln,
         lifnr TYPE ekko-lifnr,
         bedat TYPE ekko-bedat,
         bukrs TYPE ekko-bukrs,
       END OF ty_pedido.

TYPES: BEGIN OF ty_item,
         ebeln TYPE ekpo-ebeln,
         ebelp TYPE ekpo-ebelp,
         matnr TYPE ekpo-matnr,
         netpr TYPE ekpo-netpr,
         loekz TYPE ekpo-loekz,
         elikz TYPE ekpo-elikz,
       END OF ty_item.

TYPES: BEGIN OF ty_fornec,
         lifnr TYPE lfa1-lifnr,
         name1 TYPE lfa1-name1,
       END OF ty_fornec.

* ── Declarações globais ────────────────────────────────────────────────
DATA: gt_pedidos  TYPE STANDARD TABLE OF ty_pedido,
      gt_itens    TYPE STANDARD TABLE OF ty_item,
      gt_fornec   TYPE HASHED TABLE OF ty_fornec WITH UNIQUE KEY lifnr,
      gs_pedido   TYPE ty_pedido,
      gs_item     TYPE ty_item,
      gs_fornec   TYPE ty_fornec,
      gv_total    TYPE dmbtr,
      gv_contador TYPE i.

FIELD-SYMBOLS: <fs_pedido> TYPE ty_pedido,
               <fs_item>   TYPE ty_item.

SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-001.
  SELECT-OPTIONS: s_ebeln FOR ekko-ebeln,
                  s_lifnr FOR ekko-lifnr.
  PARAMETERS: p_werks TYPE ekpo-werks.
SELECTION-SCREEN END OF BLOCK b1.

* ── Início da seleção ──────────────────────────────────────────────────
START-OF-SELECTION.
  PERFORM f_buscar_dados.
  PERFORM f_processar.
  PERFORM f_exibir.

*&---------------------------------------------------------------------*
*& FORM f_buscar_dados — 1 query por tabela, sem SELECT em LOOP
*&---------------------------------------------------------------------*
FORM f_buscar_dados.
  " FIX 1: SELECT com campos explícitos (sem SELECT *)
  SELECT ebeln lifnr bedat bukrs
    FROM ekko
    INTO TABLE gt_pedidos
    WHERE ebeln IN s_ebeln
      AND lifnr IN s_lifnr
    ORDER BY ebeln.

  " FIX 2: FOR ALL ENTRIES com verificação de tabela não vazia
  CHECK gt_pedidos IS NOT INITIAL.

  SELECT ebeln ebelp matnr netpr loekz elikz
    FROM ekpo
    INTO TABLE gt_itens
    FOR ALL ENTRIES IN gt_pedidos
    WHERE ebeln = gt_pedidos-ebeln
      AND loekz = space
      AND elikz = space
    ORDER BY ebeln ebelp.

  " FIX 3: SELECT único de fornecedores (sem busca dentro do loop)
  SELECT lifnr name1
    FROM lfa1
    INTO TABLE gt_fornec
    FOR ALL ENTRIES IN gt_pedidos
    WHERE lifnr = gt_pedidos-lifnr.
ENDFORM.

*&---------------------------------------------------------------------*
*& FORM f_processar — lógica de negócio sem queries adicionais
*&---------------------------------------------------------------------*
FORM f_processar.
  " FIX 4: FIELD-SYMBOLS para leitura em loops (evita cópia de estrutura)
  LOOP AT gt_itens ASSIGNING <fs_item>.
    gv_total = gv_total + <fs_item>-netpr.
  ENDLOOP.

  DESCRIBE TABLE gt_pedidos LINES gv_contador.

  " FIX 5: READ TABLE com BINARY SEARCH (tabela já ordenada pelo SELECT)
  DATA: lv_ebeln TYPE ekko-ebeln VALUE '4500000001'.
  READ TABLE gt_pedidos ASSIGNING <fs_pedido>
    WITH KEY ebeln = lv_ebeln BINARY SEARCH.

  " FIX 6: Busca em tabela HASHED (O(1) vs O(n))
  READ TABLE gt_fornec INTO gs_fornec WITH TABLE KEY lifnr = '0000100001'.
ENDFORM.

*&---------------------------------------------------------------------*
*& FORM f_exibir
*&---------------------------------------------------------------------*
FORM f_exibir.
  WRITE: / 'Total processado:', gv_total,
         / 'Pedidos:', gv_contador.
ENDFORM.
