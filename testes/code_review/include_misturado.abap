*&---------------------------------------------------------------------*
*& ZREL_ESTOQUE_F01 — Include com problemas estruturais
*& Para demo de Code Review: mistura de ALV, lógica e tela no mesmo FORM
*&---------------------------------------------------------------------*

*&---------------------------------------------------------------------*
*& FORM processar_tudo — faz seleção, cálculo e exibição no mesmo FORM
*&---------------------------------------------------------------------*
FORM processar_tudo.
  DATA: lt_mard TYPE STANDARD TABLE OF mard,
        ls_mard TYPE mard,
        lt_mara TYPE STANDARD TABLE OF mara,
        ls_mara TYPE mara,
        lv_total TYPE labst,
        lt_out   TYPE STANDARD TABLE OF mard.

  " Mistura dois tipos de ALV no mesmo programa
  DATA: lt_fc1 TYPE slis_t_fieldcat_alv,
        ls_fc1 TYPE slis_fieldcat_alv,
        lo_salv TYPE REF TO cl_salv_table.   " ambos declarados!

  " SELECT sem campos explícitos
  SELECT * FROM mard INTO TABLE lt_mard
    WHERE werks = '0001'.

  " SELECT dentro de LOOP
  LOOP AT lt_mard INTO ls_mard.
    SELECT SINGLE * FROM mara INTO ls_mara
      WHERE matnr = ls_mard-matnr.

    lv_total = lv_total + ls_mard-labst.
    APPEND ls_mard TO lt_out.
  ENDLOOP.

  " fieldcat sem CLEAR antes de cada campo
  ls_fc1-fieldname = 'MATNR'.
  ls_fc1-seltext_m = 'Material'.
  ls_fc1-key       = 'X'.
  APPEND ls_fc1 TO lt_fc1.
  ls_fc1-fieldname = 'WERKS'.         " key = 'X' contaminado do campo anterior!
  ls_fc1-seltext_m = 'Centro'.
  APPEND ls_fc1 TO lt_fc1.
  ls_fc1-fieldname = 'LABST'.
  ls_fc1-seltext_m = 'Estoque'.
  ls_fc1-do_sum    = 'X'.
  APPEND ls_fc1 TO lt_fc1.

  " Tenta usar CL_SALV_TABLE mas lt_out é TYPE TABLE OF mard — incompatível se mudou estrutura
  TRY.
    cl_salv_table=>factory(
      IMPORTING r_salv_table = lo_salv
      CHANGING  t_table      = lt_out ).
    lo_salv->display( ).
  CATCH cx_salv_msg.
    " Exception capturada mas ignorada silenciosamente
  ENDTRY.

  " Ainda tenta chamar REUSE_ALV depois (código morto)
  CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
    EXPORTING
      it_fieldcat = lt_fc1
    TABLES
      t_outtab    = lt_out.

ENDFORM.

*&---------------------------------------------------------------------*
*& FORM validar_estoque — lógica de negócio misturada com mensagem de tela
*&---------------------------------------------------------------------*
FORM validar_estoque USING iv_matnr TYPE matnr
                           iv_labst TYPE labst.
  " Sem documentação dos parâmetros
  IF iv_labst < 0.
    " Mensagem hardcoded em português no código
    MESSAGE 'Estoque negativo para material ' TYPE 'E'.
    " Não concatena o material na mensagem
  ENDIF.

  " Valor de mínimo hardcoded sem constante
  IF iv_labst < 50.
    WRITE: / '*** CRITICO ***', iv_matnr, iv_labst.
  ENDIF.
ENDFORM.
