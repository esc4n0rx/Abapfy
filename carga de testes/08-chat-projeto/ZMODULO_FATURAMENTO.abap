*&---------------------------------------------------------------------*
*& Function Group: ZFATURAMENTO
*& Módulo de faturamento — consulta e processamento de faturas
*&---------------------------------------------------------------------*

FUNCTION z_consultar_faturas.
*"----------------------------------------------------------------------
*"  IMPORTING: IV_BUKRS, IV_GJAHR, IV_MONAT (optional)
*"  EXPORTING: ET_FATURAS TYPE ZFAT_T_FATURAS
*"----------------------------------------------------------------------
  SELECT vbeln fkdat kunrg netwr waerk
    INTO CORRESPONDING FIELDS OF TABLE @et_faturas
    FROM vbrk
    WHERE bukrs = @iv_bukrs
      AND gjahr = @iv_gjahr
      AND fkdat+4(2) = @iv_monat
      AND fkart IN ('F2', 'RE', 'G2')
      AND rfbsk = 'C'.
ENDFUNCTION.

FUNCTION z_cancelar_fatura.
*"----------------------------------------------------------------------
*"  IMPORTING: IV_VBELN
*"  EXPORTING: EV_DOC_CANCEL TYPE VBELN_VF
*"  EXCEPTIONS: FATURA_NAOEXISTE, JAESTORNADA, ERRO_ESTORNO
*"----------------------------------------------------------------------
  DATA: lv_fkart TYPE vbrk-fkart.

  SELECT SINGLE fkart INTO @lv_fkart
    FROM vbrk WHERE vbeln = @iv_vbeln.

  IF sy-subrc <> 0.
    RAISE fatura_naoexiste.
  ENDIF.

  CALL FUNCTION 'BILLING_DOCUMENT_REVERSE'
    EXPORTING
      vbeln = iv_vbeln
    IMPORTING
      re_vbeln = ev_doc_cancel
    EXCEPTIONS
      error_message = 1
      OTHERS        = 2.

  IF sy-subrc <> 0.
    RAISE erro_estorno.
  ENDIF.

ENDFUNCTION.
