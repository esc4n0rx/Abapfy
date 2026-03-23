import React, { useState, useMemo, useEffect } from 'react'
import AbapHighlight from '../components/AbapHighlight'

// ─── Built-in snippets ────────────────────────────────────────────────────────
const BUILTIN_SNIPPETS = [
  {
    id: 'alv-grid-basic',
    category: 'ALV',
    title: 'ALV Grid Básico',
    description: 'Setup completo de ALV Grid com fieldcatalog e variante',
    code: `* ALV Grid - Setup básico
DATA: gt_fieldcat TYPE slis_t_fieldcat_alv,
      gs_fieldcat TYPE slis_fieldcat_alv,
      gs_layout   TYPE slis_layout_alv.

* Fieldcat - campo exemplo
CLEAR gs_fieldcat.
gs_fieldcat-fieldname = 'MATNR'.
gs_fieldcat-tabname   = 'GT_DATA'.
gs_fieldcat-seltext_l = 'Material'.
gs_fieldcat-outputlen = 18.
APPEND gs_fieldcat TO gt_fieldcat.

* Layout
gs_layout-colwidth_optimize = 'X'.
gs_layout-zebra             = 'X'.

* Exibir ALV
CALL FUNCTION 'REUSE_ALV_GRID_DISPLAY'
  EXPORTING
    i_callback_program = sy-repid
    is_layout          = gs_layout
    it_fieldcat        = gt_fieldcat
  TABLES
    t_outtab           = gt_data
  EXCEPTIONS
    program_error      = 1
    OTHERS             = 2.`
  },
  {
    id: 'alv-list',
    category: 'ALV',
    title: 'ALV List (REUSE_ALV_LIST_DISPLAY)',
    description: 'ALV simples em formato lista com totais',
    code: `* ALV List Display
CALL FUNCTION 'REUSE_ALV_LIST_DISPLAY'
  EXPORTING
    i_callback_program = sy-repid
    i_callback_top_of_page = 'TOP_OF_PAGE'
    it_fieldcat        = gt_fieldcat
    i_save             = 'A'
  TABLES
    t_outtab           = gt_data
  EXCEPTIONS
    program_error = 1
    OTHERS        = 2.
IF sy-subrc <> 0.
  MESSAGE 'Erro ao exibir ALV' TYPE 'E'.
ENDIF.`
  },
  {
    id: 'select-inner-join',
    category: 'Database',
    title: 'SELECT com INNER JOIN',
    description: 'Leitura de duas tabelas com join e filtros',
    code: `* SELECT com INNER JOIN
SELECT a~vbeln a~erdat a~kunnr
       b~matnr b~kwmeng b~netwr
  INTO TABLE @DATA(lt_result)
  FROM vbak AS a
  INNER JOIN vbap AS b ON b~vbeln = a~vbeln
  WHERE a~erdat BETWEEN @lv_date_from AND @lv_date_to
    AND a~auart IN @so_auart
    AND a~vkorg = @lv_vkorg.`
  },
  {
    id: 'select-for-all',
    category: 'Database',
    title: 'SELECT FOR ALL ENTRIES',
    description: 'Leitura de tabela filho baseada em tabela pai',
    code: `* SELECT FOR ALL ENTRIES
IF lt_header IS NOT INITIAL.
  SELECT vbeln matnr kwmeng netwr
    INTO TABLE @DATA(lt_items)
    FROM vbap
    FOR ALL ENTRIES IN @lt_header
    WHERE vbeln = @lt_header-vbeln.
ENDIF.`
  },
  {
    id: 'select-single',
    category: 'Database',
    title: 'SELECT SINGLE com tratamento',
    description: 'Leitura de registro único com verificação de sy-subrc',
    code: `* SELECT SINGLE com tratamento de erro
SELECT SINGLE *
  INTO @DATA(ls_mara)
  FROM mara
  WHERE matnr = @lv_matnr.
IF sy-subrc <> 0.
  MESSAGE |Material { lv_matnr } não encontrado| TYPE 'W'.
  RETURN.
ENDIF.`
  },
  {
    id: 'bapi-commit',
    category: 'BAPI',
    title: 'Chamada BAPI com COMMIT',
    description: 'Padrão de chamada de BAPI com tratamento de RETURN e commit',
    code: `* Chamada BAPI com COMMIT WORK
DATA: lt_return TYPE TABLE OF bapiret2,
      ls_return TYPE bapiret2.

CALL FUNCTION 'BAPI_EXAMPLE'
  EXPORTING
    input_data = ls_input
  IMPORTING
    output_data = ls_output
  TABLES
    return = lt_return.

* Verificar erros
READ TABLE lt_return INTO ls_return
  WITH KEY type = 'E'.
IF sy-subrc = 0.
  CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
  MESSAGE ls_return-message TYPE 'E'.
ELSE.
  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'
    EXPORTING wait = 'X'.
ENDIF.`
  },
  {
    id: 'badi-implementation',
    category: 'Enhancement',
    title: 'Implementação de BAdI',
    description: 'Esqueleto de classe para implementação de BAdI',
    code: `* Implementação de BAdI
CLASS zcl_impl_badi_example DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES zif_badi_example.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_impl_badi_example IMPLEMENTATION.

  METHOD zif_badi_example~method_name.
    " Sua lógica aqui
  ENDMETHOD.

ENDCLASS.`
  },
  {
    id: 'user-exit-include',
    category: 'Enhancement',
    title: 'User Exit - Include de Enhancement',
    description: 'Estrutura de user exit via include de programa',
    code: `* User Exit via Enhancement Point
ENHANCEMENT 1 ZENH_EXAMPLE.
  " Código de enhancement aqui
  DATA: lv_custom TYPE char100.

  " Exemplo: validação customizada
  IF ls_item-matnr(1) = 'Z'.
    MESSAGE 'Material Z não permitido neste processo' TYPE 'W'.
    RETURN.
  ENDIF.
END-ENHANCEMENT.`
  },
  {
    id: 'class-oop',
    category: 'OOP',
    title: 'Classe ABAP Completa',
    description: 'Template de classe com atributos, construtor e métodos',
    code: `* Classe ABAP - Template completo
CLASS zcl_example DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS:
      constructor
        IMPORTING
          iv_param TYPE string,
      process
        RETURNING
          VALUE(rv_result) TYPE string
        RAISING
          zcx_example.

  PRIVATE SECTION.
    DATA: mv_param TYPE string.
ENDCLASS.

CLASS zcl_example IMPLEMENTATION.

  METHOD constructor.
    mv_param = iv_param.
  ENDMETHOD.

  METHOD process.
    " Lógica principal
    rv_result = |Resultado: { mv_param }|.
  ENDMETHOD.

ENDCLASS.`
  },
  {
    id: 'exception-class',
    category: 'OOP',
    title: 'Classe de Exceção',
    description: 'Classe de exceção customizada com mensagem',
    code: `* Classe de exceção customizada
CLASS zcx_example DEFINITION
  PUBLIC
  INHERITING FROM cx_static_check
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS:
      constructor
        IMPORTING
          textid LIKE textid OPTIONAL
          previous LIKE previous OPTIONAL
          iv_message TYPE string OPTIONAL.

  PRIVATE SECTION.
    DATA: mv_message TYPE string.
ENDCLASS.

CLASS zcx_example IMPLEMENTATION.
  METHOD constructor.
    super->constructor( textid = textid previous = previous ).
    mv_message = iv_message.
  ENDMETHOD.
ENDCLASS.`
  },
  {
    id: 'try-catch',
    category: 'Error Handling',
    title: 'TRY / CATCH completo',
    description: 'Estrutura de tratamento de exceção com cleanup',
    code: `* TRY / CATCH
TRY.
    " Código que pode gerar exceção
    DATA(lo_obj) = NEW zcl_example( iv_param = lv_value ).
    DATA(lv_result) = lo_obj->process( ).

  CATCH zcx_example INTO DATA(lx_example).
    MESSAGE lx_example->get_text( ) TYPE 'E'.

  CATCH cx_sy_ref_is_initial INTO DATA(lx_ref).
    MESSAGE 'Referência nula' TYPE 'E'.

  CLEANUP.
    " Limpeza em caso de exceção
    CLEAR lo_obj.
ENDTRY.`
  },
  {
    id: 'internal-table-ops',
    category: 'Internal Tables',
    title: 'Operações em Tabela Interna',
    description: 'READ, SORT, DELETE, COLLECT para tabelas internas',
    code: `* Operações em tabela interna
DATA: lt_data TYPE TABLE OF zmytable,
      ls_data TYPE zmytable.

* Ordenar
SORT lt_data BY field1 ASCENDING field2 DESCENDING.

* Ler com binary search (tabela deve estar ordenada por field1)
READ TABLE lt_data INTO ls_data
  WITH KEY field1 = lv_key
  BINARY SEARCH.
IF sy-subrc = 0.
  " Encontrado
ENDIF.

* Deletar entradas duplicadas
DELETE ADJACENT DUPLICATES FROM lt_data COMPARING field1.

* Deletar por condição
DELETE lt_data WHERE status = 'X'.

* Loop com AT NEW (break group)
LOOP AT lt_data INTO ls_data.
  AT NEW field1.
    " Início de novo grupo
  ENDAT.
ENDLOOP.`
  },
  {
    id: 'string-ops',
    category: 'Strings',
    title: 'Operações com Strings',
    description: 'CONCATENATE, SPLIT, FIND, REPLACE com string expressions',
    code: `* Operações com strings (ABAP moderno)
DATA: lv_str  TYPE string,
      lt_parts TYPE TABLE OF string.

" Concatenação moderna (template)
lv_str = |Pedido { ls_order-vbeln } criado em { ls_order-erdat DATE = USER }|.

" CONCATENATE legado
CONCATENATE lv_part1 '-' lv_part2 INTO lv_str.

" Split
SPLIT lv_str AT '-' INTO TABLE lt_parts.

" Find e Replace
FIND FIRST OCCURRENCE OF 'OLD' IN lv_str.
REPLACE ALL OCCURRENCES OF 'OLD' IN lv_str WITH 'NEW'.

" Condense (remove espaços)
CONDENSE lv_str NO-GAPS.

" Converter maiúscula/minúscula
TRANSLATE lv_str TO UPPER CASE.
TRANSLATE lv_str TO LOWER CASE.`
  },
  {
    id: 'authority-check',
    category: 'Segurança',
    title: 'AUTHORITY-CHECK',
    description: 'Verificação de autorização SAP padrão',
    code: `* Verificação de autorização
AUTHORITY-CHECK OBJECT 'Z_EXAMPLE'
  ID 'ACTVT' FIELD '03'       " 01=criar, 02=alterar, 03=exibir, 06=excluir
  ID 'VKORG' FIELD lv_vkorg.

IF sy-subrc <> 0.
  MESSAGE 'Sem autorização para esta organização de vendas' TYPE 'E'.
  RETURN.
ENDIF.`
  },
]

const LS_KEY = 'abapfy_custom_snippets'

function loadCustom() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveCustom(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr))
}

const CATEGORIES = ['Todos', 'ALV', 'Database', 'BAPI', 'Enhancement', 'OOP', 'Error Handling', 'Internal Tables', 'Strings', 'Segurança', 'Customizado']

// ─── Snippet card ─────────────────────────────────────────────────────────────
function SnippetCard({ snippet, onDelete }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(snippet.code)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={{
      border: '1px solid var(--sap-border)', borderRadius: 8,
      overflow: 'hidden', marginBottom: 10,
      background: 'var(--sap-base)'
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: open ? '1px solid var(--sap-border)' : 'none'
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#fff',
          background: snippet.custom ? '#8b5cf6' : '#0070f2',
          padding: '2px 7px', borderRadius: 3, flexShrink: 0
        }}>{snippet.category}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text)' }}>{snippet.title}</div>
          {snippet.description && (
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {snippet.description}
            </div>
          )}
        </div>
        <button onClick={copy} style={{
          fontSize: 12, color: copied ? '#107e3e' : 'var(--sap-primary)',
          background: 'transparent',
          border: '1px solid ' + (copied ? '#107e3e' : 'var(--sap-primary)'),
          borderRadius: 4, padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
        }}>
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        {snippet.custom && onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(snippet.id) }} style={{
            fontSize: 12, color: '#bb0000', background: 'transparent',
            border: '1px solid #bb0000', borderRadius: 4,
            padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
          }}>✕</button>
        )}
        <span style={{ color: 'var(--sap-subtle)', fontSize: 11, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <AbapHighlight code={snippet.code} maxHeight={400} />}
    </div>
  )
}

// ─── Add custom snippet form ──────────────────────────────────────────────────
function AddSnippetForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'Customizado', code: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.title.trim() && form.code.trim()

  return (
    <div style={{
      border: '1px solid var(--sap-primary)', borderRadius: 8,
      padding: 16, marginBottom: 16, background: 'var(--sap-base)'
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text)', marginBottom: 14 }}>
        Novo Snippet Customizado
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 4 }}>Título *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Nome do snippet"
            style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'var(--sap-input-bg)', color: 'var(--sap-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 4 }}>Categoria</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'var(--sap-input-bg)', color: 'var(--sap-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
            {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 4 }}>Descrição</label>
        <input value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Breve descrição (opcional)"
          style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'var(--sap-input-bg)', color: 'var(--sap-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 4 }}>Código ABAP *</label>
        <textarea value={form.code} onChange={e => set('code', e.target.value)}
          rows={8} placeholder="Cole o código ABAP aqui..."
          style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'var(--sap-input-bg)', color: 'var(--sap-text)', outline: 'none', fontFamily: '"Cascadia Code","Consolas",monospace', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onAdd(form)} disabled={!valid} style={{
          background: valid ? 'var(--sap-primary)' : 'var(--sap-border)', color: '#fff',
          border: 'none', borderRadius: 4, padding: '7px 20px',
          fontSize: 13, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit'
        }}>Salvar Snippet</button>
        <button onClick={onCancel} style={{
          background: 'transparent', color: 'var(--sap-subtle)',
          border: '1px solid var(--sap-border)', borderRadius: 4, padding: '7px 16px',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
        }}>Cancelar</button>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function SnippetLibraryView() {
  const [customSnippets, setCustomSnippets] = useState(() => loadCustom())
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [showAddForm, setShowAddForm] = useState(false)

  const allSnippets = useMemo(() => [
    ...BUILTIN_SNIPPETS,
    ...customSnippets.map(s => ({ ...s, custom: true }))
  ], [customSnippets])

  const filtered = useMemo(() => allSnippets.filter(s => {
    const matchCat = category === 'Todos' || s.category === category
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }), [allSnippets, category, search])

  const handleAdd = (form) => {
    const newSnippet = { ...form, id: `custom_${Date.now()}`, custom: true }
    const updated = [...customSnippets, newSnippet]
    setCustomSnippets(updated)
    saveCustom(updated)
    setShowAddForm(false)
  }

  const handleDelete = (id) => {
    const updated = customSnippets.filter(s => s.id !== id)
    setCustomSnippets(updated)
    saveCustom(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--sap-bg)' }}>
      {/* Toolbar */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--sap-border)',
        background: 'var(--sap-base)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)', marginRight: 4 }}>
          ✂ Biblioteca de Snippets ABAP
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar snippet..."
          style={{
            flex: 1, maxWidth: 320, padding: '6px 10px', fontSize: 13,
            border: '1px solid var(--sap-border)', borderRadius: 6,
            background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
            outline: 'none', fontFamily: 'inherit'
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>
          {filtered.length} snippet{filtered.length !== 1 ? 's' : ''}
        </span>
        <button onClick={() => setShowAddForm(true)} style={{
          background: 'var(--sap-primary)', color: '#fff',
          border: 'none', borderRadius: 6, padding: '7px 16px',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Novo Snippet
        </button>
      </div>

      {/* Category filter */}
      <div style={{
        padding: '8px 24px', borderBottom: '1px solid var(--sap-border)',
        background: 'var(--sap-base)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0
      }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            fontSize: 12, padding: '3px 12px', borderRadius: 20,
            border: '1px solid ' + (category === c ? 'var(--sap-primary)' : 'var(--sap-border)'),
            background: category === c ? 'var(--sap-primary)' : 'transparent',
            color: category === c ? '#fff' : 'var(--sap-text)',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: category === c ? 600 : 400
          }}>{c}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {showAddForm && (
          <AddSnippetForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
        )}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--sap-subtle)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✂</div>
            <div style={{ fontSize: 14 }}>Nenhum snippet encontrado.</div>
          </div>
        ) : (
          filtered.map(s => <SnippetCard key={s.id} snippet={s} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  )
}
