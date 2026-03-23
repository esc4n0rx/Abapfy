*&---------------------------------------------------------------------*
*& Report ZRELATORIO_VENDAS
*& Relatório de análise de vendas por período e cliente
*&---------------------------------------------------------------------*
REPORT zrelatorio_vendas.

*----------------------------------------------------------------------*
* Declarações de tipos e tabelas internas
*----------------------------------------------------------------------*
TYPES:
  BEGIN OF ty_venda,
    vbeln TYPE vbak-vbeln,
    kunnr TYPE vbak-kunnr,
    audat TYPE vbak-audat,
    netwr TYPE vbak-netwr,
    waerk TYPE vbak-waerk,
    name1 TYPE kna1-name1,
  END OF ty_venda.

DATA:
  lt_vendas     TYPE STANDARD TABLE OF ty_venda,
  ls_venda      TYPE ty_venda,
  lt_kna1       TYPE HASHED TABLE OF kna1 WITH UNIQUE KEY kunnr,
  ls_kna1       TYPE kna1,
  lv_total      TYPE p DECIMALS 2,
  lv_contador   TYPE i,
  lv_data_ini   TYPE sy-datum,
  lv_data_fim   TYPE sy-datum,
  lv_msg        TYPE string.

FIELD-SYMBOLS:
  <fs_venda>    TYPE ty_venda,
  <fs_kna1>     TYPE kna1.

*----------------------------------------------------------------------*
* Parâmetros de seleção
*----------------------------------------------------------------------*
SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-001.
  SELECT-OPTIONS: s_audat FOR sy-datum OBLIGATORY,
                  s_kunnr FOR vbak-kunnr.
  PARAMETERS:     p_moeda TYPE waers DEFAULT 'BRL',
                  p_top   TYPE i DEFAULT 10.
SELECTION-SCREEN END OF BLOCK b1.

*----------------------------------------------------------------------*
* Inicialização
*----------------------------------------------------------------------*
INITIALIZATION.
  lv_data_ini = sy-datum - 30.
  lv_data_fim = sy-datum.
  s_audat-low  = lv_data_ini.
  s_audat-high = lv_data_fim.
  s_audat-sign = 'I'.
  s_audat-option = 'BT'.
  APPEND s_audat.

*----------------------------------------------------------------------*
* Start-of-selection
*----------------------------------------------------------------------*
START-OF-SELECTION.

  PERFORM f_selecionar_dados.
  PERFORM f_enriquecer_clientes.
  PERFORM f_exibir_resultado.

*----------------------------------------------------------------------*
* Forms
*----------------------------------------------------------------------*
FORM f_selecionar_dados.

  SELECT vbeln kunnr audat netwr waerk
    INTO CORRESPONDING FIELDS OF TABLE lt_vendas
    FROM vbak
    WHERE audat IN s_audat
      AND kunnr IN s_kunnr
      AND waerk = p_moeda
      AND gbstk NE 'C'.

  IF sy-subrc <> 0.
    MESSAGE 'Nenhuma venda encontrada para o período.' TYPE 'I'.
    LEAVE LIST-PROCESSING.
  ENDIF.

  SORT lt_vendas BY netwr DESCENDING.

  " Limita ao TOP N
  lv_contador = lines( lt_vendas ).
  IF lv_contador > p_top.
    DELETE lt_vendas FROM p_top + 1.
  ENDIF.

ENDFORM.

FORM f_enriquecer_clientes.

  " Coleta clientes únicos
  DATA: lt_kunnr TYPE STANDARD TABLE OF kna1-kunnr.

  LOOP AT lt_vendas ASSIGNING <fs_venda>.
    APPEND <fs_venda>-kunnr TO lt_kunnr.
  ENDLOOP.

  SORT lt_kunnr.
  DELETE ADJACENT DUPLICATES FROM lt_kunnr.

  " Busca dados dos clientes de uma vez
  SELECT kunnr name1
    INTO CORRESPONDING FIELDS OF TABLE lt_kna1
    FROM kna1
    FOR ALL ENTRIES IN lt_kunnr
    WHERE kunnr = lt_kunnr-table_line.

  " Enriquece tabela principal
  LOOP AT lt_vendas ASSIGNING <fs_venda>.
    READ TABLE lt_kna1 ASSIGNING <fs_kna1>
      WITH TABLE KEY kunnr = <fs_venda>-kunnr.
    IF sy-subrc = 0.
      <fs_venda>-name1 = <fs_kna1>-name1.
    ELSE.
      <fs_venda>-name1 = '*** CLIENTE NÃO ENCONTRADO ***'.
    ENDIF.
  ENDLOOP.

ENDFORM.

FORM f_exibir_resultado.

  " Calcula total
  LOOP AT lt_vendas INTO ls_venda.
    lv_total = lv_total + ls_venda-netwr.
    lv_contador = lv_contador + 1.
  ENDLOOP.

  " Cabeçalho
  WRITE: / '=== RELATÓRIO DE VENDAS ==='.
  WRITE: / 'Período:', s_audat-low, 'a', s_audat-high.
  WRITE: / 'Moeda:', p_moeda.
  ULINE.

  " Linhas de detalhe
  LOOP AT lt_vendas ASSIGNING <fs_venda>.
    WRITE: / <fs_venda>-vbeln,
             <fs_venda>-kunnr,
             <fs_venda>-name1(30),
             <fs_venda>-audat,
             <fs_venda>-netwr CURRENCY p_moeda,
             <fs_venda>-waerk.
  ENDLOOP.

  ULINE.
  CONCATENATE 'Total (' lv_contador ' vendas):' INTO lv_msg.
  WRITE: / lv_msg, lv_total CURRENCY p_moeda, p_moeda.

ENDFORM.
