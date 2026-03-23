*&---------------------------------------------------------------------*
*& Classe ZCLAS_ORDEM_COMPRA — Gerenciamento de Ordens de Compra
*&---------------------------------------------------------------------*
CLASS zclas_ordem_compra DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES:
      BEGIN OF ty_item,
        matnr  TYPE matnr,
        menge  TYPE menge_d,
        meins  TYPE meins,
        netpr  TYPE bprei,
        waers  TYPE waers,
      END OF ty_item,
      tt_itens TYPE STANDARD TABLE OF ty_item WITH DEFAULT KEY.

    METHODS:
      constructor
        IMPORTING
          iv_bukrs TYPE bukrs
          iv_ekorg TYPE ekorg,
      criar_ordem
        IMPORTING
          iv_lifnr  TYPE lifnr
          it_itens  TYPE tt_itens
        RETURNING
          VALUE(rv_ebeln) TYPE ebeln
        RAISING
          zcx_ordem_compra,
      get_status
        IMPORTING
          iv_ebeln        TYPE ebeln
        RETURNING
          VALUE(rv_status) TYPE char1,
      liberar_ordem
        IMPORTING
          iv_ebeln TYPE ebeln
        RAISING
          zcx_ordem_compra.

  PRIVATE SECTION.
    DATA:
      mv_bukrs TYPE bukrs,
      mv_ekorg TYPE ekorg,
      mv_uname TYPE syuname.

    METHODS:
      f_validar_fornecedor
        IMPORTING
          iv_lifnr TYPE lifnr
        RETURNING
          VALUE(rv_ok) TYPE abap_bool,
      f_log_auditoria
        IMPORTING
          iv_acao  TYPE string
          iv_ebeln TYPE ebeln.

ENDCLASS.

CLASS zclas_ordem_compra IMPLEMENTATION.

  METHOD constructor.
    mv_bukrs = iv_bukrs.
    mv_ekorg = iv_ekorg.
    mv_uname = sy-uname.
  ENDMETHOD.

  METHOD criar_ordem.
    DATA: ls_header  TYPE bapimepoheader,
          ls_headerx TYPE bapimepoheaderx,
          lt_item    TYPE TABLE OF bapimepoitem,
          lt_itemx   TYPE TABLE OF bapimepoitemx,
          lt_return  TYPE TABLE OF bapiret2,
          ls_item    TYPE bapimepoitem,
          ls_itemx   TYPE bapimepoitemx,
          ls_return  TYPE bapiret2,
          lv_pos     TYPE ebelp.

    " Valida fornecedor antes de criar
    IF f_validar_fornecedor( iv_lifnr ) = abap_false.
      RAISE EXCEPTION TYPE zcx_ordem_compra
        EXPORTING
          textid  = zcx_ordem_compra=>fornecedor_invalido
          lifnr   = iv_lifnr.
    ENDIF.

    " Monta cabeçalho
    ls_header-comp_code  = mv_bukrs.
    ls_header-purch_org  = mv_ekorg.
    ls_header-vendor     = iv_lifnr.
    ls_header-doc_type   = 'NB'.
    ls_header-creat_date = sy-datum.

    ls_headerx-comp_code  = abap_true.
    ls_headerx-purch_org  = abap_true.
    ls_headerx-vendor     = abap_true.
    ls_headerx-doc_type   = abap_true.
    ls_headerx-creat_date = abap_true.

    " Monta itens
    lv_pos = 10.
    LOOP AT it_itens INTO DATA(ls_it).
      ls_item-po_item   = lv_pos.
      ls_item-material  = ls_it-matnr.
      ls_item-quantity  = ls_it-menge.
      ls_item-po_unit   = ls_it-meins.
      ls_item-net_price = ls_it-netpr.
      ls_item-currency  = ls_it-waers.
      APPEND ls_item TO lt_item.

      ls_itemx-po_item   = lv_pos.
      ls_itemx-material  = abap_true.
      ls_itemx-quantity  = abap_true.
      ls_itemx-po_unit   = abap_true.
      ls_itemx-net_price = abap_true.
      ls_itemx-currency  = abap_true.
      APPEND ls_itemx TO lt_itemx.

      lv_pos = lv_pos + 10.
    ENDLOOP.

    " Chama BAPI
    CALL FUNCTION 'BAPI_PO_CREATE1'
      EXPORTING
        poheader       = ls_header
        poheaderx      = ls_headerx
      IMPORTING
        exppurchaseorder = rv_ebeln
      TABLES
        poitem         = lt_item
        poitemx        = lt_itemx
        return         = lt_return.

    " Verifica erros
    READ TABLE lt_return INTO ls_return
      WITH KEY type = 'E'.
    IF sy-subrc = 0.
      CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
      RAISE EXCEPTION TYPE zcx_ordem_compra
        EXPORTING
          textid  = zcx_ordem_compra=>erro_bapi
          message = ls_return-message.
    ENDIF.

    CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'
      EXPORTING
        wait = abap_true.

    f_log_auditoria( iv_acao = 'CRIAR' iv_ebeln = rv_ebeln ).

  ENDMETHOD.

  METHOD get_status.
    SELECT SINGLE bedat INTO @DATA(lv_bedat)
      FROM ekko
      WHERE ebeln = @iv_ebeln.

    rv_status = COND #( WHEN sy-subrc = 0 THEN 'A' ELSE 'X' ).
  ENDMETHOD.

  METHOD liberar_ordem.
    " Implementação da liberação via workflow
    DATA(lv_status) = get_status( iv_ebeln ).
    IF lv_status = 'X'.
      RAISE EXCEPTION TYPE zcx_ordem_compra
        EXPORTING
          textid = zcx_ordem_compra=>ordem_nao_encontrada
          ebeln  = iv_ebeln.
    ENDIF.
    f_log_auditoria( iv_acao = 'LIBERAR' iv_ebeln = iv_ebeln ).
  ENDMETHOD.

  METHOD f_validar_fornecedor.
    SELECT SINGLE lifnr FROM lfa1
      INTO @DATA(lv_lifnr)
      WHERE lifnr = @iv_lifnr
        AND loevm = ''.
    rv_ok = COND #( WHEN sy-subrc = 0 THEN abap_true ELSE abap_false ).
  ENDMETHOD.

  METHOD f_log_auditoria.
    DATA: ls_log TYPE ztt_audit_log.
    ls_log-acao    = iv_acao.
    ls_log-ebeln   = iv_ebeln.
    ls_log-uname   = mv_uname.
    ls_log-dttimst = sy-datum && sy-uzeit.
    INSERT INTO ztt_audit_log VALUES ls_log.
    IF sy-subrc <> 0.
      " Log falhou — continua sem interromper o fluxo
      MESSAGE 'Falha ao gravar log de auditoria' TYPE 'W'.
    ENDIF.
  ENDMETHOD.

ENDCLASS.
