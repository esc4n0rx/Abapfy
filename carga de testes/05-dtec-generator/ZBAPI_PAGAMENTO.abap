*&---------------------------------------------------------------------*
*& Function Module: ZBAPI_PAGAMENTO_PROCESSAR
*& Processa pagamento de fornecedor via BAPI FI
*&---------------------------------------------------------------------*
FUNCTION zbapi_pagamento_processar.
*"----------------------------------------------------------------------
*"*"Interface local:
*"  IMPORTING
*"     VALUE(IV_BUKRS) TYPE  BUKRS
*"     VALUE(IV_LIFNR) TYPE  LIFNR
*"     VALUE(IV_BELNR) TYPE  BELNR_D OPTIONAL
*"     VALUE(IV_GJAHR) TYPE  GJAHR OPTIONAL
*"     VALUE(IV_DMBTR) TYPE  DMBTR
*"     VALUE(IV_WAERS) TYPE  WAERS DEFAULT 'BRL'
*"     VALUE(IV_ZFBDT) TYPE  ZFBDT OPTIONAL
*"  EXPORTING
*"     VALUE(EV_DOC_NUMBER) TYPE  BELNR_D
*"     VALUE(EV_FISCAL_YEAR) TYPE  GJAHR
*"  TABLES
*"      TT_RETURN STRUCTURE  BAPIRET2
*"  EXCEPTIONS
*"     FORNECEDOR_INVALIDO
*"     VALOR_INVALIDO
*"     EMPRESA_INVALIDA
*"     ERRO_BAPI
*"----------------------------------------------------------------------

  DATA: ls_header      TYPE bapiacap00,
        ls_return      TYPE bapiret2,
        lt_accountgl   TYPE TABLE OF bapiacgl09,
        lt_accountap   TYPE TABLE OF bapiacap09,
        lt_currencyamt TYPE TABLE OF bapiaccr09,
        ls_acgl        TYPE bapiacgl09,
        ls_acap        TYPE bapiacap09,
        ls_curr        TYPE bapiaccr09,
        lv_pstng_date  TYPE bapiacap00-pstng_date,
        lv_lifnr_check TYPE lfa1-lifnr.

  " -------------------------------------------------------
  " Validações de entrada
  " -------------------------------------------------------

  " Valida empresa
  SELECT SINGLE bukrs FROM t001
    INTO @DATA(lv_bukrs_chk)
    WHERE bukrs = @iv_bukrs.
  IF sy-subrc <> 0.
    RAISE empresa_invalida.
  ENDIF.

  " Valida fornecedor
  SELECT SINGLE lifnr FROM lfa1
    INTO @lv_lifnr_check
    WHERE lifnr = @iv_lifnr
      AND loevm = ''.
  IF sy-subrc <> 0.
    RAISE fornecedor_invalido.
  ENDIF.

  " Valida valor
  IF iv_dmbtr <= 0.
    RAISE valor_invalido.
  ENDIF.

  " -------------------------------------------------------
  " Monta cabeçalho do documento
  " -------------------------------------------------------
  lv_pstng_date = COND #( WHEN iv_zfbdt IS NOT INITIAL
                           THEN iv_zfbdt
                           ELSE sy-datum ).

  ls_header-bus_act     = 'RFBU'.
  ls_header-username    = sy-uname.
  ls_header-header_txt  = |PGTO { iv_lifnr } { lv_pstng_date }|.
  ls_header-comp_code   = iv_bukrs.
  ls_header-doc_date    = sy-datum.
  ls_header-pstng_date  = lv_pstng_date.
  ls_header-doc_type    = 'KZ'.
  ls_header-ref_doc_no  = iv_belnr.

  " -------------------------------------------------------
  " Item do fornecedor (lado crédito — KZ = pagamento saída)
  " -------------------------------------------------------
  ls_acap-itemno_acc   = '0000000001'.
  ls_acap-vendor_no    = iv_lifnr.
  ls_acap-comp_code    = iv_bukrs.
  ls_acap-gl_account   = '0000160000'.  " Conta banco
  ls_acap-pmnt_block   = ''.
  ls_acap-bline_date   = lv_pstng_date.
  APPEND ls_acap TO lt_accountap.

  " -------------------------------------------------------
  " Item de conta bancária (débito)
  " -------------------------------------------------------
  ls_acgl-itemno_acc   = '0000000002'.
  ls_acgl-gl_account   = '0000113100'.  " Conta caixa/banco
  ls_acgl-comp_code    = iv_bukrs.
  ls_acgl-doc_type     = 'KZ'.
  APPEND ls_acgl TO lt_accountgl.

  " -------------------------------------------------------
  " Valores
  " -------------------------------------------------------
  ls_curr-itemno_acc   = '0000000001'.
  ls_curr-currency     = iv_waers.
  ls_curr-amt_doccur   = iv_dmbtr * -1.  " Crédito = negativo
  APPEND ls_curr TO lt_currencyamt.

  ls_curr-itemno_acc   = '0000000002'.
  ls_curr-currency     = iv_waers.
  ls_curr-amt_doccur   = iv_dmbtr.       " Débito = positivo
  APPEND ls_curr TO lt_currencyamt.

  " -------------------------------------------------------
  " Chama BAPI de lançamento
  " -------------------------------------------------------
  CALL FUNCTION 'BAPI_ACC_DOCUMENT_POST'
    EXPORTING
      documentheader = ls_header
    IMPORTING
      obj_key        = DATA(lv_obj_key)
    TABLES
      accountgl      = lt_accountgl
      accountpayable = lt_accountap
      currencyamount = lt_currencyamt
      return         = tt_return.

  " Verifica se houve erros
  READ TABLE tt_return INTO ls_return
    WITH KEY type = 'E'.
  IF sy-subrc = 0.
    CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
    RAISE erro_bapi.
  ENDIF.

  READ TABLE tt_return INTO ls_return
    WITH KEY type = 'A'.
  IF sy-subrc = 0.
    CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
    RAISE erro_bapi.
  ENDIF.

  " Commit e extrai número do documento
  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'
    EXPORTING
      wait = abap_true.

  SPLIT lv_obj_key AT ' ' INTO ev_doc_number ev_fiscal_year DATA(lv_bukrs_out).

ENDFUNCTION.
