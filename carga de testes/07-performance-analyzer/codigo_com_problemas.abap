*&---------------------------------------------------------------------*
*& Report ZREL_COMISSOES_VENDEDOR - COM PROBLEMAS DE PERFORMANCE
*& (arquivo para testar o Performance Analyzer)
*&---------------------------------------------------------------------*
REPORT zrel_comissoes_vendedor.

TABLES: vbak, vbap, kna1, mara, vbpa.

DATA: BEGIN OF ls_linha,
        vbeln TYPE vbak-vbeln,
        kunnr TYPE vbak-kunnr,
        matnr TYPE vbap-matnr,
        netwr TYPE vbap-netwr,
        nome  TYPE kna1-name1,
        descr TYPE mara-maktx,
      END OF ls_linha,
      lt_linhas LIKE STANDARD TABLE OF ls_linha,
      lt_vbak   LIKE STANDARD TABLE OF vbak,
      lt_result LIKE STANDARD TABLE OF ls_linha,
      lv_total  TYPE p,
      lv_perc   TYPE p DECIMALS 4,
      lv_comis  TYPE p DECIMALS 2,
      lv_str    TYPE string.

SELECT-OPTIONS: s_audat FOR vbak-audat.
PARAMETERS:     p_vkbur TYPE vbak-vkbur.

START-OF-SELECTION.

  " PROBLEMA 1: SELECT * em tabela transacional grande sem índice seletivo
  SELECT * FROM vbak
    INTO TABLE lt_vbak
    WHERE audat IN s_audat.

  " PROBLEMA 2: LOOP com SELECT dentro (N+1 queries)
  LOOP AT lt_vbak INTO DATA(ls_vbak).

    " PROBLEMA 3: SELECT sem FOR ALL ENTRIES dentro de LOOP
    SELECT * FROM vbap
      INTO TABLE DATA(lt_vbap)
      WHERE vbeln = ls_vbak-vbeln.

    LOOP AT lt_vbap INTO DATA(ls_vbap).

      " PROBLEMA 4: SELECT em loop dentro de loop (O(n²) queries)
      SELECT SINGLE * FROM kna1
        INTO DATA(ls_kna1)
        WHERE kunnr = ls_vbak-kunnr.

      " PROBLEMA 5: Outro SELECT dentro do loop interno
      SELECT SINGLE maktx FROM makt
        INTO DATA(lv_maktx)
        WHERE matnr = ls_vbap-matnr
          AND spras = sy-langu.

      ls_linha-vbeln = ls_vbak-vbeln.
      ls_linha-kunnr = ls_vbak-kunnr.
      ls_linha-matnr = ls_vbap-matnr.
      ls_linha-netwr = ls_vbap-netwr.
      ls_linha-nome  = ls_kna1-name1.
      ls_linha-descr = lv_maktx.
      APPEND ls_linha TO lt_linhas.

    ENDLOOP.
  ENDLOOP.

  " PROBLEMA 6: LOOP sem FIELD-SYMBOLS em tabela potencialmente grande
  LOOP AT lt_linhas INTO ls_linha.

    " PROBLEMA 7: CONCATENATE dentro de loop (deveria usar string builder)
    CONCATENATE lv_str ls_linha-vbeln '|' ls_linha-matnr '|'
      INTO lv_str SEPARATED BY space.

    " PROBLEMA 8: Cálculo em variável P sem DECIMALS adequado
    lv_perc  = ls_linha-netwr / 100.
    lv_comis = lv_perc * 3.5.
    lv_total = lv_total + lv_comis.

    " PROBLEMA 9: MODIFY na tabela dentro do loop
    ls_linha-netwr = lv_comis.
    MODIFY lt_linhas FROM ls_linha.

  ENDLOOP.

  " PROBLEMA 10: READ TABLE sem BINARY SEARCH em tabela não sorted
  READ TABLE lt_linhas INTO ls_linha
    WITH KEY kunnr = '0000001234'.

  " Exibe resultado
  LOOP AT lt_result INTO ls_linha.
    WRITE: / ls_linha-vbeln, ls_linha-nome(20), ls_linha-netwr.
  ENDLOOP.

  " PROBLEMA 11: Tabela interna lt_linhas nunca liberada (pode ser grande)
  " FREE lt_linhas. " <- comentado, não chama FREE

  WRITE: / 'Total comissões:', lv_total.
