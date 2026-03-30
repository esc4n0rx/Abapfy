*&---------------------------------------------------------------------*
*& ZCL_PROC — Classe com problemas de design para demo de Code Review
*& Contém: métodos gigantes, acoplamento forte, sem tratamento de erro
*&---------------------------------------------------------------------*
CLASS zcl_proc DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: run,
             calc IMPORTING v TYPE dmbtr RETURNING VALUE(r) TYPE dmbtr,
             check IMPORTING s TYPE string RETURNING VALUE(ok) TYPE abap_bool.
  PRIVATE SECTION.
    DATA: db TYPE STANDARD TABLE OF ekko.
ENDCLASS.

CLASS zcl_proc IMPLEMENTATION.

  METHOD run.
    " Método faz tudo: busca dados, calcula, exibe — sem separação de responsabilidades
    DATA: t1   TYPE STANDARD TABLE OF ekko,
          t2   TYPE STANDARD TABLE OF ekpo,
          w1   TYPE ekko,
          w2   TYPE ekpo,
          tot  TYPE dmbtr,
          msg  TYPE string,
          flag TYPE char1,
          aux  TYPE dmbtr,
          x    TYPE i.

    " SELECT sem campo específico, sem filtro de mandante
    SELECT * FROM ekko INTO TABLE t1.
    SELECT * FROM ekpo INTO TABLE t2.

    LOOP AT t1 INTO w1.
      LOOP AT t2 INTO w2.
        " Loop aninhado sem condição — O(n²)
        IF w2-ebeln = w1-ebeln.
          aux = w2-netpr * w2-menge.
          tot = tot + aux.
          x = x + 1.
        ENDIF.
      ENDLOOP.
    ENDLOOP.

    " Divisão sem verificação de zero
    DATA lv_media TYPE dmbtr.
    lv_media = tot / x.

    " Hardcode de limite de negócio no meio da lógica
    IF tot > 1000000.
      flag = 'X'.
      msg = 'limite ultrapassado'.
    ENDIF.

    " BREAK-POINT esquecido
    BREAK-POINT.

    WRITE: / tot, lv_media, flag, msg.
  ENDMETHOD.

  METHOD calc.
    " Lógica duplicada com o que já existe no LOOP do método run
    DATA lv_imp TYPE dmbtr.
    lv_imp = v * '0.18'.    " alíquota ICMS hardcoded
    r = v - lv_imp.
    " Não trata v negativo
    " Não documenta o que faz
  ENDMETHOD.

  METHOD check.
    " Validação frágil — assume que input tem exatamente 11 chars
    DATA lv_len TYPE i.
    lv_len = strlen( s ).
    IF lv_len = 11.
      ok = abap_true.
    ENDIF.
    " Não verifica se são dígitos numéricos
    " Não verifica sequências repetidas
    " Não implementa dígitos verificadores
  ENDMETHOD.

ENDCLASS.

" Programa principal — instanciação sem tratamento de erro
START-OF-SELECTION.
  DATA lo_proc TYPE REF TO zcl_proc.
  CREATE OBJECT lo_proc.
  lo_proc->run( ).
