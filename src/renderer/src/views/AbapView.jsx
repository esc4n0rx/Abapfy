import React, { useState, useEffect, useCallback } from 'react'
import { useAbapStore } from '../store/abapStore'
import { useAiStore } from '../store/aiStore'
import { useAuthStore } from '../store/authStore'
import { callAI, parseJSONResponse, getActiveProvider, buildAbapPrompt } from '../lib/aiClient'
import { notify } from '../lib/notify'
import abaperPrompt from '../agents/abaper.md?raw'

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPES = [
  { key: 'REPORT', label: 'Report', desc: 'Relatório com tela de seleção e saída ALV/lista' },
  { key: 'FUNC', label: 'Function Module', desc: 'Módulo de função reutilizável com interface definida' },
  { key: 'CLAS', label: 'Classe ABAP', desc: 'Classe orientada a objetos (OOP)' },
  { key: 'ENHO', label: 'Enhancement', desc: 'Ampliação de programa SAP (BAdI / Enhancement Spot)' },
  { key: 'PROG', label: 'Programa', desc: 'Programa simples sem tela de seleção padrão' }
]

const TYPE_COLORS = { REPORT: '#0070f2', FUNC: '#107e3e', CLAS: '#8b5cf6', ENHO: '#e9730c', PROG: '#6a6d70' }

const STEPS_BY_TYPE = {
  REPORT: ['Identificação', 'Contexto', 'Regras de Negócio', 'Tabelas', 'Gerar'],
  FUNC:   ['Identificação', 'Interface', 'Contexto', 'Regras de Negócio', 'Gerar'],
  CLAS:   ['Identificação', 'Atributos e Métodos', 'Contexto', 'Gerar'],
  ENHO:   ['Identificação', 'Contexto', 'Regras de Negócio', 'Gerar'],
  PROG:   ['Identificação', 'Contexto', 'Regras de Negócio', 'Tabelas', 'Gerar']
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
            placeholder={form.type === 'FUNC' ? 'ZFM_XXXX' : form.type === 'CLAS' ? 'ZCL_XXXX' : 'ZREPORT_XXXX'}
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

function StepGenerate({ form, providers, generating, genError, genResult, genSavedPath, onGenerate }) {
  const active = getActiveProvider(providers)

  if (genResult) {
    return (
      <>
        <ResultContent result={genResult} />
        {genSavedPath && (
          <div style={{
            marginTop: 12, padding: '9px 14px', borderRadius: 4, fontSize: 12,
            background: '#f3faf5', border: '1px solid #c3e6cb', color: 'var(--sap-positive)'
          }}>
            Arquivos ABAP salvos em: <strong>{genSavedPath}</strong>
          </div>
        )}
      </>
    )
  }

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

      {/* EF (disabled) */}
      <div style={{
        padding: '12px 16px', background: 'var(--sap-bg)',
        border: '1px dashed var(--sap-border)', borderRadius: 4, opacity: 0.55
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)' }}>
          Carregar Especificação Funcional
        </div>
        <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2 }}>
          Em desenvolvimento — disponível em breve
        </div>
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

      {generating && (
        <div style={{ fontSize: 13, color: 'var(--sap-subtle)' }}>
          {active?.isIntegration
            ? 'Aguarde — o agente CLI está gerando o código. Isso pode levar 1-2 minutos...'
            : 'Aguarde enquanto o código é gerado. Isso pode levar alguns instantes...'
          }
        </div>
      )}
    </div>
  )
}

// ─── Result Display ────────────────────────────────────────────────────────────

function FileCard({ file }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(file.content || '')
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
      <pre style={{
        margin: 0, padding: '14px 16px', fontSize: 12, lineHeight: 1.6,
        fontFamily: '"Courier New", Consolas, monospace',
        background: 'var(--sap-base)', color: 'var(--sap-text)',
        overflowX: 'auto', maxHeight: 320, overflowY: 'auto',
        whiteSpace: 'pre', tabSize: 2
      }}>
        {file.content || ''}
      </pre>
    </div>
  )
}

function ResultContent({ result }) {
  const [copiedAll, setCopiedAll] = useState(false)
  const copyAll = () => {
    const all = (result.files || []).map(f =>
      `* === ${f.type}: ${f.name} ===\n${f.content}`
    ).join('\n\n')
    navigator.clipboard.writeText(all)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1800)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#107e3e',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: '#107e3e',
            color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>✓</span>
          {result.files?.length || 0} arquivo(s) gerado(s)
        </div>
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

      {result.analysis && (
        <div style={{
          padding: '10px 14px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 4,
          fontSize: 13, color: 'var(--sap-text)', marginBottom: 14
        }}>
          <strong>Análise:</strong> {result.analysis}
        </div>
      )}

      {(result.files || []).map(file => (
        <FileCard key={file.name} file={file} />
      ))}

      {result.notes && (
        <div style={{
          padding: '10px 14px', background: '#fff8f0',
          border: '1px solid #ffe0b2', borderRadius: 4,
          fontSize: 13, color: '#7c4400', marginTop: 8
        }}>
          <strong>Observações:</strong> {result.notes}
        </div>
      )}

      {result.dependencies?.length > 0 && (
        <div style={{
          padding: '10px 14px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 4,
          fontSize: 12, color: 'var(--sap-subtle)', marginTop: 8
        }}>
          <strong>Dependências:</strong> {result.dependencies.join(', ')}
        </div>
      )}
    </div>
  )
}

// ─── Create Modal ──────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  type: 'REPORT', name: '', description: '', author: '', company: '',
  transaction_code: '', function_group: '', superclass: '', visibility: 'PUBLIC',
  interfaces: [], target_program: '', enhancement_type: 'SPOT', spot_name: '',
  context: '', rules: [''],
  tables: [], imports: [], exports: [], tables_params: [], exceptions: [],
  attributes: [], methods: []
}

function CreateModal({ onClose, onSaved, user, providers }) {
  const { saveProgram } = useAbapStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [genResult, setGenResult] = useState(null)
  const [genSavedPath, setGenSavedPath] = useState(null)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const steps = STEPS_BY_TYPE[form.type] || STEPS_BY_TYPE.REPORT
  const totalSteps = steps.length
  const isLastStep = step === totalSteps

  const handleGenerate = async () => {
    const active = getActiveProvider(providers)
    console.log('[ABAP-GEN] getActiveProvider =>', active)
    if (!active) {
      console.warn('[ABAP-GEN] Nenhum provider ativo encontrado. providers =>', providers)
      return
    }
    setGenerating(true)
    setGenError(null)
    setGenResult(null)
    setGenSavedPath(null)
    try {
      const userPrompt = buildAbapPrompt(form)
      console.log('[ABAP-GEN] userPrompt (primeiros 300):', userPrompt.slice(0, 300))
      let rawText

      if (active.isIntegration) {
        // Integração CLI: Claude Code ou Codex — roda no processo main
        console.log('[ABAP-GEN] Chamando generateIntegration via IPC...')
        const res = await window.api.generateIntegration({
          integrationType: active.integrationType,
          systemPrompt: abaperPrompt,
          userMessage: userPrompt,
          programName: form.name || 'ABAP_PROGRAM'
        })
        console.log('[ABAP-GEN] IPC response:', { success: res.success, contentLength: res.content?.length, savedTo: res.savedTo, error: res.error })
        if (!res.success) throw new Error(res.error)
        rawText = res.content
        if (res.savedTo) setGenSavedPath(res.savedTo)
      } else {
        // Provedor via API: fluxo padrão
        console.log('[ABAP-GEN] Chamando callAI via API...')
        rawText = await callAI(active, abaperPrompt, userPrompt)
        console.log('[ABAP-GEN] callAI respondeu. rawText length:', rawText?.length)
      }

      const parsed = parseJSONResponse(rawText)
      console.log('[ABAP-GEN] parseJSONResponse OK. files:', parsed?.files?.length)
      setGenResult(parsed)
      notify(
        '✓ Código ABAP gerado',
        `${parsed?.files?.length ?? 0} arquivo(s) gerado(s) — ${form.name || 'programa'}`
      )
    } catch (err) {
      console.error('[ABAP-GEN] ERRO:', err.message)
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!genResult) return
    const res = await saveProgram({
      name: form.name || 'SEM_NOME',
      type: form.type,
      description: form.description || form.context?.slice(0, 100) || '',
      metadata: form,
      result: genResult
    })
    if (res.success) {
      onSaved?.()
      onClose()
    }
  }

  const stepLabel = (i) => {
    if (i === 0) return 'Tipo'
    return steps[i - 1] || ''
  }

  const renderStepContent = () => {
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
      case 'Gerar': return (
        <StepGenerate
          form={form} providers={providers}
          generating={generating} genError={genError} genResult={genResult}
          genSavedPath={genSavedPath}
          onGenerate={handleGenerate}
        />
      )
      default: return null
    }
  }

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
            background: TYPE_COLORS[form.type] || 'var(--sap-primary)',
            padding: '2px 8px', borderRadius: 3
          }}>{form.type}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)' }}>
            Novo Objeto ABAP
          </span>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 18, color: 'var(--sap-subtle)', cursor: 'pointer', lineHeight: 1, padding: '0 4px'
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Step indicator */}
          <div style={{
            width: 176, borderRight: '1px solid var(--sap-border)', padding: '20px 0',
            background: 'var(--sap-bg)', flexShrink: 0, overflowY: 'auto'
          }}>
            {Array.from({ length: totalSteps + 1 }, (_, i) => {
              const done = i < step
              const active = i === step
              const label = stepLabel(i)
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
                  }}>{label}</span>
                </div>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {renderStepContent()}
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

          <div style={{ flex: 1 }} />

          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '7px 18px', fontSize: 13, background: 'transparent',
              border: '1px solid var(--sap-border)', borderRadius: 4,
              color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit'
            }}>‹ Anterior</button>
          )}

          {!isLastStep && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 ? false : false}
              style={{
                padding: '7px 20px', fontSize: 13, fontWeight: 600,
                background: 'var(--sap-primary)', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
              }}>
              Próximo ›
            </button>
          )}

          {isLastStep && genResult && (
            <button onClick={handleSave} style={{
              padding: '7px 22px', fontSize: 13, fontWeight: 600,
              background: '#107e3e', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Salvar
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
  const result = typeof program.result === 'string' ? JSON.parse(program.result) : program.result

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
          {result ? <ResultContent result={result} /> : (
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

// ─── Main View ─────────────────────────────────────────────────────────────────

export default function AbapView() {
  const { programs, loading, loadPrograms, deleteProgram } = useAbapStore()
  const { providers, loadProviders } = useAiStore()
  const { user } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [viewProgram, setViewProgram] = useState(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')

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
      {/* Keyframe spin */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--sap-border)',
        background: 'var(--sap-base)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sap-text)' }}>ABAP Development</div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 1 }}>
            Criação de objetos ABAP assistida por IA
          </div>
        </div>
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
      </div>

      {/* Filters */}
      <div style={{
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
      </div>

      {/* List */}
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

      {showCreate && (
        <CreateModal
          user={user}
          providers={providers}
          onClose={() => setShowCreate(false)}
          onSaved={() => loadPrograms()}
        />
      )}

      {viewProgram && (
        <ResultModal program={viewProgram} onClose={() => setViewProgram(null)} />
      )}
    </div>
  )
}
