import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import AbapHighlight from '../components/AbapHighlight'
import { useAbapStore } from '../store/abapStore'
import { useAiStore } from '../store/aiStore'
import { useAuthStore } from '../store/authStore'
import { callAI, parseAbapResponse, getActiveProvider, buildAbapPrompt, cleanCode } from '../lib/aiClient'
import { notify } from '../lib/notify'
import { useAgentStore } from '../store/agentStore'
import { useSkillsStore } from '../store/skillsStore'

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPES = [
  { key: 'REPORT', label: 'Report', desc: 'Relatório com tela de seleção e saída ALV/lista' },
  { key: 'FUNC', label: 'Function Module', desc: 'Módulo de função reutilizável com interface definida' },
  { key: 'CLAS', label: 'Classe ABAP', desc: 'Classe orientada a objetos (OOP)' },
  { key: 'ENHO', label: 'Enhancement', desc: 'Ampliação de programa SAP (BAdI / Enhancement Spot)' },
  { key: 'PROG', label: 'Programa', desc: 'Programa simples sem tela de seleção padrão' },
  { key: 'CDS', label: 'CDS View', desc: 'Core Data Services — view de dados com anotações SAP' }
]

const TYPE_COLORS = { REPORT: '#0070f2', FUNC: '#107e3e', CLAS: '#8b5cf6', ENHO: '#e9730c', PROG: '#6a6d70', CDS: '#00627a' }

const STEPS_BY_TYPE = {
  REPORT: ['Identificação', 'Contexto', 'Regras de Negócio', 'Tabelas', 'Gerar'],
  FUNC:   ['Identificação', 'Interface', 'Contexto', 'Regras de Negócio', 'Gerar'],
  CLAS:   ['Identificação', 'Atributos e Métodos', 'Contexto', 'Gerar'],
  ENHO:   ['Identificação', 'Contexto', 'Regras de Negócio', 'Gerar'],
  PROG:   ['Identificação', 'Contexto', 'Regras de Negócio', 'Tabelas', 'Gerar'],
  CDS:    ['Identificação', 'Entidade e Campos', 'Contexto', 'Gerar']
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '1px solid var(--sap-border)', borderRadius: 4,
  background: 'var(--sap-base)', color: 'var(--sap-text)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
}

const textareaStyle = {
  ...inputStyle, resize: 'vertical', lineHeight: 1.5
}

const gridInputStyle = {
  ...inputStyle, padding: '5px 8px', fontSize: 12
}

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4, display: 'block'
}

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 2 }

const addBtnStyle = {
  fontSize: 12, color: 'var(--sap-primary)', background: 'transparent',
  border: '1px solid var(--sap-primary)', borderRadius: 4, padding: '4px 12px',
  cursor: 'pointer', fontFamily: 'inherit'
}

const removeBtnStyle = {
  width: 26, height: 26, background: 'transparent', border: '1px solid var(--sap-border)',
  borderRadius: 4, cursor: 'pointer', color: 'var(--sap-subtle)',
  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, children, style }) {
  return (
    <div style={{ ...fieldStyle, ...style }}>
      {label && <label style={labelStyle}>{label}</label>}
      {children}
    </div>
  )
}

function Row({ children, cols }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols || `repeat(${React.Children.count(children)}, 1fr)`,
      gap: 12
    }}>
      {children}
    </div>
  )
}

function GridTable({ columns, rows, onAdd, onUpdate, onRemove, addLabel = '+ Adicionar' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={onAdd} style={addBtnStyle}>{addLabel}</button>
      </div>
      {/* header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') + ' 32px',
        gap: 6, marginBottom: 4
      }}>
        {columns.map(c => (
          <div key={c.key} style={{ fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase' }}>
            {c.label}
          </div>
        ))}
        <div />
      </div>
      {/* rows */}
      {rows.map((row, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') + ' 32px',
          gap: 6, marginBottom: 5
        }}>
          {columns.map(c => (
            c.type === 'select' ? (
              <select key={c.key} value={row[c.key] || ''} onChange={e => onUpdate(i, c.key, e.target.value)}
                style={{ ...gridInputStyle }}>
                {c.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : c.type === 'checkbox' ? (
              <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!row[c.key]} onChange={e => onUpdate(i, c.key, e.target.checked)}
                  style={{ accentColor: 'var(--sap-primary)' }} />
                {c.checkLabel || ''}
              </label>
            ) : (
              <input key={c.key} value={row[c.key] || ''}
                onChange={e => onUpdate(i, c.key, c.upper ? e.target.value.toUpperCase() : e.target.value)}
                placeholder={c.placeholder || ''} style={gridInputStyle} />
            )
          ))}
          <button onClick={() => onRemove(i)} style={removeBtnStyle}>×</button>
        </div>
      ))}
      {rows.length === 0 && (
        <div style={{
          padding: '20px 12px', textAlign: 'center', color: 'var(--sap-subtle)',
          border: '1px dashed var(--sap-border)', borderRadius: 4, fontSize: 12
        }}>
          Nenhum item. Clique em "{addLabel}" para adicionar.
        </div>
      )}
    </div>
  )
}

// ─── Wizard Steps ──────────────────────────────────────────────────────────────

function StepIdentification({ form, update, user }) {
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  useEffect(() => { if (!form.author && name) update('author', name) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Row cols="1fr 1fr">
        <Field label="Nome do Objeto *">
          <input value={form.name || ''} onChange={e => update('name', e.target.value.toUpperCase())}
            placeholder={form.type === 'FUNC' ? 'ZFM_XXXX' : form.type === 'CLAS' ? 'ZCL_XXXX' : form.type === 'CDS' ? 'Z_I_XXXX' : 'ZREPORT_XXXX'}
            style={inputStyle} />
        </Field>
        {form.type === 'REPORT' && (
          <Field label="Código de Transação">
            <input value={form.transaction_code || ''} onChange={e => update('transaction_code', e.target.value.toUpperCase())}
              placeholder="ZXX01 (opcional)" style={inputStyle} />
          </Field>
        )}
        {form.type === 'FUNC' && (
          <Field label="Grupo de Funções">
            <input value={form.function_group || ''} onChange={e => update('function_group', e.target.value.toUpperCase())}
              placeholder="Z_GRUPO_XXXX" style={inputStyle} />
          </Field>
        )}
        {(form.type === 'PROG' || form.type === 'ENHO') && (
          <Field label="Descrição breve">
            <input value={form.description || ''} onChange={e => update('description', e.target.value)}
              placeholder="Breve descrição do objeto" style={inputStyle} />
          </Field>
        )}
        {form.type === 'CLAS' && (
          <Field label="Herda de (opcional)">
            <input value={form.superclass || ''} onChange={e => update('superclass', e.target.value.toUpperCase())}
              placeholder="CL_XXXX (opcional)" style={inputStyle} />
          </Field>
        )}
      </Row>

      {form.type === 'ENHO' && (
        <Row cols="1fr 1fr 1fr">
          <Field label="Programa/Objeto alvo *">
            <input value={form.target_program || ''} onChange={e => update('target_program', e.target.value.toUpperCase())}
              placeholder="ZREPORT_BASE" style={inputStyle} />
          </Field>
          <Field label="Tipo de Enhancement">
            <select value={form.enhancement_type || 'SPOT'} onChange={e => update('enhancement_type', e.target.value)}
              style={inputStyle}>
              <option value="SPOT">Enhancement Spot</option>
              <option value="BADI">BAdI</option>
              <option value="IMPLICIT">Implicit Enhancement</option>
              <option value="EXIT">User Exit / Customer Exit</option>
            </select>
          </Field>
          <Field label="Nome do Spot / BAdI">
            <input value={form.spot_name || ''} onChange={e => update('spot_name', e.target.value.toUpperCase())}
              placeholder="ES_ZXXXX ou BADI_XXXX" style={inputStyle} />
          </Field>
        </Row>
      )}

      {form.type === 'CLAS' && (
        <Row cols="1fr 1fr">
          <Field label="Visibilidade">
            <select value={form.visibility || 'PUBLIC'} onChange={e => update('visibility', e.target.value)} style={inputStyle}>
              <option value="PUBLIC">PUBLIC</option>
              <option value="PROTECTED">PROTECTED</option>
              <option value="PRIVATE">PRIVATE</option>
            </select>
          </Field>
          <Field label="Interfaces implementadas (separadas por vírgula)">
            <input value={(form.interfaces || []).join(', ')}
              onChange={e => update('interfaces', e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))}
              placeholder="IF_XXXX, IF_YYYY" style={inputStyle} />
          </Field>
        </Row>
      )}

      {(form.type === 'REPORT' || form.type === 'FUNC') && (
        <Row cols="1fr 1fr">
          <Field label="Criado por">
            <input value={form.author || ''} onChange={e => update('author', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Empresa / Mandante">
            <input value={form.company || ''} onChange={e => update('company', e.target.value)} placeholder="Ex: 1000" style={inputStyle} />
          </Field>
        </Row>
      )}

      {(form.type === 'REPORT' || form.type === 'FUNC') && (
        <Field label="Descrição">
          <input value={form.description || ''} onChange={e => update('description', e.target.value)}
            placeholder="Breve descrição do objeto" style={inputStyle} />
        </Field>
      )}
    </div>
  )
}

function StepContext({ form, update }) {
  return (
    <Field label="Contexto / Fluxo do Programa">
      <textarea
        value={form.context || ''}
        onChange={e => update('context', e.target.value)}
        rows={14}
        placeholder={
          form.type === 'REPORT'
            ? 'Descreva o fluxo do programa:\n- O que acontece ao executar?\n- Quais telas/pop-ups existem?\n- Quais botões / ações o usuário tem?\n- O que a lista/ALV deve mostrar?\n- Há processamentos em background?'
            : form.type === 'FUNC'
            ? 'Descreva a lógica do Function Module:\n- O que ele deve fazer exatamente?\n- Quais são as etapas internas?\n- Em quais programas ele será chamado?\n- Há integrações com outros FMs?'
            : form.type === 'CLAS'
            ? 'Descreva o propósito da classe:\n- Qual problema ela resolve?\n- Como será instanciada?\n- Quais são os fluxos principais?\n- Há dependências com outras classes?'
            : form.type === 'ENHO'
            ? 'Descreva o que o Enhancement deve fazer:\n- Em qual ponto do programa original ele ativa?\n- O que deve ser verificado/modificado?\n- Quais variáveis do programa original são usadas?'
            : 'Descreva o fluxo e comportamento esperado do programa...'
        }
        style={textareaStyle}
      />
    </Field>
  )
}

function StepRules({ form, update }) {
  const rules = form.rules?.length ? form.rules : ['']

  const addRule = () => update('rules', [...rules, ''])
  const removeRule = (i) => update('rules', rules.filter((_, idx) => idx !== i))
  const changeRule = (i, v) => update('rules', rules.map((r, idx) => idx === i ? v : r))

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--sap-subtle)', marginBottom: 14 }}>
        Liste as regras de negócio específicas que o código deve seguir.
      </div>
      {rules.map((rule, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <span style={{ paddingTop: 8, fontSize: 12, color: 'var(--sap-subtle)', minWidth: 20, textAlign: 'right' }}>{i + 1}.</span>
          <textarea
            value={rule}
            onChange={e => changeRule(i, e.target.value)}
            rows={2}
            placeholder="Ex: Considerar apenas documentos com status FREIGEGEBEN (FRGKZ = 'F')..."
            style={{ ...textareaStyle, flex: 1 }}
          />
          <button onClick={() => removeRule(i)} style={{ ...removeBtnStyle, marginTop: 4 }}>×</button>
        </div>
      ))}
      <button onClick={addRule} style={addBtnStyle}>+ Adicionar Regra</button>
    </div>
  )
}

function StepTables({ form, update }) {
  const tables = form.tables || []
  const cols = [
    { key: 'table', label: 'Tabela', placeholder: 'EKKO', width: '130px', upper: true },
    { key: 'field', label: 'Campo', placeholder: 'EBELN', width: '130px', upper: true },
    { key: 'type', label: 'Tipo/Domínio', placeholder: 'BELNR', width: '120px', upper: true },
    { key: 'description', label: 'Descrição', placeholder: 'Número do pedido', width: '1fr' }
  ]
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--sap-subtle)', marginBottom: 12 }}>
        Defina as tabelas e campos SAP que serão utilizados (estilo SE11).
      </div>
      <GridTable
        columns={cols}
        rows={tables}
        onAdd={() => update('tables', [...tables, { table: '', field: '', type: '', description: '' }])}
        onUpdate={(i, k, v) => update('tables', tables.map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
        onRemove={(i) => update('tables', tables.filter((_, idx) => idx !== i))}
        addLabel="+ Linha"
      />
    </div>
  )
}

function StepFuncInterface({ form, update }) {
  const tabs = ['Importing', 'Exporting', 'Tables', 'Exceptions']
  const [tab, setTab] = useState('Importing')

  const importCols = [
    { key: 'name', label: 'Parâmetro', placeholder: 'IV_XXXX', width: '150px', upper: true },
    { key: 'type', label: 'Tipo', placeholder: 'string', width: '130px', upper: true },
    { key: 'optional', label: 'Optional', type: 'checkbox', checkLabel: 'Opcional', width: '90px' },
    { key: 'by_ref', label: 'Referência', type: 'checkbox', checkLabel: 'Por Ref.', width: '90px' }
  ]
  const exportCols = [
    { key: 'name', label: 'Parâmetro', placeholder: 'EV_XXXX', width: '150px', upper: true },
    { key: 'type', label: 'Tipo', placeholder: 'string', width: '1fr', upper: true }
  ]
  const tableCols = [
    { key: 'name', label: 'Parâmetro', placeholder: 'IT_XXXX', width: '150px', upper: true },
    { key: 'type', label: 'Tipo/Estrutura', placeholder: 'EKPO', width: '1fr', upper: true },
    { key: 'optional', label: '', type: 'checkbox', checkLabel: 'Opcional', width: '90px' }
  ]
  const excCols = [
    { key: 'name', label: 'Exception', placeholder: 'NOT_FOUND', width: '200px', upper: true },
    { key: 'description', label: 'Descrição', placeholder: 'Registro não encontrado', width: '1fr' }
  ]

  const getRows = (key) => form[key] || []
  const setRows = (key, val) => update(key, val)

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--sap-border)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', fontSize: 13, background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--sap-primary)' : '2px solid transparent',
            color: tab === t ? 'var(--sap-primary)' : 'var(--sap-subtle)',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === t ? 600 : 400,
            marginBottom: -2
          }}>{t}</button>
        ))}
      </div>
      {tab === 'Importing' && (
        <GridTable columns={importCols} rows={getRows('imports')}
          onAdd={() => setRows('imports', [...getRows('imports'), { name: '', type: '', optional: false, by_ref: false }])}
          onUpdate={(i, k, v) => setRows('imports', getRows('imports').map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => setRows('imports', getRows('imports').filter((_, idx) => idx !== i))}
          addLabel="+ Parâmetro" />
      )}
      {tab === 'Exporting' && (
        <GridTable columns={exportCols} rows={getRows('exports')}
          onAdd={() => setRows('exports', [...getRows('exports'), { name: '', type: '' }])}
          onUpdate={(i, k, v) => setRows('exports', getRows('exports').map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => setRows('exports', getRows('exports').filter((_, idx) => idx !== i))}
          addLabel="+ Parâmetro" />
      )}
      {tab === 'Tables' && (
        <GridTable columns={tableCols} rows={getRows('tables_params')}
          onAdd={() => setRows('tables_params', [...getRows('tables_params'), { name: '', type: '', optional: false }])}
          onUpdate={(i, k, v) => setRows('tables_params', getRows('tables_params').map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => setRows('tables_params', getRows('tables_params').filter((_, idx) => idx !== i))}
          addLabel="+ Tabela" />
      )}
      {tab === 'Exceptions' && (
        <GridTable columns={excCols} rows={getRows('exceptions')}
          onAdd={() => setRows('exceptions', [...getRows('exceptions'), { name: '', description: '' }])}
          onUpdate={(i, k, v) => setRows('exceptions', getRows('exceptions').map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => setRows('exceptions', getRows('exceptions').filter((_, idx) => idx !== i))}
          addLabel="+ Exception" />
      )}
    </div>
  )
}

function StepClassOO({ form, update }) {
  const [tab, setTab] = useState('attributes')
  const attrCols = [
    { key: 'name', label: 'Atributo', placeholder: 'MO_XXXX', width: '150px', upper: true },
    { key: 'type', label: 'Tipo', placeholder: 'string', width: '130px', upper: true },
    {
      key: 'visibility', label: 'Visibilidade', type: 'select', width: '110px',
      options: ['PRIVATE', 'PROTECTED', 'PUBLIC']
    },
    { key: 'description', label: 'Descrição', placeholder: '', width: '1fr' }
  ]
  const methodCols = [
    { key: 'name', label: 'Método', placeholder: 'CONSTRUCTOR', width: '160px', upper: true },
    {
      key: 'visibility', label: 'Visibilidade', type: 'select', width: '110px',
      options: ['PUBLIC', 'PROTECTED', 'PRIVATE']
    },
    { key: 'description', label: 'Descrição / Parâmetros', placeholder: 'O que o método faz', width: '1fr' }
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--sap-border)' }}>
        {[['attributes', 'Atributos'], ['methods', 'Métodos']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 16px', fontSize: 13, background: 'none', border: 'none',
            borderBottom: tab === key ? '2px solid var(--sap-primary)' : '2px solid transparent',
            color: tab === key ? 'var(--sap-primary)' : 'var(--sap-subtle)',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === key ? 600 : 400, marginBottom: -2
          }}>{label}</button>
        ))}
      </div>
      {tab === 'attributes' && (
        <GridTable columns={attrCols} rows={form.attributes || []}
          onAdd={() => update('attributes', [...(form.attributes || []), { name: '', type: '', visibility: 'PRIVATE', description: '' }])}
          onUpdate={(i, k, v) => update('attributes', (form.attributes || []).map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => update('attributes', (form.attributes || []).filter((_, idx) => idx !== i))}
          addLabel="+ Atributo" />
      )}
      {tab === 'methods' && (
        <GridTable columns={methodCols} rows={form.methods || []}
          onAdd={() => update('methods', [...(form.methods || []), { name: '', visibility: 'PUBLIC', description: '' }])}
          onUpdate={(i, k, v) => update('methods', (form.methods || []).map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => update('methods', (form.methods || []).filter((_, idx) => idx !== i))}
          addLabel="+ Método" />
      )}
    </div>
  )
}

function StepCdsEntity({ form, update }) {
  const fields = form.cds_fields || []
  const assocs = form.cds_associations || []
  const fieldCols = [
    { key: 'field', label: 'Campo', placeholder: 'MATNR', width: '150px', upper: true },
    { key: 'alias', label: 'Alias (opcional)', placeholder: 'MaterialNumber', width: '160px' },
    { key: 'type', label: 'Tipo/Domínio', placeholder: 'MATNR', width: '130px', upper: true },
    { key: 'annotation', label: 'Annotation', placeholder: '@Search.defaultSearchElement: true', width: '1fr' }
  ]
  const assocCols = [
    { key: 'name', label: 'Nome', placeholder: '_Material', width: '160px' },
    { key: 'target', label: 'Target View', placeholder: 'I_Material', width: '160px', upper: true },
    {
      key: 'cardinality', label: 'Cardinalidade', type: 'select', width: '110px',
      options: ['[0..1]', '[1..1]', '[0..*]', '[1..*]']
    },
    { key: 'join', label: 'ON Condition', placeholder: '_Material.Matnr = Matnr', width: '1fr' }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>Tabela / Entidade Base *</label>
        <input
          value={form.cds_base_entity || ''}
          onChange={e => update('cds_base_entity', e.target.value.toUpperCase())}
          placeholder="MARA, I_Material, Z_CUSTOM_TABLE"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 4 }}>
          Tabela transparente SAP ou CDS view existente que será usada como base
        </div>
      </div>

      <Row cols="1fr 1fr">
        <div style={fieldStyle}>
          <label style={labelStyle}>Tipo de View</label>
          <select value={form.cds_view_type || 'basic'} onChange={e => update('cds_view_type', e.target.value)} style={inputStyle}>
            <option value="basic">Basic Interface View</option>
            <option value="composite">Composite Interface View</option>
            <option value="consumption">Consumption View (Fiori)</option>
            <option value="transactional">Transactional View (RAP)</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Anotações principais</label>
          <select value={form.cds_annotation_preset || 'analytics'} onChange={e => update('cds_annotation_preset', e.target.value)} style={inputStyle}>
            <option value="analytics">Analytics (@Analytics.dataCategory)</option>
            <option value="fiori">Fiori (@UI.lineItem, @UI.selectionField)</option>
            <option value="search">Search Help (@Search.searchable)</option>
            <option value="none">Sem anotações (só estrutura)</option>
          </select>
        </div>
      </Row>

      <div>
        <label style={labelStyle}>Campos da View</label>
        <GridTable
          columns={fieldCols}
          rows={fields}
          onAdd={() => update('cds_fields', [...fields, { field: '', alias: '', type: '', annotation: '' }])}
          onUpdate={(i, k, v) => update('cds_fields', fields.map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => update('cds_fields', fields.filter((_, idx) => idx !== i))}
          addLabel="+ Campo"
        />
      </div>

      <div>
        <label style={labelStyle}>Associations (opcional)</label>
        <GridTable
          columns={assocCols}
          rows={assocs}
          onAdd={() => update('cds_associations', [...assocs, { name: '', target: '', cardinality: '[0..1]', join: '' }])}
          onUpdate={(i, k, v) => update('cds_associations', assocs.map((r, idx) => idx === i ? { ...r, [k]: v } : r))}
          onRemove={(i) => update('cds_associations', assocs.filter((_, idx) => idx !== i))}
          addLabel="+ Association"
        />
      </div>
    </div>
  )
}

// ─── Generating Animation (Editor-style) ───────────────────────────────────────

const GEN_STAGES_NORMAL = [
  'Preparando contexto ABAP...',
  'Analisando requisitos e regras de negócio...',
  'Gerando estrutura do programa...',
  'Escrevendo código e includes...',
  'Aplicando boas práticas SAP...',
  'Finalizando objetos ABAP...'
]
const GEN_STAGES_EF = [
  'Lendo especificação funcional...',
  'Extraindo requisitos da EF...',
  'Definindo tipo de objeto ABAP...',
  'Gerando código baseado na EF...',
  'Aplicando regras Fast Code...',
  'Finalizando código ABAP...'
]
const GEN_STAGES_CDS = [
  'Preparando estrutura CDS...',
  'Definindo entidade e campos...',
  'Gerando anotações SAP...',
  'Escrevendo DCL e access control...',
  'Validando associations...',
  'Finalizando CDS view...'
]

function GeneratingAnimation({ type = 'normal' }) {
  const messages = type === 'ef' ? GEN_STAGES_EF : type === 'cds' ? GEN_STAGES_CDS : GEN_STAGES_NORMAL
  const [stage, setStage] = useState(0)
  const [dots, setDots] = useState(0)
  const [lines] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      width: 40 + Math.floor(Math.random() * 50),
      delay: i * 0.12
    }))
  )

  useEffect(() => {
    const t = setInterval(() => setStage(s => (s + 1) % messages.length), 2200)
    return () => clearInterval(t)
  }, [messages.length])

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      padding: '32px 20px'
    }}>
      {/* Animated code lines */}
      <div style={{
        width: '100%', maxWidth: 420, padding: '16px 20px',
        background: 'var(--sap-bg)', border: '1px solid var(--sap-border)',
        borderRadius: 6, fontFamily: 'monospace'
      }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            height: 10, borderRadius: 4, marginBottom: 8,
            background: `linear-gradient(90deg, var(--sap-primary) ${l.width}%, var(--sap-border) ${l.width}%)`,
            opacity: 0.5 + (stage % lines.length === i ? 0.5 : 0),
            transition: 'opacity 0.4s ease',
            animation: `abapPulse 1.8s ease-in-out ${l.delay}s infinite`
          }} />
        ))}
      </div>

      {/* Stage message */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--sap-primary)',
          marginBottom: 6, minHeight: 20,
          transition: 'opacity 0.3s'
        }}>
          {messages[stage]}{'.'.repeat(dots)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>
          Isso pode levar alguns instantes
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {messages.map((_, i) => (
          <div key={i} style={{
            width: i === stage ? 20 : 8, height: 8, borderRadius: 4,
            background: i === stage ? 'var(--sap-primary)' : 'var(--sap-border)',
            transition: 'all 0.3s ease'
          }} />
        ))}
      </div>
    </div>
  )
}

function SapVersionBadge({ sapVersion }) {
  const [showTip, setShowTip] = React.useState(false)
  const v = sapVersion || 'ECC 6.0'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)' }}>{v}</span>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <span
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          style={{
            width: 15, height: 15, borderRadius: '50%',
            background: 'var(--sap-subtle)', color: '#fff',
            fontSize: 9, fontWeight: 700, cursor: 'default',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            userSelect: 'none', flexShrink: 0
          }}
        >i</span>
        {showTip && (
          <div style={{
            position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)',
            zIndex: 200, width: 280, padding: '10px 12px',
            background: '#2d3748', color: '#e2e8f0', borderRadius: 6,
            fontSize: 12, lineHeight: 1.6, pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)', whiteSpace: 'pre-wrap'
          }}>
            {'Para verificar a versão do seu SAP:\n• Transação SM51 → campo "Release"\n• Menu Sistema → Status\n• Transação SE80 → Sobre\n\nAltere em: Configurações → IA'}
          </div>
        )}
      </span>
    </div>
  )
}

function StepGenerate({ form, providers, generating, genError, sapVersion, onGenerate }) {
  const active = getActiveProvider(providers)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Provider info */}
      {active ? (
        <div style={{
          padding: '12px 16px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 4
        }}>
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', marginBottom: 3 }}>
            Provedor de IA ativo
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text)' }}>
            {active.label}
            {active.isIntegration
              ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--sap-subtle)', fontStyle: 'italic' }}>CLI local</span>
              : <span style={{ fontWeight: 400, color: 'var(--sap-subtle)' }}> — {active.model}</span>
            }
          </div>
          {active.isIntegration && (
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 4 }}>
              Os arquivos ABAP serão salvos em Documentos/Abapfy/{form.name || 'ABAP_PROGRAM'}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '12px 16px', background: '#fff8f6',
          border: '1px solid #f5c6bc', borderRadius: 4, fontSize: 13, color: '#bb0000'
        }}>
          Nenhum provedor de IA configurado ou habilitado.
          Acesse <strong>Configurações → IA</strong> para configurar.
        </div>
      )}

      {/* SAP version */}
      <div style={{
        padding: '10px 16px', background: 'var(--sap-bg)',
        border: '1px solid var(--sap-border)', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Versão SAP do ambiente
        </div>
        <SapVersionBadge sapVersion={sapVersion} />
      </div>

      {genError && (
        <div style={{
          padding: '10px 14px', background: '#fff8f6',
          border: '1px solid #f5c6bc', borderRadius: 4, fontSize: 13, color: '#bb0000'
        }}>
          <strong>Erro:</strong> {genError}
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={generating || !active}
        style={{
          padding: '9px 24px', fontSize: 14, fontWeight: 600,
          background: generating || !active ? 'var(--sap-border)' : 'var(--sap-primary)',
          color: generating || !active ? 'var(--sap-subtle)' : '#fff',
          border: 'none', borderRadius: 4, cursor: generating || !active ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8
        }}
      >
        {generating && (
          <span style={{
            width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
            borderTop: '2px solid #fff', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', display: 'inline-block'
          }} />
        )}
        {generating ? 'Gerando código...' : 'Gerar Código'}
      </button>

      {generating && <GeneratingAnimation type={form.type === 'CDS' ? 'cds' : 'normal'} />}
    </div>
  )
}

// ─── Result Display ────────────────────────────────────────────────────────────

function FileCard({ file }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(cleanCode(file.content || ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const typeColor = TYPE_COLORS[file.type] || '#6a6d70'

  return (
    <div style={{
      border: '1px solid var(--sap-border)', borderRadius: 4, overflow: 'hidden', marginBottom: 12
    }}>
      <div style={{
        padding: '8px 14px', background: 'var(--sap-bg)',
        borderBottom: '1px solid var(--sap-border)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#fff', background: typeColor,
          padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase'
        }}>{file.type}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
          {file.name}
        </span>
        {file.description && (
          <span style={{ fontSize: 12, color: 'var(--sap-subtle)', flex: 1, marginLeft: 4 }}>
            — {file.description}
          </span>
        )}
        <button onClick={copy} style={{
          marginLeft: 'auto', fontSize: 12, color: copied ? '#107e3e' : 'var(--sap-primary)',
          background: 'transparent', border: '1px solid ' + (copied ? '#107e3e' : 'var(--sap-primary)'),
          borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
        }}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <AbapHighlight code={file.content || ''} maxHeight={320} />
    </div>
  )
}

const MAX_FIX_ATTEMPTS = 5

// Componentes markdown para renderização de respostas não-JSON do ABAP
const abapMdComponents = {
  h1: ({ children }) => <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--sap-text)', margin: '18px 0 8px', borderBottom: '2px solid var(--sap-border)', paddingBottom: 6 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text)', margin: '14px 0 6px', borderBottom: '1px solid var(--sap-border)', paddingBottom: 4 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text)', margin: '12px 0 4px' }}>{children}</h3>,
  p:  ({ children }) => <p style={{ margin: '6px 0', color: 'var(--sap-text)', fontSize: 13 }}>{children}</p>,
  code({ inline, className, children }) {
    const lang = (className || '').replace('language-', '').toLowerCase()
    const code = String(children).replace(/\n$/, '')
    if (!inline && (lang === 'abap' || lang === 'sap' || lang === '')) {
      return <AbapHighlight code={code} maxHeight={9999} />
    }
    if (!inline) {
      return <pre style={{ fontFamily: '"Cascadia Code","Consolas",monospace', fontSize: 12, background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', borderRadius: 6, padding: '10px 14px', overflowX: 'auto', margin: '8px 0', whiteSpace: 'pre-wrap', color: 'var(--sap-text)' }}><code>{code}</code></pre>
    }
    return <code style={{ fontFamily: '"Cascadia Code","Consolas",monospace', fontSize: 12, background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', borderRadius: 3, padding: '1px 5px', color: 'var(--sap-primary)' }}>{children}</code>
  },
  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, margin: '8px 0' }}>{children}</table>,
  thead: ({ children }) => <thead style={{ background: 'var(--sap-bg)' }}>{children}</thead>,
  th: ({ children }) => <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--sap-subtle)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--sap-border)' }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--sap-border)', color: 'var(--sap-text)', verticalAlign: 'top' }}>{children}</td>,
  blockquote: ({ children }) => <blockquote style={{ margin: '8px 0', padding: '8px 14px', borderLeft: '3px solid var(--sap-primary)', background: 'var(--sap-bg)', borderRadius: '0 4px 4px 0', color: 'var(--sap-subtle)', fontSize: 12 }}>{children}</blockquote>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '3px 0', color: 'var(--sap-text)', fontSize: 13 }}>{children}</li>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--sap-border)', margin: '16px 0' }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
}

function MarkdownResult({ markdown }) {
  const copyMd = () => navigator.clipboard.writeText(markdown)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={copyMd} style={{ fontSize: 12, color: 'var(--sap-primary)', background: 'transparent', border: '1px solid var(--sap-primary)', borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Copiar Resposta
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.75 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={abapMdComponents}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function ResultContent({ result, programName, providers }) {
  const { getFlowPrompt } = useAgentStore()
  const [copiedAll, setCopiedAll] = useState(false)
  // currentResult pode ser atualizado pelo loop de auto-correção
  const [currentResult, setCurrentResult] = useState(result)
  const [autoFix, setAutoFix] = useState(false)
  const [validating, setValidating] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [fixLog, setFixLog] = useState([])       // [{attempt, erros, fixed}]
  const [validateResult, setValidateResult] = useState(null)

  const copyAll = () => {
    const all = (currentResult.files || []).map(f =>
      `* === ${f.type}: ${f.name} ===\n${cleanCode(f.content || '')}`
    ).join('\n\n')
    navigator.clipboard.writeText(all)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1800)
  }

  const handleValidate = async () => {
    if (!window.api?.validateAbap) return
    setValidating(true)
    setValidateResult(null)
    setFixLog([])

    const active = autoFix ? getActiveProvider(providers) : null
    let files = currentResult.files || []
    let lastRes = null

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      // ── 1. Valida no SAP ──────────────────────────────────────────────────
      setStatusMsg(attempt === 1 ? 'Validando no SAP...' : `Revalidando no SAP (tentativa ${attempt}/${MAX_FIX_ATTEMPTS})...`)
      let res
      try {
        res = await window.api.validateAbap({ files, programName: programName || 'ZVALIDATE_TMP' })
      } catch (err) {
        lastRes = { success: false, error: err.message }
        break
      }
      lastRes = res

      const erros = res.result?.erros || []

      // ── 2. Se ok ou sem auto-correção, encerra ────────────────────────────
      if (res.result?.sucesso || !autoFix || !active || erros.length === 0) break

      // ── 3. Auto-correção: envia erros + código ao modelo ──────────────────
      setFixLog(prev => [...prev, { attempt, erros, fixed: false }])
      setStatusMsg(`Corrigindo com IA (tentativa ${attempt}/${MAX_FIX_ATTEMPTS})...`)

      const errorText = erros.map(e => `  [${e.tipo}] Linha ${e.linha}: ${e.texto}`).join('\n')
      const codigoAtual = files.map(f => `=== ${f.type}: ${f.name} ===\n${f.content}`).join('\n\n')
      const fixPrompt =
        `Corrija os erros de sintaxe ABAP abaixo identificados pelo SAP SE38.\n` +
        `Retorne APENAS o JSON com os arquivos corrigidos (mesmo formato da geração original).\n\n` +
        `ERROS (tentativa ${attempt}/${MAX_FIX_ATTEMPTS}):\n${errorText}\n\n` +
        `CÓDIGO ATUAL:\n${codigoAtual}`

      try {
        let rawText
        if (active.isIntegration) {
          const r = await window.api.generateIntegration({
            integrationType: active.integrationType,
            systemPrompt: getFlowPrompt('abap'),
            userMessage: fixPrompt,
            programName: programName || 'ZFIX'
          })
          if (!r.success) break
          rawText = r.content
        } else {
          rawText = await callAI(active, getFlowPrompt('abap'), fixPrompt)
        }
        const parsed = parseAbapResponse(rawText)
        if (parsed?.files?.length) {
          files = parsed.files
          setCurrentResult(parsed)
          setFixLog(prev => prev.map((l, i) => i === prev.length - 1 ? { ...l, fixed: true } : l))
        }
      } catch {
        break
      }
    }

    setValidateResult(lastRes)
    setStatusMsg('')
    setValidating(false)
  }

  // Fallback: modelo retornou markdown em vez de JSON estruturado
  if (currentResult._markdown) {
    return <MarkdownResult markdown={currentResult._markdown} />
  }

  const canValidate = !!window.api?.validateAbap && (currentResult.files?.length || 0) > 0
  const hasProviders = providers && getActiveProvider(providers) != null

  return (
    <div>
      {/* ── Cabeçalho: contagem + botões ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: canValidate ? 8 : 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#107e3e', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: '#107e3e',
            color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>✓</span>
          {currentResult.files?.length || 0} arquivo(s) gerado(s)
        </div>

        {canValidate && (
          <button onClick={handleValidate} disabled={validating} style={{
            fontSize: 12, color: validating ? 'var(--sap-subtle)' : '#e8a000',
            background: 'transparent',
            border: '1px solid ' + (validating ? 'var(--sap-border)' : '#e8a000'),
            borderRadius: 4, padding: '4px 14px', cursor: validating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6
          }}>
            {validating && (
              <span style={{
                width: 10, height: 10, border: '1.5px solid rgba(232,160,0,0.3)',
                borderTop: '1.5px solid #e8a000', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'inline-block'
              }} />
            )}
            {validating ? statusMsg : 'Validar no SAP'}
          </button>
        )}

        <button onClick={copyAll} style={{
          marginLeft: 'auto', fontSize: 12,
          color: copiedAll ? '#107e3e' : 'var(--sap-primary)',
          background: 'transparent',
          border: '1px solid ' + (copiedAll ? '#107e3e' : 'var(--sap-primary)'),
          borderRadius: 4, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit'
        }}>
          {copiedAll ? 'Copiado!' : 'Copiar todos'}
        </button>
      </div>

      {/* ── Aviso SAP + toggle auto-correção ───────────────────────────────── */}
      {canValidate && !validating && !validateResult && (
        <div style={{
          marginBottom: 14, padding: '9px 12px', borderRadius: 4,
          background: '#fffbf0', border: '1px solid #ffe0b2',
          display: 'flex', alignItems: 'flex-start', gap: 10
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <div style={{ fontSize: 12, color: '#7c4400', flex: 1 }}>
            <strong>Pré-requisito:</strong> certifique-se de estar logado em um ambiente SAP de <strong>desenvolvimento</strong> antes de validar.
            {hasProviders && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={autoFix}
                  onChange={e => setAutoFix(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Corrigir automaticamente com IA em caso de erros (até {MAX_FIX_ATTEMPTS} tentativas)</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* ── Log de iterações de auto-correção ──────────────────────────────── */}
      {fixLog.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fixLog.map((entry, i) => (
            <div key={i} style={{
              fontSize: 12, padding: '5px 10px', borderRadius: 4,
              background: entry.fixed ? '#f3faf5' : '#fff8f6',
              border: '1px solid ' + (entry.fixed ? '#c3e6cb' : '#f5c6bc'),
              color: entry.fixed ? '#107e3e' : '#bb0000'
            }}>
              {entry.fixed ? '✓' : '↻'} Tentativa {entry.attempt}: {entry.erros.length} erro(s) encontrado(s)
              {entry.fixed ? ' — código corrigido pela IA' : ''}
            </div>
          ))}
        </div>
      )}

      {/* ── Painel de resultado da validação ───────────────────────────────── */}
      {validateResult && (
        <div style={{
          marginBottom: 14, padding: '12px 14px', borderRadius: 4,
          background: validateResult.success && validateResult.result?.sucesso ? '#f3faf5' : '#fff8f6',
          border: '1px solid ' + (validateResult.success && validateResult.result?.sucesso ? '#c3e6cb' : '#f5c6bc')
        }}>
          {validateResult.success && validateResult.result ? (
            <>
              <div style={{
                fontSize: 13, fontWeight: 600, marginBottom: validateResult.result.erros?.length ? 8 : 0,
                color: validateResult.result.sucesso ? '#107e3e' : '#bb0000',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span>{validateResult.result.sucesso ? '✓' : '✗'}</span>
                {validateResult.result.mensagem}
                {!validateResult.result.sucesso && autoFix && fixLog.length >= MAX_FIX_ATTEMPTS && (
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#bb0000' }}>
                    — limite de {MAX_FIX_ATTEMPTS} correções atingido
                  </span>
                )}
              </div>

              {validateResult.result.erros?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                  {validateResult.result.erros.map((e, i) => (
                    <div key={i} style={{
                      fontSize: 12, fontFamily: 'monospace', padding: '4px 8px',
                      background: 'rgba(187,0,0,0.06)', borderRadius: 3, color: '#bb0000'
                    }}>
                      <strong>[{e.tipo}]</strong> Linha {e.linha}: {e.texto}
                    </div>
                  ))}
                </div>
              )}

              {validateResult.result.etapas && !validateResult.result.sucesso && (
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 6 }}>
                  {Object.entries(validateResult.result.etapas)
                    .filter(([, v]) => !v.sucesso)
                    .map(([k, v]) => <div key={k}>✗ {k}: {v.mensagem}</div>)}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#bb0000' }}>
              <strong>Erro:</strong> {validateResult.error}
            </div>
          )}
        </div>
      )}

      {currentResult.analysis && (
        <div style={{
          padding: '10px 14px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 4,
          fontSize: 13, color: 'var(--sap-text)', marginBottom: 14
        }}>
          <strong>Análise:</strong> {currentResult.analysis}
        </div>
      )}

      {(currentResult.files || []).map(file => (
        <FileCard key={file.name} file={file} />
      ))}

      {currentResult.notes && (
        <div style={{
          padding: '10px 14px', background: '#fff8f0',
          border: '1px solid #ffe0b2', borderRadius: 4,
          fontSize: 13, color: '#7c4400', marginTop: 8
        }}>
          <strong>Observações:</strong> {currentResult.notes}
        </div>
      )}

      {currentResult.dependencies?.length > 0 && (
        <div style={{
          padding: '10px 14px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 4,
          fontSize: 12, color: 'var(--sap-subtle)', marginTop: 8
        }}>
          <strong>Dependências:</strong> {currentResult.dependencies.join(', ')}
        </div>
      )}
    </div>
  )
}

// ─── EF Mode Components ────────────────────────────────────────────────────────

function EfUploadStep({ onLoaded }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.readEfDocx()
      if (res.canceled) return
      if (!res.success) throw new Error(res.error || 'Erro ao ler arquivo')
      onLoaded(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', paddingTop: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>📄</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)', marginBottom: 8 }}>
          Carregar Especificação Funcional
        </div>
        <div style={{ fontSize: 13, color: 'var(--sap-subtle)', maxWidth: 380, lineHeight: 1.6 }}>
          Selecione o arquivo Word (.docx) da EF. O agente irá ler as seções
          de Pedido Funcional, Visão Geral e Especificação e gerar o código ABAP automaticamente.
        </div>
      </div>

      <button
        onClick={handlePick}
        disabled={loading}
        style={{
          padding: '10px 28px', fontSize: 14, fontWeight: 600,
          background: loading ? 'var(--sap-border)' : 'var(--sap-primary)',
          color: loading ? 'var(--sap-subtle)' : '#fff',
          border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8
        }}
      >
        {loading && (
          <span style={{
            width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
            borderTop: '2px solid #fff', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', display: 'inline-block'
          }} />
        )}
        {loading ? 'Lendo arquivo...' : 'Selecionar EF (.docx)'}
      </button>

      {error && (
        <div style={{
          padding: '10px 14px', background: '#fff8f6',
          border: '1px solid #f5c6bc', borderRadius: 4, fontSize: 13, color: '#bb0000', maxWidth: 420
        }}>
          <strong>Erro:</strong> {error}
        </div>
      )}
    </div>
  )
}

function EfFileCard({ ef, idx, onRemove, onUpdate }) {
  const [addingFiles, setAddingFiles] = useState(false)
  const [expanded, setExpanded] = useState(idx === 0)
  const { data = {}, fileName = '' } = ef

  const handleAddPrograms = async () => {
    setAddingFiles(true)
    try {
      const res = await window.api.pickAbapFiles()
      if (res.canceled || !res.success) return
      onUpdate(prev => ({
        ...prev,
        attachedPrograms: [...(prev.attachedPrograms || []), ...res.files]
      }))
    } finally {
      setAddingFiles(false)
    }
  }

  return (
    <div style={{
      border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
          background: 'var(--sap-bg)', cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--sap-border)' : 'none'
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: '50%', background: '#107e3e',
          color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>✓</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)', flex: 1 }}>
          {fileName}
        </span>
        {ef.images?.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, background: '#0070f2', color: '#fff',
            padding: '1px 6px', borderRadius: 8
          }}>{ef.images.length} img</span>
        )}
        <span style={{ fontSize: 12, color: 'var(--sap-subtle)', marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{ ...removeBtnStyle, marginLeft: 4 }}
        >×</button>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Nome do Projeto">
              <input value={data.projectName || ''} onChange={e => onUpdate(p => ({ ...p, data: { ...p.data, projectName: e.target.value } }))} style={inputStyle} />
            </Field>
            <Field label="Empresa / Mandante">
              <input value={data.empresa || ''} onChange={e => onUpdate(p => ({ ...p, data: { ...p.data, empresa: e.target.value } }))} style={inputStyle} />
            </Field>
          </div>
          <Field label="Título">
            <input value={data.titulo || ''} onChange={e => onUpdate(p => ({ ...p, data: { ...p.data, titulo: e.target.value } }))} style={inputStyle} />
          </Field>
          {data.visaoGeral && (
            <Field label="Visão Geral (3.1)">
              <textarea value={data.visaoGeral} onChange={e => onUpdate(p => ({ ...p, data: { ...p.data, visaoGeral: e.target.value } }))} rows={3} style={textareaStyle} />
            </Field>
          )}
          {data.especificacaoFuncional && (
            <Field label="Especificação (3.2)">
              <textarea value={data.especificacaoFuncional} onChange={e => onUpdate(p => ({ ...p, data: { ...p.data, especificacaoFuncional: e.target.value } }))} rows={4} style={textareaStyle} />
            </Field>
          )}

          {/* Programas anexados */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={labelStyle}>Programas Existentes (opcional)</label>
              <button onClick={handleAddPrograms} disabled={addingFiles} style={addBtnStyle}>
                {addingFiles ? 'Aguarde...' : '+ Adicionar .abap'}
              </button>
            </div>
            {(ef.attachedPrograms || []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--sap-subtle)', fontStyle: 'italic' }}>Nenhum programa anexado</div>
            ) : (ef.attachedPrograms || []).map((prog, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 4, marginBottom: 4
              }}>
                <span style={{ fontSize: 11, color: 'var(--sap-primary)', fontFamily: 'monospace', flex: 1 }}>{prog.name}</span>
                <span style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>{(prog.content?.length || 0).toLocaleString()} chars</span>
                <button onClick={() => onUpdate(p => ({ ...p, attachedPrograms: (p.attachedPrograms || []).filter((_, j) => j !== i) }))} style={removeBtnStyle}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EfReviewStep({ efFiles, onAddFile, onRemoveFile, onUpdateFile, providers, generating, genError, onGenerate }) {
  const active = getActiveProvider(providers)
  const [loadingMore, setLoadingMore] = useState(false)

  const handleAddMoreEf = async () => {
    setLoadingMore(true)
    try {
      const res = await window.api.readEfDocx()
      if (res.canceled || !res.success) return
      onAddFile(res)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* EF files list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Especificações Funcionais ({efFiles.length})
          </div>
          <button onClick={handleAddMoreEf} disabled={loadingMore} style={addBtnStyle}>
            {loadingMore ? 'Carregando...' : '+ Adicionar outra EF'}
          </button>
        </div>
        {efFiles.map((ef, idx) => (
          <EfFileCard
            key={idx} idx={idx} ef={ef}
            onRemove={() => onRemoveFile(idx)}
            onUpdate={(updater) => onUpdateFile(idx, updater)}
          />
        ))}
      </div>

      {/* Provedor ativo */}
      {active ? (
        <div style={{
          padding: '12px 16px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 4
        }}>
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', marginBottom: 3 }}>
            Provedor de IA ativo
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text)' }}>
            {active.label}
            {active.isIntegration
              ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--sap-subtle)', fontStyle: 'italic' }}>CLI local</span>
              : <span style={{ fontWeight: 400, color: 'var(--sap-subtle)' }}> — {active.model}</span>
            }
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px 16px', background: '#fff8f6',
          border: '1px solid #f5c6bc', borderRadius: 4, fontSize: 13, color: '#bb0000'
        }}>
          Nenhum provedor de IA configurado. Acesse <strong>Configurações → IA</strong>.
        </div>
      )}

      {genError && (
        <div style={{
          padding: '10px 14px', background: '#fff8f6',
          border: '1px solid #f5c6bc', borderRadius: 4, fontSize: 13, color: '#bb0000'
        }}>
          <strong>Erro:</strong> {genError}
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={generating || !active}
        style={{
          padding: '9px 24px', fontSize: 14, fontWeight: 600, alignSelf: 'flex-start',
          background: generating || !active ? 'var(--sap-border)' : 'var(--sap-primary)',
          color: generating || !active ? 'var(--sap-subtle)' : '#fff',
          border: 'none', borderRadius: 4, cursor: generating || !active ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit'
        }}
      >
        {efFiles.length > 1
          ? `Gerar Código das ${efFiles.length} EFs`
          : 'Gerar Código a partir da EF'
        }
      </button>

      {generating && <GeneratingAnimation type="ef" />}
    </div>
  )
}

// ─── Build prompt from EF data ─────────────────────────────────────────────────

function buildEfPrompt(efData, sapVersion) {
  const d = efData.data || {}
  let p = 'GERAR CÓDIGO ABAP A PARTIR DE ESPECIFICAÇÃO FUNCIONAL\n\n'

  if (sapVersion) p += `Versão SAP do ambiente: ${sapVersion}\n`
  if (d.projectName) p += `Projeto: ${d.projectName}\n`
  if (d.empresa) p += `Empresa/Mandante: ${d.empresa}\n`
  if (d.titulo) p += `Título: ${d.titulo}\n`
  if (d.descricaoResumida) p += `Descrição: ${d.descricaoResumida}\n`
  p += '\n'

  if (d.visaoGeral?.trim()) {
    p += `VISÃO GERAL DO PROCESSO (seção 3.1):\n${d.visaoGeral.trim()}\n\n`
  }

  if (d.especificacaoFuncional?.trim()) {
    p += `ESPECIFICAÇÃO FUNCIONAL DETALHADA (seção 3.2):\n${d.especificacaoFuncional.trim()}\n\n`
  }

  const progs = efData.attachedPrograms || []
  if (progs.length) {
    p += `PROGRAMAS ABAP EXISTENTES (contexto — esta EF é uma melhoria):\n`
    for (const prog of progs) {
      p += `\n=== ${prog.name} ===\n${prog.content}\n`
    }
    p += '\n'
    p += 'Os programas acima são a versão atual. Implemente as melhorias conforme a EF.\n\n'
  }

  p += 'Gere o código ABAP completo baseado na EF. '
  p += 'Escolha o tipo de objeto mais adequado (REPORT, FUNC, CLAS, ENHO ou PROG). '
  p += 'Siga todas as regras: Fast Code, nomenclatura Z, sem SELECT em LOOP, ALV correto.'
  return p
}

// ─── Create Modal ──────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  type: 'REPORT', name: '', description: '', author: '', company: '',
  transaction_code: '', function_group: '', superclass: '', visibility: 'PUBLIC',
  interfaces: [], target_program: '', enhancement_type: 'SPOT', spot_name: '',
  context: '', rules: [''],
  tables: [], imports: [], exports: [], tables_params: [], exceptions: [],
  attributes: [], methods: [],
  // CDS fields
  cds_base_entity: '', cds_view_type: 'basic', cds_annotation_preset: 'fiori',
  cds_fields: [], cds_associations: []
}

function CreateModal({ onClose, onStartGenerate, user, providers }) {
  const { sapVersion } = useAiStore()
  const { getFlowPrompt } = useAgentStore()
  const { getSkillsForType } = useSkillsStore()

  // mode: null = tela inicial, 'ef' = fluxo EF, 'manual' = wizard manual
  const [mode, setMode] = useState(null)

  // Estado do wizard manual
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(DEFAULT_FORM)

  // Estado do fluxo EF — suporte a múltiplas EFs
  const [efFiles, setEfFiles] = useState([])      // array de { data, fileName, attachedPrograms, images, rawText }
  const [efStep, setEfStep] = useState('upload')  // 'upload' | 'review'

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const steps = STEPS_BY_TYPE[form.type] || STEPS_BY_TYPE.REPORT
  const totalSteps = steps.length
  const isLastStep = step === totalSteps

  // Helpers EF
  const addEfFile = (res) => {
    setEfFiles(prev => [...prev, { ...res, attachedPrograms: [], images: res.images || [] }])
  }
  const removeEfFile = (idx) => setEfFiles(prev => prev.filter((_, i) => i !== idx))
  const updateEfFile = (idx, updater) => setEfFiles(prev => prev.map((f, i) => i === idx ? updater(f) : f))

  // ── Builds combined EF prompt ───────────────────────────────────────────────
  const buildCombinedEfPrompt = () => {
    if (efFiles.length === 1) return buildEfPrompt(efFiles[0], sapVersion)
    let p = `GERAR CÓDIGO ABAP A PARTIR DE ${efFiles.length} ESPECIFICAÇÕES FUNCIONAIS\n\n`
    if (sapVersion) p += `Versão SAP do ambiente: ${sapVersion}\n\n`
    efFiles.forEach((ef, idx) => {
      const d = ef.data || {}
      p += `== ESPECIFICAÇÃO ${idx + 1}: ${ef.fileName || `EF_${idx + 1}`} ==\n`
      if (d.titulo) p += `Título: ${d.titulo}\n`
      if (d.descricaoResumida) p += `Descrição: ${d.descricaoResumida}\n`
      if (d.visaoGeral?.trim()) p += `\nVisão Geral:\n${d.visaoGeral.trim()}\n`
      if (d.especificacaoFuncional?.trim()) p += `\nEspecificação:\n${d.especificacaoFuncional.trim()}\n`
      const progs = ef.attachedPrograms || []
      if (progs.length) {
        p += `\nProgramas anexados:\n`
        progs.forEach(prog => { p += `\n=== ${prog.name} ===\n${prog.content}\n` })
      }
      p += '\n'
    })
    p += 'Integre todos os requisitos acima em um único conjunto coeso de objetos ABAP.\n'
    p += 'Siga as regras: Fast Code, nomenclatura Z, sem SELECT em LOOP, ALV correto.'
    return p
  }

  // ── Geração: coleta config e delega para AbapView ───────────────────────────
  const handleGenerate = () => {
    const active = getActiveProvider(providers)
    if (!active) return
    const userPrompt = mode === 'ef' ? buildCombinedEfPrompt() : buildAbapPrompt(form, sapVersion)
    const programName = mode === 'ef'
      ? (efFiles[0]?.data?.projectName || 'ABAP_EF')
      : (form.name || 'ABAP_PROGRAM')
    const objectType = mode === 'ef' ? 'EF' : form.type
    const skillsContext = getSkillsForType(objectType)
    const systemPrompt = getFlowPrompt('abap') + skillsContext
    const images = (mode === 'ef' ? efFiles.flatMap(ef => ef.images || []) : [])
    const saveMeta = mode === 'ef'
      ? {
          name: efFiles[0]?.data?.projectName || efFiles[0]?.data?.titulo || 'EF_PROGRAM',
          type: 'REPORT',
          description: efFiles[0]?.data?.descricaoResumida || efFiles[0]?.data?.titulo || '',
          metadata: { efFiles: efFiles.map(({ images: _i, ...rest }) => rest) },
          isEf: true
        }
      : {
          name: form.name || 'SEM_NOME',
          type: form.type,
          description: form.description || form.context?.slice(0, 100) || '',
          metadata: form,
          isEf: false
        }
    onStartGenerate({ active, systemPrompt, userPrompt, programName, images, saveMeta })
    onClose()
  }

  // ── Render: tela inicial ────────────────────────────────────────────────────
  const renderIntro = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, color: 'var(--sap-subtle)', marginBottom: 4 }}>
        Como deseja criar o objeto ABAP?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Card: Carregar EF */}
        <div
          onClick={() => setMode('ef')}
          style={{
            padding: '20px 18px', border: '2px solid var(--sap-primary)',
            borderRadius: 6, cursor: 'pointer', background: 'var(--sap-primary)08',
            transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 10
          }}
        >
          <div style={{ fontSize: 26 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-primary)' }}>
            Carregar Especificação Funcional
          </div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)', lineHeight: 1.6 }}>
            Importe um arquivo Word (.docx) com a EF. O agente lê as seções de
            Pedido Funcional, Visão Geral e Especificação e gera o código automaticamente.
            Também suporta anexar programas existentes para melhorias.
          </div>
        </div>
        {/* Card: Manual */}
        <div
          onClick={() => setMode('manual')}
          style={{
            padding: '20px 18px', border: '2px solid var(--sap-border)',
            borderRadius: 6, cursor: 'pointer', background: 'var(--sap-base)',
            transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 10
          }}
        >
          <div style={{ fontSize: 26 }}>✏️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text)' }}>
            Criar Manualmente
          </div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)', lineHeight: 1.6 }}>
            Preencha o wizard passo a passo: tipo de objeto, identificação, contexto,
            regras de negócio e tabelas. Controle total sobre cada detalhe do código.
          </div>
        </div>
      </div>
    </div>
  )

  // ── Render: sidebar de steps para o wizard manual ───────────────────────────
  const stepLabel = (i) => i === 0 ? 'Tipo' : steps[i - 1] || ''

  const renderManualStepContent = () => {
    if (step === 0) {
      return (
        <div>
          <div style={{ fontSize: 14, color: 'var(--sap-subtle)', marginBottom: 20 }}>
            Selecione o tipo de objeto ABAP a ser criado:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TYPES.map(t => (
              <div
                key={t.key}
                onClick={() => setForm(p => ({ ...DEFAULT_FORM, type: t.key, author: p.author }))}
                style={{
                  padding: '14px 16px', border: `2px solid ${form.type === t.key ? TYPE_COLORS[t.key] : 'var(--sap-border)'}`,
                  borderRadius: 4, cursor: 'pointer', background: form.type === t.key ? `${TYPE_COLORS[t.key]}0a` : 'var(--sap-base)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: form.type === t.key ? TYPE_COLORS[t.key] : 'var(--sap-text)', marginBottom: 4 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    const stepName = steps[step - 1]
    switch (stepName) {
      case 'Identificação': return <StepIdentification form={form} update={update} user={user} />
      case 'Contexto': return <StepContext form={form} update={update} />
      case 'Regras de Negócio': return <StepRules form={form} update={update} />
      case 'Tabelas': return <StepTables form={form} update={update} />
      case 'Interface': return <StepFuncInterface form={form} update={update} />
      case 'Atributos e Métodos': return <StepClassOO form={form} update={update} />
      case 'Entidade e Campos': return <StepCdsEntity form={form} update={update} />
      case 'Gerar': return (
        <StepGenerate
          form={form} providers={providers}
          generating={false} genError={null}
          sapVersion={sapVersion}
          onGenerate={handleGenerate}
        />
      )
      default: return null
    }
  }

  // ── Layout: decide header badge e título ────────────────────────────────────
  const headerBadge = mode === 'ef' ? 'EF' : form.type
  const headerBadgeColor = mode === 'ef' ? '#0070f2' : (TYPE_COLORS[form.type] || 'var(--sap-primary)')
  const headerTitle = mode === null ? 'Novo Objeto ABAP' : mode === 'ef' ? 'A partir de Especificação Funcional' : 'Novo Objeto ABAP'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        width: '88vw', maxWidth: 920, height: '88vh', maxHeight: 700,
        background: 'var(--sap-base)', borderRadius: 8,
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--sap-border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: headerBadgeColor, padding: '2px 8px', borderRadius: 3
          }}>{headerBadge}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)' }}>
            {headerTitle}
          </span>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 18, color: 'var(--sap-subtle)', cursor: 'pointer', lineHeight: 1, padding: '0 4px'
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Step sidebar — só no modo manual ou EF com arquivo carregado */}
          {mode !== null && (
            <div style={{
              width: 176, borderRight: '1px solid var(--sap-border)', padding: '20px 0',
              background: 'var(--sap-bg)', flexShrink: 0, overflowY: 'auto'
            }}>
              {mode === 'ef' ? (
                // Sidebar do fluxo EF
                <div style={{ padding: '8px 0' }}>
                  {[['upload', 'Carregar EF'], ['review', 'Revisar & Gerar']].map(([key, label], i) => {
                    const isDone = key === 'upload' && efStep === 'review'
                    const isActive = efStep === key
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px',
                        background: isActive ? 'var(--sap-primary)0f' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--sap-primary)' : '3px solid transparent',
                        cursor: isDone ? 'pointer' : 'default',
                        opacity: !isDone && !isActive ? 0.45 : 1
                      }} onClick={() => { if (isDone) setEfStep('upload') }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: isDone ? '#107e3e' : isActive ? 'var(--sap-primary)' : 'var(--sap-border)',
                          color: isDone || isActive ? '#fff' : 'var(--sap-subtle)',
                          fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--sap-primary)' : isDone ? 'var(--sap-text)' : 'var(--sap-subtle)'
                        }}>{label}</span>
                      </div>
                    )
                  })}
                  {efFiles.length > 0 && efStep === 'review' && (
                    <div style={{ padding: '8px 16px 0' }}>
                      <div style={{ fontSize: 10, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4 }}>
                        EFs carregadas
                      </div>
                      {efFiles.map((ef, i) => (
                        <div key={i} style={{
                          fontSize: 11, color: 'var(--sap-text)', padding: '3px 0',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <span style={{ color: '#107e3e', flexShrink: 0 }}>✓</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ef.fileName || `EF ${i + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Sidebar do wizard manual
                Array.from({ length: totalSteps + 1 }, (_, i) => {
                  const done = i < step
                  const active = i === step
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 16px',
                      background: active ? 'var(--sap-primary)0f' : 'transparent',
                      borderLeft: active ? '3px solid var(--sap-primary)' : '3px solid transparent',
                      cursor: i <= step ? 'pointer' : 'default',
                      opacity: i > step ? 0.45 : 1
                    }} onClick={() => { if (i <= step) setStep(i) }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: done ? '#107e3e' : active ? 'var(--sap-primary)' : 'var(--sap-border)',
                        color: done || active ? '#fff' : 'var(--sap-subtle)',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: active ? 600 : 400,
                        color: active ? 'var(--sap-primary)' : done ? 'var(--sap-text)' : 'var(--sap-subtle)'
                      }}>{stepLabel(i)}</span>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, padding: mode === null ? '32px 40px' : '24px', overflowY: 'auto' }}>
            {mode === null && renderIntro()}
            {mode === 'ef' && efStep === 'upload' && (
              <EfUploadStep
                onLoaded={(res) => {
                  addEfFile(res)
                  setEfStep('review')
                }}
              />
            )}
            {mode === 'ef' && efStep === 'review' && (
              <EfReviewStep
                efFiles={efFiles}
                onAddFile={addEfFile}
                onRemoveFile={removeEfFile}
                onUpdateFile={updateEfFile}
                providers={providers}
                generating={false} genError={null}
                onGenerate={handleGenerate}
              />
            )}
            {mode === 'manual' && renderManualStepContent()}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--sap-border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: 'var(--sap-bg)'
        }}>
          <button onClick={onClose} style={{
            padding: '7px 18px', fontSize: 13, background: 'transparent',
            border: '1px solid var(--sap-border)', borderRadius: 4,
            color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit'
          }}>Cancelar</button>

          {/* Botão voltar à tela inicial */}
          {mode !== null && (
            <button onClick={() => {
              setMode(null); setEfFiles([]); setEfStep('upload'); setStep(0)
            }} style={{
              padding: '7px 18px', fontSize: 13, background: 'transparent',
              border: '1px solid var(--sap-border)', borderRadius: 4,
              color: 'var(--sap-subtle)', cursor: 'pointer', fontFamily: 'inherit'
            }}>‹ Voltar</button>
          )}

          <div style={{ flex: 1 }} />

          {/* Navegação do wizard manual */}
          {mode === 'manual' && step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '7px 18px', fontSize: 13, background: 'transparent',
              border: '1px solid var(--sap-border)', borderRadius: 4,
              color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit'
            }}>‹ Anterior</button>
          )}

          {mode === 'manual' && !isLastStep && (
            <button onClick={() => setStep(s => s + 1)} style={{
              padding: '7px 20px', fontSize: 13, fontWeight: 600,
              background: 'var(--sap-primary)', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Próximo ›
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Result View Modal ─────────────────────────────────────────────────────────

function ResultModal({ program, onClose }) {
  if (!program) return null
  let result = program.result
  if (typeof result === 'string') { try { result = JSON.parse(result) } catch { result = null } }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        width: '88vw', maxWidth: 860, height: '88vh', maxHeight: 700,
        background: 'var(--sap-base)', borderRadius: 8,
        boxShadow: '0 8px 40px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--sap-border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: TYPE_COLORS[program.type] || '#6a6d70',
            padding: '2px 8px', borderRadius: 3
          }}>{program.type}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
            {program.name}
          </span>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 18, color: 'var(--sap-subtle)', cursor: 'pointer', lineHeight: 1, padding: '0 4px'
          }}>×</button>
        </div>
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {result ? <ResultContent result={result} programName={program.name} /> : (
            <div style={{ color: 'var(--sap-subtle)', fontSize: 14 }}>Resultado não disponível.</div>
          )}
        </div>
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--sap-border)',
          display: 'flex', justifyContent: 'flex-end', background: 'var(--sap-bg)', flexShrink: 0
        }}>
          <button onClick={onClose} style={{
            padding: '7px 20px', fontSize: 13, background: 'var(--sap-primary)',
            color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
          }}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Program Card ──────────────────────────────────────────────────────────────

function ProgramCard({ program, onView, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const color = TYPE_COLORS[program.type] || '#6a6d70'
  const date = new Date(program.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fileCount = (() => {
    try {
      const r = typeof program.result === 'string' ? JSON.parse(program.result) : program.result
      return r?.files?.length || 0
    } catch { return 0 }
  })()

  return (
    <div style={{
      background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 4,
      overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: '14px 16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fff', background: color,
            padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', flexShrink: 0, marginTop: 1
          }}>{program.type}</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--sap-text)',
            fontFamily: 'monospace', wordBreak: 'break-all'
          }}>{program.name}</span>
        </div>
        {program.description && (
          <div style={{
            fontSize: 12, color: 'var(--sap-subtle)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {program.description}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 10, display: 'flex', gap: 12 }}>
          <span>{date}</span>
          {fileCount > 0 && <span>{fileCount} arquivo(s)</span>}
        </div>
      </div>
      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--sap-border)',
        display: 'flex', gap: 8, background: 'var(--sap-bg)'
      }}>
        <button onClick={onView} style={{
          flex: 1, padding: '5px 0', fontSize: 12, background: 'transparent',
          border: '1px solid var(--sap-primary)', color: 'var(--sap-primary)',
          borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
        }}>Ver código</button>
        {confirmDel ? (
          <>
            <button onClick={onDelete} style={{
              flex: 1, padding: '5px 0', fontSize: 12, background: '#bb0000',
              border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
            }}>Confirmar</button>
            <button onClick={() => setConfirmDel(false)} style={{
              padding: '5px 10px', fontSize: 12, background: 'transparent',
              border: '1px solid var(--sap-border)', color: 'var(--sap-subtle)',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
            }}>Não</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{
            padding: '5px 10px', fontSize: 12, background: 'transparent',
            border: '1px solid var(--sap-border)', color: 'var(--sap-subtle)',
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
          }}>Excluir</button>
        )}
      </div>
    </div>
  )
}

// ─── FileBlock — arquivo ABAP com highlight e copy ────────────────────────────

function FileBlock({ file }) {
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const color = TYPE_COLORS[file.type] || '#6a6d70'

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div style={{ border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
      {/* File header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '10px 16px', background: 'var(--sap-bg)',
          borderBottom: open ? '1px solid var(--sap-border)' : 'none',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#fff',
          background: color, padding: '2px 7px', borderRadius: 3, flexShrink: 0
        }}>{file.type}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
          {file.name}
        </span>
        {file.description && (
          <span style={{ fontSize: 12, color: 'var(--sap-subtle)', marginLeft: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            — {file.description}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); handleCopy() }}
          style={{
            fontSize: 11, color: 'var(--sap-subtle)', background: 'transparent',
            border: '1px solid var(--sap-border)', borderRadius: 3, padding: '2px 8px',
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
          }}
        >{copied ? '✓' : 'Copiar'}</button>
        <span style={{ color: 'var(--sap-subtle)', fontSize: 11, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <AbapHighlight code={file.content || ''} />}
    </div>
  )
}

// ─── AbapResultPanel — resultado de geração ao estilo DtecView ────────────────

function AbapResultPanel({ genRaw, genResult, genError, onSave, onNova, saving }) {
  const [copiedAll, setCopiedAll] = useState(false)

  const files = genResult?.files || []
  const primaryFile = files[0]
  const typeBadgeColor = TYPE_COLORS[primaryFile?.type] || '#6a6d70'

  const handleCopyAll = () => {
    const allCode = files.map(f => `*--- ${f.name} (${f.type}) ---\n${f.content}`).join('\n\n')
    navigator.clipboard.writeText(allCode || genRaw || '')
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1800)
  }

  const infoItems = [
    genResult?.approach && { label: 'Abordagem', value: genResult.approach },
    genResult?.alv_approach && genResult.alv_approach !== 'none' && { label: 'ALV', value: genResult.alv_approach },
    genResult?.transport_order_type && { label: 'Transporte', value: genResult.transport_order_type },
  ].filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 24px', borderBottom: '1px solid var(--sap-border)',
        background: 'var(--sap-base)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
      }}>
        {primaryFile && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fff',
            background: typeBadgeColor, padding: '2px 7px', borderRadius: 3
          }}>{primaryFile.type}</span>
        )}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
          {primaryFile?.name || 'Resultado ABAP'}
        </span>
        {files.length > 1 && (
          <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>
            +{files.length - 1} arquivo(s)
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={handleCopyAll} style={{
          fontSize: 12, color: 'var(--sap-primary)', background: 'transparent',
          border: '1px solid var(--sap-primary)', borderRadius: 4, padding: '5px 12px',
          cursor: 'pointer', fontFamily: 'inherit'
        }}>{copiedAll ? '✓ Copiado' : 'Copiar tudo'}</button>
        <button onClick={onNova} style={{
          fontSize: 12, color: 'var(--sap-text)', background: 'transparent',
          border: '1px solid var(--sap-border)', borderRadius: 4, padding: '5px 12px',
          cursor: 'pointer', fontFamily: 'inherit'
        }}>Nova Geração</button>
        <button onClick={onSave} disabled={saving} style={{
          fontSize: 12, fontWeight: 600, color: '#fff',
          background: saving ? 'var(--sap-border)' : '#107e3e',
          border: 'none', borderRadius: 4, padding: '5px 18px',
          cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
        }}>{saving ? 'Salvando...' : 'Salvar'}</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {genError && (
          <div style={{ padding: '12px 16px', background: '#fff8f6', border: '1px solid #f5c6bc', borderRadius: 6, color: '#bb0000', fontSize: 13, marginBottom: 20 }}>
            <strong>Erro na geração:</strong> {genError}
          </div>
        )}

        {/* Análise */}
        {genResult?.analysis && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
              Análise
            </div>
            <div style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.7 }}>
              {genResult.analysis}
            </div>
          </div>
        )}

        {/* Info row: abordagem, ALV, transporte */}
        {infoItems.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {infoItems.map(item => (
              <div key={item.label} style={{
                padding: '6px 14px', background: 'var(--sap-bg)',
                border: '1px solid var(--sap-border)', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: 'var(--sap-text)', fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            ))}
            {Array.isArray(genResult?.dependencies) && genResult.dependencies.length > 0 && (
              <div style={{ padding: '6px 14px', background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>Tabelas</span>
                {genResult.dependencies.slice(0, 8).map(d => (
                  <span key={d} style={{ fontSize: 11, color: 'var(--sap-primary)', fontFamily: 'monospace', background: 'var(--sap-primary)0f', padding: '1px 6px', borderRadius: 3 }}>{d}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Arquivos com código */}
        {files.length > 0 ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>
              Arquivos gerados ({files.length})
            </div>
            {files.map((file, i) => <FileBlock key={i} file={file} />)}
          </>
        ) : !genError && (
          <div style={{ color: 'var(--sap-subtle)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingTop: 40 }}>
            Nenhum arquivo encontrado na resposta.
          </div>
        )}

        {/* Notas */}
        {genResult?.notes && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbea', border: '1px solid #ffe066', borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7a6a00', textTransform: 'uppercase', marginBottom: 6 }}>Notas</div>
            <div style={{ fontSize: 13, color: '#4a3f00', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{genResult.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main View ─────────────────────────────────────────────────────────────────

export default function AbapView() {
  const { programs, loading, loadPrograms, deleteProgram, saveProgram } = useAbapStore()
  const { providers, loadProviders } = useAiStore()
  const { user } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [viewProgram, setViewProgram] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  // ── Geração centralizada ─────────────────────────────────────────────────────
  const [genPhase, setGenPhase] = useState(null) // null | 'generating' | 'result'
  const [genRaw, setGenRaw] = useState('')
  const [genResult, setGenResult] = useState(null)
  const [genError, setGenError] = useState(null)
  const [pendingMeta, setPendingMeta] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleStartGenerate = async ({ active, systemPrompt, userPrompt, programName, images, saveMeta }) => {
    setGenPhase('generating')
    setGenRaw('')
    setGenResult(null)
    setGenError(null)
    setPendingMeta(saveMeta)
    try {
      let rawText
      if (active.isIntegration) {
        const res = await window.api.generateIntegration({
          integrationType: active.integrationType,
          systemPrompt,
          userMessage: userPrompt,
          programName,
          images
        })
        if (!res.success) throw new Error(res.error)
        rawText = res.content
      } else {
        rawText = await callAI(active, systemPrompt, userPrompt, images)
      }
      const parsed = parseAbapResponse(rawText)
      setGenRaw(rawText)
      setGenResult(parsed)
      notify('✓ Código ABAP gerado', `${parsed?.files?.length ?? 0} arquivo(s) — ${programName}`)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenPhase('result')
    }
  }

  const handleSaveResult = async () => {
    if (!pendingMeta) return
    setSaving(true)
    try {
      const res = await saveProgram({
        name: pendingMeta.name,
        type: pendingMeta.type,
        description: pendingMeta.description,
        metadata: pendingMeta.metadata,
        result: genResult
      })
      if (res.success) {
        loadPrograms()
        setGenPhase(null)
        setGenRaw('')
        setGenResult(null)
        setPendingMeta(null)
        notify('✓ Salvo', pendingMeta.name)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleNovaGeracao = () => {
    setGenPhase(null)
    setGenRaw('')
    setGenResult(null)
    setGenError(null)
    setPendingMeta(null)
    setShowCreate(true)
  }

  useEffect(() => {
    loadPrograms()
    loadProviders()
  }, [])

  const filtered = programs.filter(p => {
    const matchSearch = !search || p.name.includes(search.toUpperCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || p.type === filterType
    return matchSearch && matchType
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes abapPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Page header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--sap-border)',
        background: 'var(--sap-base)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sap-text)' }}>ABAP Development</div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 1 }}>
            {genPhase === 'generating' ? 'Gerando código...' : genPhase === 'result' ? 'Revisão do código gerado' : 'Criação de objetos ABAP assistida por IA'}
          </div>
        </div>
        {genPhase === null && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              marginLeft: 'auto', padding: '8px 20px', fontSize: 13, fontWeight: 600,
              background: 'var(--sap-primary)', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            + Novo Código
          </button>
        )}
      </div>

      {/* Filters — only in list mode */}
      {genPhase === null && <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--sap-border)',
        background: 'var(--sap-base)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou descrição..."
          style={{ ...inputStyle, width: 260 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {['ALL', ...TYPES.map(t => t.key)].map(key => (
            <button key={key} onClick={() => setFilterType(key)} style={{
              padding: '5px 12px', fontSize: 12,
              background: filterType === key ? (TYPE_COLORS[key] || 'var(--sap-primary)') : 'transparent',
              color: filterType === key ? '#fff' : 'var(--sap-subtle)',
              border: `1px solid ${filterType === key ? (TYPE_COLORS[key] || 'var(--sap-primary)') : 'var(--sap-border)'}`,
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterType === key ? 600 : 400
            }}>
              {key === 'ALL' ? 'Todos' : key}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--sap-subtle)' }}>
          {filtered.length} {filtered.length === 1 ? 'objeto' : 'objetos'}
        </span>
      </div>}

      {/* Generating animation — full panel */}
      {genPhase === 'generating' && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 32
        }}>
          <GeneratingAnimation type="abap" />
        </div>
      )}

      {/* Result panel */}
      {genPhase === 'result' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AbapResultPanel
            genRaw={genRaw}
            genResult={genResult}
            genError={genError}
            saving={saving}
            onSave={handleSaveResult}
            onNova={handleNovaGeracao}
          />
        </div>
      )}

      {/* Programs list */}
      {genPhase === null && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--sap-subtle)', paddingTop: 60, fontSize: 14 }}>
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', paddingTop: 60, color: 'var(--sap-subtle)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 48, height: 48, border: '2px dashed var(--sap-border)',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: 'var(--sap-border)'
              }}>◈</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)' }}>
                {search || filterType !== 'ALL' ? 'Nenhum resultado encontrado' : 'Nenhum código criado'}
              </div>
              <div style={{ fontSize: 13 }}>
                {search || filterType !== 'ALL'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Clique em "Novo Código" para começar'}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12
            }}>
              {filtered.map(p => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  onView={() => setViewProgram(p)}
                  onDelete={() => deleteProgram(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateModal
          user={user}
          providers={providers}
          onClose={() => setShowCreate(false)}
          onStartGenerate={handleStartGenerate}
        />
      )}

      {viewProgram && (
        <ResultModal program={viewProgram} onClose={() => setViewProgram(null)} />
      )}
    </div>
  )
}
