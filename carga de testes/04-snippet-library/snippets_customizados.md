# Carga de Testes — 04 Snippet Library

## Objetivo
Testar a biblioteca de snippets — tanto os snippets built-in quanto a adição de snippets customizados.

---

## Snippets customizados para adicionar

Use o formulário "+ Adicionar Snippet" na view para criar os snippets abaixo:

---

### Snippet 1 — Validação de CNPJ
**Nome:** Validação de CNPJ
**Categoria:** Segurança
**Descrição:** Valida CNPJ brasileiro usando módulo 11 em ABAP puro
**Código:**
```abap
FORM f_validar_cnpj
  USING    iv_cnpj  TYPE string
  CHANGING cv_valid TYPE abap_bool.

  DATA: lv_cnpj   TYPE string,
        lv_digits TYPE string,
        lv_sum    TYPE i,
        lv_rest   TYPE i,
        lv_d1     TYPE i,
        lv_d2     TYPE i.

  " Remove formatação
  REPLACE ALL OCCURRENCES OF '.' IN iv_cnpj WITH ''.
  REPLACE ALL OCCURRENCES OF '-' IN iv_cnpj WITH ''.
  REPLACE ALL OCCURRENCES OF '/' IN iv_cnpj WITH ''.
  lv_cnpj = iv_cnpj.

  " Verifica tamanho
  IF strlen( lv_cnpj ) <> 14.
    cv_valid = abap_false.
    RETURN.
  ENDIF.

  " Calcula 1º dígito verificador
  DO 12 TIMES.
    DATA(lv_pos) = sy-index - 1.
    DATA(lv_char) = lv_cnpj+lv_pos(1).
    DATA(lv_num) = CONV i( lv_char ).
    DATA(lv_peso) = COND i(
      WHEN lv_pos < 4 THEN 5 - lv_pos
      ELSE 13 - lv_pos ).
    lv_sum = lv_sum + ( lv_num * lv_peso ).
  ENDDO.

  lv_rest = lv_sum MOD 11.
  lv_d1 = COND #( WHEN lv_rest < 2 THEN 0 ELSE 11 - lv_rest ).

  " Verifica 1º dígito
  DATA(lv_d1_cnpj) = CONV i( lv_cnpj+12(1) ).
  IF lv_d1_cnpj <> lv_d1.
    cv_valid = abap_false.
    RETURN.
  ENDIF.

  cv_valid = abap_true.

ENDFORM.
```

---

### Snippet 2 — Lock/Unlock de objeto SAP
**Nome:** Enfileirar e Desenfileirar Lock
**Categoria:** Segurança
**Descrição:** Trava e libera objeto para edição usando enfileiramento SAP (ENQUEUE/DEQUEUE)
**Código:**
```abap
" === ENQUEUE (travar) ===
CALL FUNCTION 'ENQUEUE_EZMATNR'
  EXPORTING
    matnr          = lv_matnr
  EXCEPTIONS
    foreign_lock   = 1
    system_failure = 2
    OTHERS         = 3.

IF sy-subrc = 1.
  MESSAGE |Material { lv_matnr } travado por { sy-msgv2 }| TYPE 'E'.
  RETURN.
ELSEIF sy-subrc <> 0.
  MESSAGE 'Falha no sistema de enfileiramento.' TYPE 'E'.
  RETURN.
ENDIF.

" ... processamento ...

" === DEQUEUE (liberar) ===
CALL FUNCTION 'DEQUEUE_EZMATNR'
  EXPORTING
    matnr = lv_matnr.
```

---

### Snippet 3 — Leitura de arquivo do servidor de aplicações (AL11)
**Nome:** Ler arquivo do servidor de aplicações
**Categoria:** Database
**Descrição:** Abre, lê linha a linha e fecha arquivo texto no servidor de aplicações SAP
**Código:**
```abap
DATA: lv_handle   TYPE i,
      lv_filepath TYPE string,
      lv_line     TYPE string,
      lt_lines    TYPE STANDARD TABLE OF string.

lv_filepath = '/usr/sap/interface/entrada/arquivo.txt'.

" Abre arquivo
OPEN DATASET lv_filepath FOR INPUT IN TEXT MODE ENCODING DEFAULT.
IF sy-subrc <> 0.
  MESSAGE |Arquivo não encontrado: { lv_filepath }| TYPE 'E'.
  RETURN.
ENDIF.

" Lê linha a linha
DO.
  READ DATASET lv_filepath INTO lv_line.
  IF sy-subrc <> 0.
    EXIT.
  ENDIF.
  APPEND lv_line TO lt_lines.
ENDDO.

" Fecha arquivo
CLOSE DATASET lv_filepath.

MESSAGE |{ lines( lt_lines ) } linhas lidas.| TYPE 'S'.
```

---

## O que testar

- [ ] Snippets built-in aparecem nas categorias corretas (ALV, Database, BAPI, etc.)
- [ ] Filtro por categoria funciona (clique nas pills)
- [ ] Campo de busca filtra por nome e descrição
- [ ] Código do snippet expande ao clicar
- [ ] Botão "Copiar" copia o código para clipboard
- [ ] AbapHighlight aplica cores no código dos snippets
- [ ] Formulário de adição aparece ao clicar "+ Adicionar Snippet"
- [ ] Snippet customizado é salvo e aparece na lista
- [ ] Snippet customizado persiste após fechar e reabrir o módulo
- [ ] Snippet customizado pode ser excluído (ícone de lixeira)
- [ ] Snippets built-in NÃO têm botão de excluir
