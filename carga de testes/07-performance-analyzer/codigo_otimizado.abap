*&---------------------------------------------------------------------*
*& Report ZREL_COMISSOES_VENDEDOR - VERSÃO OTIMIZADA
*& (arquivo para comparar — deve ter score alto no Performance Analyzer)
*&---------------------------------------------------------------------*
REPORT zrel_comissoes_vendedor_v2.

TYPES:
  BEGIN OF ty_linha,
    vbeln TYPE vbak-vbeln,
    kunnr TYPE vbak-kunnr,
    matnr TYPE vbap-matnr,
    netwr TYPE vbap-netwr,
    nome  TYPE kna1-name1,
    descr TYPE mara-maktx,
    comis TYPE p DECIMALS 2,
  END OF ty_linha.

DATA:
  lt_linhas  TYPE STANDARD TABLE OF ty_linha,
  lt_vbak    TYPE STANDARD TABLE OF vbak,
  lt_vbap    TYPE STANDARD TABLE OF vbap,
  lt_kna1    TYPE HASHED TABLE OF kna1 WITH UNIQUE KEY kunnr,
  lt_makt    TYPE HASHED TABLE OF makt WITH UNIQUE KEY matnr spras,
  lv_total   TYPE p DECIMALS 2.

FIELD-SYMBOLS:
  <fs_linha> TYPE ty_linha,
  <fs_vbap>  TYPE vbap,
  <fs_kna1>  TYPE kna1,
  <fs_makt>  TYPE makt.

SELECT-OPTIONS: s_audat FOR sy-datum.
PARAMETERS:     p_vkbur TYPE vbak-vkbur.

START-OF-SELECTION.

  " Seleciona apenas campos necessários
  SELECT vbeln kunnr audat netwr waerk
    INTO CORRESPONDING FIELDS OF TABLE @lt_vbak
    FROM vbak
    WHERE audat IN @s_audat
      AND vkbur = @p_vkbur.

  CHECK lt_vbak IS NOT INITIAL.

  " Uma única query para todos os itens (FOR ALL ENTRIES)
  SELECT vbeln matnr netwr
    INTO CORRESPONDING FIELDS OF TABLE @lt_vbap
    FROM vbap
    FOR ALL ENTRIES IN @lt_vbak
    WHERE vbeln = @lt_vbak-vbeln.

  CHECK lt_vbap IS NOT INITIAL.

  " Coleta chaves únicas e busca em lote
  DATA(lt_kunnr) = VALUE RANGE_KUNNR_T( FOR ls IN lt_vbak ( sign = 'I' option = 'EQ' low = ls-kunnr ) ).
  DATA(lt_matnr) = VALUE RANGE_MATNR_T( FOR ls IN lt_vbap ( sign = 'I' option = 'EQ' low = ls-matnr ) ).

  SELECT kunnr name1
    INTO CORRESPONDING FIELDS OF TABLE @lt_kna1
    FROM kna1
    WHERE kunnr IN @lt_kunnr.

  SELECT matnr spras maktx
    INTO CORRESPONDING FIELDS OF TABLE @lt_makt
    FROM makt
    WHERE matnr IN @lt_matnr
      AND spras = @sy-langu.

  " Monta tabela resultado — FIELD-SYMBOLS evita cópia desnecessária
  LOOP AT lt_vbap ASSIGNING <fs_vbap>.
    DATA(ls_vbak) = VALUE vbak( ).
    READ TABLE lt_vbak INTO ls_vbak WITH KEY vbeln = <fs_vbap>-vbeln.

    READ TABLE lt_kna1 ASSIGNING <fs_kna1>
      WITH TABLE KEY kunnr = ls_vbak-kunnr.

    READ TABLE lt_makt ASSIGNING <fs_makt>
      WITH TABLE KEY matnr = <fs_vbap>-matnr spras = sy-langu.

    APPEND VALUE #(
      vbeln = <fs_vbap>-vbeln
      kunnr = ls_vbak-kunnr
      matnr = <fs_vbap>-matnr
      netwr = <fs_vbap>-netwr
      nome  = COND #( WHEN sy-subrc = 0 THEN <fs_kna1>-name1 )
      descr = COND #( WHEN sy-subrc = 0 THEN <fs_makt>-maktx )
      comis = <fs_vbap>-netwr * '0.035'
    ) TO lt_linhas.
  ENDLOOP.

  " Totaliza sem loop adicional
  lv_total = REDUCE #(
    INIT sum TYPE p DECIMALS 2
    FOR ls IN lt_linhas
    NEXT sum = sum + ls-comis ).

  " Exibe resultado com FIELD-SYMBOLS
  LOOP AT lt_linhas ASSIGNING <fs_linha>.
    WRITE: / <fs_linha>-vbeln, <fs_linha>-nome(20), <fs_linha>-comis.
  ENDLOOP.

  WRITE: / 'Total comissões:', lv_total.

  " Libera memória ao final
  FREE: lt_vbak, lt_vbap, lt_kna1, lt_makt, lt_linhas.
