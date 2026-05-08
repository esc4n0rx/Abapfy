import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAiStore } from '../store/aiStore'
import { useAuthStore } from '../store/authStore'
import { getActiveProvider, parseDtecResponse } from '../lib/aiClient'
import { useAgentStore } from '../store/agentStore'
import { notify } from '../lib/notify'

const LS_KEY = 'abapfy_dtec_specs'
function loadDtecs() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function saveDtecs(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)) }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const MODULE_COLORS = {
  MM: '#e9730c', FI: '#0070f2', SD: '#107e3e', PP: '#8b5cf6',
  HR: '#c44a00', CO: '#354a5e', BASIS: '#6a6d70', CROSS: '#3399ff'
}

function Section({ label, value, mono }) {
  const [open, setOpen] = useState(true)
  if (!value) return null
  return (
    <div style={{ marginBottom: 16, border: '1px solid var(--sap-border)', borderRadius: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '9px 14px', background: 'var(--sap-bg)', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: open ? '1px solid var(--sap-border)' : 'none'
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)' }}>{label}</span>
        <span style={{ color: 'var(--sap-subtle)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          padding: '12px 14px',
          fontFamily: mono ? '"Cascadia Code","Consolas",monospace' : 'inherit',
          fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.7,
          background: 'var(--sap-base)', whiteSpace: 'pre-wrap'
        }}>
          {value}
        </div>
      )}
    </div>
  )
}

const mdStyle = {
  fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.75,
}
const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--sap-text)', margin: '20px 0 8px', borderBottom: '2px solid var(--sap-border)', paddingBottom: 6 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text)', margin: '18px 0 6px', borderBottom: '1px solid var(--sap-border)', paddingBottom: 4 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text)', margin: '14px 0 4px' }}>{children}</h3>,
  h4: ({ children }) => <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-subtle)', margin: '10px 0 4px' }}>{children}</h4>,
  p:  ({ children }) => <p style={{ margin: '6px 0', color: 'var(--sap-text)' }}>{children}</p>,
  code: ({ inline, children }) => inline
    ? <code style={{ fontFamily: '"Cascadia Code","Consolas",monospace', fontSize: 12, background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', borderRadius: 3, padding: '1px 5px', color: 'var(--sap-primary)' }}>{children}</code>
    : <pre style={{ fontFamily: '"Cascadia Code","Consolas",monospace', fontSize: 12, background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', borderRadius: 6, padding: '10px 14px', overflowX: 'auto', margin: '8px 0', whiteSpace: 'pre-wrap', color: 'var(--sap-text)' }}><code>{children}</code></pre>,
  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, margin: '8px 0' }}>{children}</table>,
  thead: ({ children }) => <thead style={{ background: 'var(--sap-bg)' }}>{children}</thead>,
  th: ({ children }) => <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--sap-subtle)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--sap-border)' }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--sap-border)', color: 'var(--sap-text)', verticalAlign: 'top' }}>{children}</td>,
  blockquote: ({ children }) => <blockquote style={{ margin: '8px 0', padding: '8px 14px', borderLeft: '3px solid var(--sap-primary)', background: 'var(--sap-bg)', borderRadius: '0 4px 4px 0', color: 'var(--sap-subtle)', fontSize: 12 }}>{children}</blockquote>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '3px 0', color: 'var(--sap-text)' }}>{children}</li>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--sap-border)', margin: '16px 0' }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--sap-text)' }}>{children}</strong>,
}

function DtecDetail({ dtec, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const d = dtec.content || {}
  const isMarkdown = !!d._markdown

  const copyAll = () => {
    const text = isMarkdown ? d._markdown : [
      `DOCUMENTAÇÃO TÉCNICA — ${d.object_name || dtec.name}`,
      `Tipo: ${d.object_type || ''}  |  Módulo: ${d.sap_module || ''}`,
      `Data: ${formatDate(dtec.created_at)}`, '',
      `OBJETIVO\n${d.objective || ''}`, '',
      `ESTRUTURA\n${d.structure || ''}`, '',
      `LÓGICA DE PROCESSAMENTO\n${d.processing_logic || ''}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {!isMarkdown && d.sap_module && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: MODULE_COLORS[d.sap_module] || '#6a6d70', padding: '2px 7px', borderRadius: 3 }}>{d.sap_module}</span>
            )}
            {!isMarkdown && d.object_type && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)', background: 'var(--sap-bg)', border: '1px solid var(--sap-border)', padding: '2px 7px', borderRadius: 3 }}>{d.object_type}</span>
            )}
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
              {d.object_name || dtec.name}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>{formatDate(dtec.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyAll} style={{ fontSize: 12, color: 'var(--sap-primary)', background: 'transparent', border: '1px solid var(--sap-primary)', borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Copiar DTec</button>
          <button onClick={() => setConfirmDel(true)} style={{ fontSize: 12, color: '#bb0000', background: 'transparent', border: '1px solid #bb0000', borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
        </div>
      </div>

      {confirmDel && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: '#fff5f5', border: '1px solid #ffd7d7', fontSize: 13, color: '#bb0000', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Excluir <strong>{dtec.name}</strong>?</span>
          <button onClick={() => onDelete(dtec.id)} style={{ marginLeft: 'auto', fontSize: 12, color: '#fff', background: '#bb0000', border: 'none', borderRadius: 4, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
          <button onClick={() => setConfirmDel(false)} style={{ fontSize: 12, color: 'var(--sap-subtle)', background: 'transparent', border: '1px solid var(--sap-border)', borderRadius: 4, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        </div>
      )}

      {isMarkdown ? (
        <div style={mdStyle}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {d._markdown}
          </ReactMarkdown>
        </div>
      ) : (
        <>
          <Section label="Objetivo" value={d.objective} />
          <Section label="Estrutura Técnica" value={d.structure} />
          {d.tables?.length > 0 && (
            <div style={{ marginBottom: 16, border: '1px solid var(--sap-border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', background: 'var(--sap-bg)', borderBottom: '1px solid var(--sap-border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)' }}>Tabelas e Estruturas SAP</span>
              </div>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: 'var(--sap-bg)' }}>
                    {['Tabela', 'Descrição', 'Uso'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--sap-subtle)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--sap-border)' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{d.tables.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--sap-border)' }}>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--sap-primary)' }}>{t.name}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--sap-text)' }}>{t.description}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--sap-subtle)', fontSize: 12 }}>{t.usage}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          <Section label="Parâmetros e Interface" value={d.parameters} />
          <Section label="Lógica de Processamento" value={d.processing_logic} />
          <Section label="Tratamento de Erros" value={d.error_handling} />
          {d.dependencies?.length > 0 && (
            <div style={{ marginBottom: 16, border: '1px solid var(--sap-border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', background: 'var(--sap-bg)', borderBottom: '1px solid var(--sap-border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)' }}>Dependências</span>
              </div>
              <div style={{ padding: 12 }}>
                {d.dependencies.map((dep, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#0070f2', padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>{dep.type}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--sap-text)', flexShrink: 0 }}>{dep.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>— {dep.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Section label="Considerações de Performance" value={d.performance_notes} />
          <Section label="Template — Histórico de Alterações" value={d.change_log_template} mono />
        </>
      )}
    </div>
  )
}

export default function DtecView() {
  const { providers } = useAiStore()
  const { user } = useAuthStore()
  const { getFlowPrompt } = useAgentStore()
  const [dtecs, setDtecs] = useState(() => loadDtecs())
  const [selected, setSelected] = useState(null)
  const [panel, setPanel] = useState('empty') // empty | create | detail
  const [form, setForm] = useState({ code: '', context: '', objectName: '' })
  const [files, setFiles] = useState([])
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    picked.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setFiles(prev => {
          if (prev.find(f => f.name === file.name)) return prev
          return [...prev, { name: file.name, content: ev.target.result }]
        })
      }
      reader.readAsText(file)
    })
    e.target.value = ''
  }

  useEffect(() => {
    if (dtecs.length > 0 && panel === 'empty') {
      setSelected(dtecs[0]); setPanel('detail')
    }
  }, [])

  async function handleGenerate() {
    const hasFiles = files.length > 0
    const hasCode = form.code.trim().length > 0
    const hasContext = form.context.trim().length > 0
    if (!hasFiles && !hasCode && !hasContext) {
      setError('Informe o código ABAP, suba arquivos ou descreva o contexto do objeto.'); return
    }
    const provider = getActiveProvider(providers)
    if (!provider) { setError('Nenhum provedor de IA configurado.'); return }

    setGenerating(true); setError(''); setGeneratedContent(null)
    try {
      let raw = ''

      if (provider.isIntegration) {
        // CLI: salva arquivos em disco para o CLI ter acesso direto
        let cliDir = null
        const allFiles = [
          ...files,
          ...(hasCode ? [{ name: form.objectName ? `${form.objectName}.abap` : 'codigo.abap', content: form.code }] : [])
        ]
        if (allFiles.length > 0) {
          const sessionId = `dtec_${Date.now()}`
          const saved = await window.api.saveReviewFiles({ sessionId, files: allFiles })
          if (saved.success) cliDir = saved.dir
        }

        let userMessage = `Gere a Documentação Técnica (DTec) para o seguinte objeto SAP/ABAP:\n\n`
        if (form.objectName) userMessage += `**Nome do Objeto:** ${form.objectName}\n\n`
        if (hasContext) userMessage += `**Contexto adicional:**\n${form.context.trim()}\n\n`
        if (cliDir) {
          userMessage += `**Arquivos para análise estão na pasta:** ${cliDir}\n`
          userMessage += `Leia os arquivos dessa pasta para gerar a DTec.\n`
        } else if (hasCode) {
          userMessage += `**Código ABAP:**\n\`\`\`abap\n${form.code.trim()}\n\`\`\``
        }

        const res = await window.api.generateIntegration({
          integrationType: provider.integrationType,
          systemPrompt: getFlowPrompt('dtec'),
          userMessage,
          programName: `DTec_${form.objectName || 'objeto'}`
        })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        // API: embute conteúdo dos arquivos na mensagem
        let userMessage = `Gere a Documentação Técnica (DTec) para o seguinte objeto SAP/ABAP:\n\n`
        if (form.objectName) userMessage += `**Nome do Objeto:** ${form.objectName}\n\n`
        if (hasContext) userMessage += `**Contexto adicional:**\n${form.context.trim()}\n\n`

        if (hasFiles) {
          userMessage += `**Arquivos para análise:**\n\n`
          for (const f of files) {
            userMessage += `=== ${f.name} ===\n${f.content}\n\n`
          }
        }
        if (hasCode) {
          userMessage += `**Código ABAP adicional:**\n\`\`\`abap\n${form.code.trim()}\n\`\`\``
        }

        const res = await window.api.generateAI({
          provider: provider.provider,
          apiKey: provider.apiKey,
          model: provider.model,
          systemPrompt: getFlowPrompt('dtec'),
          userMessage
        })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }

      setGeneratedContent(parseDtecResponse(raw))
    } catch (e) { setError(`Erro: ${e.message}`) }
    finally { setGenerating(false) }
  }

  function handleSave() {
    if (!generatedContent) return
    const newDtec = {
      id: `dtec_${Date.now()}`,
      name: generatedContent.object_name || form.objectName || 'DTec sem título',
      content: generatedContent,
      created_at: new Date().toISOString()
    }
    const updated = [newDtec, ...dtecs]
    setDtecs(updated); saveDtecs(updated)
    setSelected(newDtec); setPanel('detail')
    setGeneratedContent(null); setForm({ code: '', context: '', objectName: '' }); setFiles([])
    notify('📄 DTec salva', newDtec.name)
  }

  function handleDelete(id) {
    const updated = dtecs.filter(d => d.id !== id)
    setDtecs(updated); saveDtecs(updated)
    if (updated.length > 0) { setSelected(updated[0]); setPanel('detail') }
    else { setSelected(null); setPanel('empty') }
  }

  const inputStyle = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--sap-border)', borderRadius: 6, background: 'var(--sap-input-bg)', color: 'var(--sap-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--sap-border)', display: 'flex', flexDirection: 'column', background: 'var(--sap-base)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--sap-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text)' }}>📄 Documentação Técnica</div>
          <button onClick={() => { setPanel('create'); setGeneratedContent(null); setError(''); setFiles([]) }} style={{
            background: 'var(--sap-primary)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%'
          }}>+ Nova DTec com IA</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {dtecs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--sap-subtle)', fontSize: 13 }}>Nenhuma DTec criada ainda.</div>
          ) : dtecs.map(d => (
            <div key={d.id} onClick={() => { setSelected(d); setPanel('detail') }} style={{
              padding: '10px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
              background: selected?.id === d.id ? 'var(--sap-active-bg)' : 'transparent',
              border: `1px solid ${selected?.id === d.id ? 'var(--sap-primary)' : 'transparent'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {d.content?.sap_module && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: MODULE_COLORS[d.content.sap_module] || '#6a6d70', padding: '1px 5px', borderRadius: 3 }}>
                    {d.content.sap_module}
                  </span>
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--sap-subtle)' }}>{formatDate(d.created_at)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--sap-bg)' }}>
        {panel === 'empty' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--sap-subtle)', padding: 40 }}>
            <div style={{ fontSize: 52 }}>📄</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--sap-text)' }}>Documentação Técnica</div>
            <div style={{ fontSize: 14, color: 'var(--sap-subtle)', textAlign: 'center', maxWidth: 360 }}>
              Gere documentação técnica SAP/ABAP completa a partir do código. Cole o código e a IA documenta estrutura, tabelas, lógica e dependências.
            </div>
            <button onClick={() => { setPanel('create'); setGeneratedContent(null); setError(''); setFiles([]) }} style={{ background: 'var(--sap-primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              + Nova DTec com IA
            </button>
          </div>
        )}

        {panel === 'create' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
            <div style={{ maxWidth: 760 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--sap-text)', margin: '0 0 4px' }}>Nova Documentação Técnica</h1>
              <p style={{ fontSize: 13, color: 'var(--sap-subtle)', margin: '0 0 24px' }}>Cole o código ABAP e a IA gera a DTec completa.</p>

              {!generatedContent ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>Nome do Objeto (opcional)</label>
                    <input value={form.objectName} onChange={e => setForm(f => ({ ...f, objectName: e.target.value }))} placeholder="Ex: ZRE_PEDIDOS_PENDENTES" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>Contexto / Descrição (opcional)</label>
                    <textarea value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                      rows={3} placeholder="Descreva brevemente o propósito do objeto, módulo SAP, usuários..."
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                  {/* File upload */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>
                      Arquivos ABAP
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".abap,.txt,.prog,.fugr,.clas,.intf,.func,.incl"
                      onChange={handleFiles}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '7px 14px', borderRadius: 4, border: '1px dashed var(--sap-border)',
                        background: 'var(--sap-bg)', color: 'var(--sap-subtle)', fontSize: 12,
                        cursor: 'pointer', marginBottom: files.length ? 8 : 0, fontFamily: 'inherit'
                      }}
                    >
                      + Adicionar arquivo(s)
                    </button>
                    {files.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {files.map(f => (
                          <span key={f.name} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 12, fontSize: 12,
                            background: 'var(--sap-hover-bg)', border: '1px solid var(--sap-border)',
                            color: 'var(--sap-text)', fontFamily: 'monospace'
                          }}>
                            {f.name}
                            <span
                              onClick={() => setFiles(p => p.filter(x => x.name !== f.name))}
                              style={{ cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 14 }}
                            >×</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Code paste — optional complement */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>
                      Código ABAP
                      <span style={{ fontSize: 11, color: 'var(--sap-subtle)', fontWeight: 400, marginLeft: 6 }}>
                        (opcional — ou cole aqui se preferir não subir arquivo)
                      </span>
                    </label>
                    <textarea value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      rows={10} placeholder="Cole o código ABAP aqui..."
                      style={{ ...inputStyle, fontFamily: '"Cascadia Code","Consolas",monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                  {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 6, background: '#fff0f0', border: '1px solid #ffcccc', color: '#bb0000', fontSize: 13 }}>{error}</div>}
                  <button onClick={handleGenerate} disabled={generating} style={{
                    background: generating ? 'var(--sap-subtle)' : 'var(--sap-primary)', color: '#fff',
                    border: 'none', borderRadius: 6, padding: '10px 28px', fontSize: 14, fontWeight: 500,
                    cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    {generating ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Gerando DTec...</> : '✦ Gerar com IA'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: '#f0faf4', border: '1px solid #b7e4c7', color: '#107e3e', fontSize: 13 }}>
                    ✓ DTec gerada com sucesso. Revise e salve.
                  </div>
                  <DtecDetail dtec={{ id: 'preview', name: generatedContent.object_name || form.objectName || 'Preview', content: generatedContent, created_at: new Date().toISOString() }} onDelete={() => {}} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={handleSave} style={{ background: '#107e3e', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>💾 Salvar DTec</button>
                    <button onClick={() => { setGeneratedContent(null); setFiles([]) }} style={{ background: 'transparent', color: 'var(--sap-subtle)', border: '1px solid var(--sap-border)', borderRadius: 6, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>↺ Refazer</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {panel === 'detail' && selected && (
          <DtecDetail dtec={selected} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}
