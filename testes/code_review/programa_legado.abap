*&---------------------------------------------------------------------*
*& ZLEGADO_NOTAS — Programa legado para demo de Code Review
*& Contém: nomenclatura ruim, sem comentários, hardcodes, lógica frágil
*&---------------------------------------------------------------------*
REPORT zlegado_notas.

DATA: t1 TYPE STANDARD TABLE OF ekko,
      t2 TYPE STANDARD TABLE OF ekpo,
      w1 TYPE ekko,
      w2 TYPE ekpo,
      v1 TYPE dmbtr,
      v2 TYPE dmbtr,
      v3 TYPE i,
      v4 TYPE string,
      flag TYPE char1.

SELECTION-SCREEN BEGIN OF BLOCK a.
  PARAMETERS: p1 TYPE ekko-bukrs DEFAULT '1000',
              p2 TYPE ekko-bedat.
SELECTION-SCREEN END OF BLOCK a.

START-OF-SELECTION.

  SELECT * FROM ekko INTO TABLE t1
    WHERE bukrs = p1
      AND bedat >= p2.

  IF sy-subrc <> 0.
    MESSAGE 'Nenhum dado' TYPE 'I'.
    LEAVE PROGRAM.
  ENDIF.

  LOOP AT t1 INTO w1.
    SELECT * FROM ekpo INTO TABLE t2
      WHERE ebeln = w1-ebeln.

    v1 = 0.
    LOOP AT t2 INTO w2.
      v1 = v1 + w2-netpr * w2-menge.
    ENDLOOP.

    IF v1 > 999999.
      flag = 'X'.
    ENDIF.

    v2 = v2 + v1.
    v3 = v3 + 1.

    CONCATENATE v4 w1-ebeln '-' w1-lifnr '|' INTO v4.
  ENDLOOP.

  v4+0(5) = 'TOTAL'.

  IF flag = 'X'.
    WRITE: / 'ALERTA: pedido acima do limite'.
  ENDIF.

  WRITE: / 'Registros:', v3,
         / 'Total R$:', v2.

  DATA: aux TYPE dmbtr.
  aux = v2 / v3.
  WRITE: / 'Media:', aux.

  IF v3 = 0.
    WRITE: / 'Divisao por zero evitada'.
  ENDIF.
