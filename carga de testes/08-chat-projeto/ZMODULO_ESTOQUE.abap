*&---------------------------------------------------------------------*
*& Report ZMODULO_ESTOQUE — Controle de Estoque por Centro
*&---------------------------------------------------------------------*
REPORT zmodulo_estoque.

TABLES: mara, marc, mard, t001w.

TYPES:
  BEGIN OF ty_estoque,
    matnr TYPE matnr,
    werks TYPE werks_d,
    lgort TYPE lgort_d,
    labst TYPE labst,
    einme TYPE einme,
    retme TYPE retme,
    maktx TYPE maktx,
    meins TYPE meins,
  END OF ty_estoque.

DATA:
  lt_estoque TYPE STANDARD TABLE OF ty_estoque,
  lt_mard    TYPE STANDARD TABLE OF mard,
  lt_makt    TYPE HASHED TABLE OF makt WITH UNIQUE KEY matnr spras.

SELECT-OPTIONS:
  s_matnr FOR mara-matnr,
  s_werks FOR marc-werks OBLIGATORY.

START-OF-SELECTION.

  SELECT matnr werks lgort labst einme retme
    INTO CORRESPONDING FIELDS OF TABLE @lt_mard
    FROM mard
    WHERE matnr IN @s_matnr
      AND werks IN @s_werks
      AND ( labst > 0 OR einme > 0 OR retme > 0 ).

  CHECK lt_mard IS NOT INITIAL.

  SELECT matnr spras maktx
    INTO CORRESPONDING FIELDS OF TABLE @lt_makt
    FROM makt
    FOR ALL ENTRIES IN @lt_mard
    WHERE matnr = @lt_mard-matnr
      AND spras = @sy-langu.

  LOOP AT lt_mard INTO DATA(ls_mard).
    DATA(ls_est) = CORRESPONDING ty_estoque( ls_mard ).

    READ TABLE lt_makt ASSIGNING FIELD-SYMBOL(<makt>)
      WITH TABLE KEY matnr = ls_mard-matnr spras = sy-langu.
    IF sy-subrc = 0.
      ls_est-maktx = <makt>-maktx.
    ENDIF.

    SELECT SINGLE meins INTO @ls_est-meins
      FROM mara WHERE matnr = @ls_mard-matnr.

    APPEND ls_est TO lt_estoque.
  ENDLOOP.

  SORT lt_estoque BY werks matnr lgort.

  LOOP AT lt_estoque INTO DATA(ls).
    WRITE: / ls-matnr, ls-maktx(30), ls-werks, ls-lgort,
             ls-labst, ls-einme, ls-retme, ls-meins.
  ENDLOOP.
