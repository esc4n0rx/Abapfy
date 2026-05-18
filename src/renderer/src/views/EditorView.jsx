import React, { useState, useEffect, useRef } from 'react'
import { useAiStore } from '../store/aiStore'
import { useEditorStore } from '../store/editorStore'
import { getActiveProvider } from '../lib/aiClient'
import { notify } from '../lib/notify'
import { useAgentStore } from '../store/agentStore'
import AbapHighlight from '../components/AbapHighlight'
import { cleanEfForPrompt, efDataToSessionFields } from '../lib/efUtils'

// ─── SAP Versions ──────────────────────────────────────────────────────────────
const SAP_VERSIONS = [
  { value: 'ECC_60',      label: 'ECC 6.0',       desc: 'Sintaxe clássica' },
  { value: 'ECC_60_EHP7', label: 'ECC 6.0 EHP7+', desc: 'Sintaxe 7.40' },
  { value: 'S4HANA_2021', label: 'S/4HANA 2021',  desc: '' },
  { value: 'S4HANA_2023', label: 'S/4HANA 2023',  desc: '' },
  { value: 'S4HANA_2024', label: 'S/4HANA 2024',  desc: '' },
  { value: 'BTP_CLOUD',   label: 'BTP / Cloud',    desc: 'Clean ABAP' },
]

const getSapLabel = (value) =>
  SAP_VERSIONS.find(v => v.value === value)?.label || value || 'SAP'

// ─── Build first editor message ────────────────────────────────────────────────
function buildFirstMessage(session, files) {
  const sapEntry = SAP_VERSIONS.find(v => v.value === session.sap_version)
  const sapLabel = sapEntry
    ? `${sapEntry.label}${sapEntry.desc ? ` — ${sapEntry.desc}` : ''}`
    : session.sap_version

  let msg = ''

  // Modo EF puro: EF carregada sem arquivos de programa
  if (session.ef_data && (!files || files.length === 0)) {
    const efLabel = session.ef_data.formato === 'delta' ? 'Delta EF (Alteração)' : 'Especificação Funcional'
    msg += `Analise a ${efLabel} abaixo e aplique as modificações especificadas no programa ABAP.\n\n`
    msg += `**Versão SAP:** ${sapLabel}\n\n`
    if (session.context?.trim()) msg += `**Descrição resumida:**\n${session.context.trim()}\n\n`
    const efContent = cleanEfForPrompt(session.ef_data.rawText, session.ef_data.formato)
    if (efContent) msg += `**Conteúdo da ${efLabel}:**\n\`\`\`\n${efContent}\n\`\`\`\n\n`
    if (session.ef_data.formato === 'delta') {
      msg += `*Observação: Esta é uma EF de Delta/Alteração — o programa já existe e deve ser modificado conforme especificado.*\n\n`
    }
    return msg
  }

  // Modo Manual / Híbrido (arquivos + EF opcional)
  msg = 'Analise os programas abaixo e aplique as modificações conforme o contexto fornecido.\n\n'
  msg += `**Versão SAP:** ${sapLabel}\n\n`
  if (session.context?.trim())        msg += `**Contexto / Objetivo:**\n${session.context.trim()}\n\n`
  if (session.business_rules?.trim()) msg += `**Regras de Negócio:**\n${session.business_rules.trim()}\n\n`

  // EF carregada como referência complementar
  if (session.ef_data) {
    const efLabel = session.ef_data.formato === 'delta' ? 'Delta EF (Alteração)' : 'Especificação Funcional'
    const efContent = cleanEfForPrompt(session.ef_data.rawText, session.ef_data.formato)
    if (efContent) {
      msg += `**Especificação Funcional de Referência (${efLabel}):**\n\`\`\`\n${efContent}\n\`\`\`\n\n`
    }
  }

  if (files?.length) {
    msg += `**Arquivos do Programa:**\n\n`
    for (const f of files) {
      msg += `=== ${f.name} ===\n${f.content}\n\n`
    }
  }
  return msg
}

// ─── Build CLI prompt ──────────────────────────────────────────────────────────
function buildCLIPrompt(session, newUserText, cliDir) {
  let prompt = ''
  if (cliDir) {
    prompt += `Os arquivos do programa estão na pasta: ${cliDir}\nLeia os arquivos nessa pasta.\n\n`
  }
  const sapEntry = SAP_VERSIONS.find(v => v.value === session.sap_version)
  const sapLabel = sapEntry
    ? `${sapEntry.label}${sapEntry.desc ? ` — ${sapEntry.desc}` : ''}`
    : session.sap_version
  prompt += `**Versão SAP:** ${sapLabel}\n\n`
  if (session.context?.trim())        prompt += `**Contexto / Objetivo:**\n${session.context.trim()}\n\n`
  if (session.business_rules?.trim()) prompt += `**Regras de Negócio:**\n${session.business_rules.trim()}\n\n`

  const history = session.messages || []
  if (history.length > 0) {
    prompt += `**Histórico da conversa:**\n`
    for (const m of history) {
      const role = m.role === 'user' ? 'Usuário' : 'Assistente'
      prompt += `${role}: ${(m.content || '').slice(0, 800)}\n\n`
    }
  }
  prompt += `**Nova mensagem:**\n${newUserText}`
  return prompt
}

// ─── Markdown / ABAP renderer ──────────────────────────────────────────────────
function parseBlocks(text) {
  const segments = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) })
    segments.push({ type: 'code', lang: (m[1] || 'abap').toLowerCase(), content: m[2].replace(/\n$/, '') })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })
  return segments
}

function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, m, idx = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={idx++}>{text.slice(last, m.index)}</span>)
    if (m[2] !== undefined)      parts.push(<strong key={idx++} style={{ color: 'var(--sap-text)', fontWeight: 700 }}>{m[2]}</strong>)
    else if (m[3] !== undefined) parts.push(<em key={idx++}>{m[3]}</em>)
    else                         parts.push(
      <code key={idx++} style={{
        fontFamily: 'monospace', fontSize: '0.9em',
        background: 'var(--sap-hover-bg)', padding: '1px 5px',
        borderRadius: 3, color: 'var(--sap-primary, #0070f2)'
      }}>{m[4]}</code>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>)
  return parts.length ? parts : text
}

function renderTextLine(line, key) {
  // H1
  if (/^#\s+/.test(line)) return (
    <div key={key} style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text)', margin: '18px 0 8px', lineHeight: 1.4 }}>
      {renderInline(line.replace(/^#\s+/, ''))}
    </div>
  )
  // H2 / H3
  if (/^#{2,3}\s+/.test(line)) return (
    <div key={key} style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text)', margin: '14px 0 6px', lineHeight: 1.4 }}>
      {renderInline(line.replace(/^#+\s+/, ''))}
    </div>
  )
  // HR
  if (/^---+$/.test(line.trim())) return (
    <hr key={key} style={{ border: 'none', borderTop: '1px solid var(--sap-border)', margin: '10px 0' }} />
  )
  // Checklist - [ ] / - [x]
  if (/^-\s+\[.\]\s+/.test(line)) {
    const done = /^-\s+\[x\]/i.test(line)
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3, fontSize: 13 }}>
        <span style={{ color: done ? '#107e3e' : 'var(--sap-subtle)', flexShrink: 0, fontSize: 14 }}>{done ? '☑' : '☐'}</span>
        <span style={{ lineHeight: 1.5, color: 'var(--sap-text)' }}>{renderInline(line.replace(/^-\s+\[.\]\s+/, ''))}</span>
      </div>
    )
  }
  // List item
  if (/^[-*•]\s+/.test(line)) return (
    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2, paddingLeft: 4 }}>
      <span style={{ color: 'var(--sap-subtle)', flexShrink: 0, marginTop: 3, fontSize: 10 }}>●</span>
      <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sap-text)' }}>{renderInline(line.replace(/^[-*•]\s+/, ''))}</span>
    </div>
  )
  // Empty line
  if (!line.trim()) return <div key={key} style={{ height: 5 }} />
  // Paragraph
  return (
    <div key={key} style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.65, marginBottom: 1 }}>
      {renderInline(line)}
    </div>
  )
}

function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false)
  const isAbap = !lang || lang === 'abap'

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      marginBottom: 12, borderRadius: 6, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 12px', background: '#161b22',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#4d9ef7',
          textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace'
        }}>
          {lang || 'ABAP'}
        </span>
        <button
          onClick={copy}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: copied ? '#3fb950' : '#8b949e',
            fontWeight: 600, padding: '2px 8px', borderRadius: 3,
            transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          {copied ? '✓ Copiado!' : '⊞ Copiar'}
        </button>
      </div>
      {/* Code body */}
      <div style={{ background: '#0d1117' }}>
        {isAbap
          ? <AbapHighlight code={content} maxHeight={520} />
          : (
            <pre style={{
              margin: 0, padding: '12px 16px',
              fontFamily: '"Cascadia Code","Consolas","Courier New",monospace',
              fontSize: 12, lineHeight: 1.65, color: '#e6edf3',
              overflowX: 'auto', whiteSpace: 'pre', tabSize: 2
            }}>{content}</pre>
          )
        }
      </div>
    </div>
  )
}

function MarkdownRenderer({ text }) {
  const segments = parseBlocks(text)
  return (
    <div style={{ width: '100%' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'code') return <CodeBlock key={i} lang={seg.lang} content={seg.content} />
        return (
          <div key={i}>
            {seg.content.split('\n').map((line, j) => renderTextLine(line, j))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Message Bubbles ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{
          maxWidth: '70%', padding: '10px 14px',
          borderRadius: '12px 12px 2px 12px',
          background: 'var(--sap-primary, #0070f2)', color: '#fff',
          fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word'
        }}>
          {msg._isFirstMsg
            ? `[Sessão iniciada com ${msg._fileCount || 0} arquivo(s)]`
            : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          }
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
      <div style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: '2px 12px 12px 12px',
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        fontSize: 13, lineHeight: 1.5
      }}>
        <MarkdownRenderer text={msg.content} />
      </div>
    </div>
  )
}

function parseStreamingSections(text) {
  const sections = []
  const re = /(?:={3,}\s*(.+?)\s*={3,}|^#{2,3}\s+(.+))/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const name = (m[1] || m[2]).trim()
    if (name && !sections.includes(name)) sections.push(name)
  }
  return sections
}

function StreamingBubble({ text }) {
  const sections = parseStreamingSections(text)
  const done    = sections.slice(0, -1)
  const current = sections[sections.length - 1] || null

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
      <div style={{
        width: '100%',
        padding: '14px 18px',
        borderRadius: '2px 12px 12px 12px',
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-primary, #0070f2)',
        fontSize: 13, lineHeight: 1.5, color: 'var(--sap-text)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* Seções já concluídas */}
          {done.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#3fb950', fontSize: 13, flexShrink: 0 }}>✓</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--sap-subtle)' }}>{s}</span>
              <span style={{ fontSize: 11, color: '#3fb950' }}>finalizado</span>
            </div>
          ))}

          {/* Seção em andamento ou indicador genérico */}
          {current ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                border: '2px solid var(--sap-primary, #0070f2)',
                borderTopColor: 'transparent',
                animation: 'editorSpin 0.8s linear infinite', flexShrink: 0
              }} />
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--sap-text)', fontWeight: 600 }}>{current}</span>
              <span style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>
                trabalhando<span style={{ animation: 'blink 1s step-end infinite' }}>...</span>
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sap-subtle)' }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                border: '2px solid var(--sap-primary, #0070f2)',
                borderTopColor: 'transparent',
                animation: 'editorSpin 0.8s linear infinite', flexShrink: 0
              }} />
              <span style={{ fontSize: 13 }}>
                Editando<span style={{ animation: 'blink 1s step-end infinite' }}>...</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── New Session Modal ─────────────────────────────────────────────────────────
function NewSessionModal({ onClose, onCreate }) {
  const [mode, setMode]             = useState('manual')
  const [name, setName]             = useState('')
  const [sapVersion, setSapVersion] = useState('ECC_60')
  const [context, setContext]       = useState('')
  const [businessRules, setBusinessRules] = useState('')
  const [files, setFiles]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [efData, setEfData]         = useState(null)
  const [efLoading, setEfLoading]   = useState(false)
  const [efError, setEfError]       = useState(null)
  const fileInputRef = useRef(null)

  const handleFiles = (e) => {
    Array.from(e.target.files || []).forEach(file => {
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

  const handleLoadEf = async () => {
    setEfLoading(true)
    setEfError(null)
    try {
      const res = await window.api.readEfDocx()
      if (res?.success) {
        setEfData(res)
        const fields = efDataToSessionFields(res)
        if (fields.sessionName)   setName(fields.sessionName)
        if (fields.context)       setContext(fields.context)
        if (fields.businessRules) setBusinessRules(fields.businessRules)
      } else if (res?.docLegacy) {
        setEfError(res.error)
      } else if (!res?.canceled && res?.error) {
        setEfError(`Erro ao carregar EF: ${res.error}`)
      }
    } finally {
      setEfLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim() || loading) return
    setLoading(true)
    const payload = {
      name: name.trim(),
      sap_version: sapVersion,
      context,
      business_rules: businessRules,
      files,
      ef_data: efData ? {
        rawText:  efData.rawText,
        formato:  efData.formato,
        fileName: efData.fileName,
        images:   efData.images || []
      } : null
    }
    await onCreate(payload)
    setLoading(false)
  }

  const canSubmit = name.trim() && !loading && (
    mode === 'manual' || (mode === 'ef' && efData)
  )

  // ── Shared sub-components ──────────────────────────────────────────────────

  const EfBadge = () => efData ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--sap-positive)', fontWeight: 600 }}>
        ✓ {efData.fileName}
      </span>
      <span style={{
        fontSize: 10, padding: '1px 7px', borderRadius: 8, fontWeight: 600,
        background: efData.formato === 'delta' ? 'rgba(233,115,12,0.12)' : 'rgba(0,112,242,0.1)',
        color: efData.formato === 'delta' ? '#e9730c' : 'var(--sap-primary, #0070f2)'
      }}>
        {efData.formato === 'delta' ? 'Delta EF' : 'EF Clássica'}
      </span>
      <span
        onClick={() => setEfData(null)}
        style={{ fontSize: 11, color: 'var(--sap-subtle)', cursor: 'pointer', textDecoration: 'underline' }}
      >remover</span>
    </div>
  ) : null

  const FileChips = () => files.length > 0 ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
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
            style={{ cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 15, lineHeight: 1 }}
          >×</span>
        </span>
      ))}
    </div>
  ) : null

  const btnBase = {
    padding: '8px 14px', borderRadius: 5, fontSize: 12,
    display: 'flex', alignItems: 'center', gap: 6,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s'
  }
  const btnOutline = {
    ...btnBase,
    border: '1px dashed var(--sap-border)',
    background: 'var(--sap-bg)', color: 'var(--sap-subtle)'
  }
  const btnEfActive = {
    ...btnBase,
    border: '1px solid #e9730c',
    background: 'rgba(233,115,12,0.06)', color: '#e9730c', fontWeight: 600
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'var(--sap-base)', borderRadius: 10, width: 620,
        maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto',
        border: '1px solid var(--sap-border)', boxShadow: '0 12px 48px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--sap-border)'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sap-text)' }}>Nova Sessão — Editor SAP</div>
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2 }}>Edição incremental de programas ABAP com IA</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--sap-subtle)', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".abap,.txt,.prog,.fugr,.clas,.intf,.doma,.dtel,.tabl,.ddic,.js,.py,.go,.java,.cs,.cpp,.c,.h,.xml,.json"
            onChange={handleFiles}
            style={{ display: 'none' }}
          />

          {/* ── Mode selector ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em', marginBottom: 10 }}>
              MODO DE OPERAÇÃO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div
                onClick={() => setMode('manual')}
                style={{
                  padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${mode === 'manual' ? 'var(--sap-primary, #0070f2)' : 'var(--sap-border)'}`,
                  background: mode === 'manual' ? 'var(--sap-active-bg)' : 'var(--sap-bg)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sap-text)', marginBottom: 4 }}>Modo Manual</div>
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', lineHeight: 1.5 }}>
                  Carregue arquivos e defina contexto manualmente. EF opcional.
                </div>
              </div>
              <div
                onClick={() => setMode('ef')}
                style={{
                  padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${mode === 'ef' ? '#e9730c' : 'var(--sap-border)'}`,
                  background: mode === 'ef' ? 'rgba(233,115,12,0.06)' : 'var(--sap-bg)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sap-text)', marginBottom: 4 }}>Carregar EF</div>
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', lineHeight: 1.5 }}>
                  EF como base principal. Arquivos do programa opcionais.
                </div>
              </div>
            </div>
          </div>

          {/* ── Modo Manual: arquivos + EF opcional ── */}
          {mode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em' }}>
                ARQUIVOS E CONTEXTO
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => fileInputRef.current?.click()} style={btnOutline}>
                  ⊕ Carregar Arquivos
                </button>
                <button
                  onClick={handleLoadEf}
                  disabled={efLoading}
                  style={efData ? btnEfActive : btnOutline}
                >
                  {efLoading ? '⏳ Carregando...' : efData ? '📄 EF carregada' : '📄 Carregar EF (opcional)'}
                </button>
              </div>
              <FileChips />
              {efData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <EfBadge />
                  <div style={{ fontSize: 11, color: 'var(--sap-subtle)', padding: '6px 10px', background: 'var(--sap-bg)', borderRadius: 5, lineHeight: 1.5 }}>
                    A EF será usada como referência complementar junto com os arquivos.
                  </div>
                </div>
              )}
              {efError && <div style={{ fontSize: 12, color: '#bb0000' }}>⚠ {efError}</div>}
              {files.length === 0 && !efData && (
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', lineHeight: 1.5 }}>
                  Você também pode enviar o código diretamente no chat após criar a sessão.
                </div>
              )}
            </div>
          )}

          {/* ── Modo EF: EF padrão + arquivos opcionais ── */}
          {mode === 'ef' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em' }}>
                ESPECIFICAÇÃO FUNCIONAL E ARQUIVOS
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleLoadEf}
                  disabled={efLoading}
                  style={efData ? btnEfActive : { ...btnOutline, border: '1px dashed #e9730c', color: '#e9730c' }}
                >
                  {efLoading ? '⏳ Carregando...' : efData ? '📄 EF carregada' : '📄 Carregar EF (padrão)'}
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={btnOutline}>
                  ⊕ Carregar Arquivos
                </button>
              </div>
              {efData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <EfBadge />
                  <div style={{ fontSize: 11, color: 'var(--sap-subtle)', padding: '6px 10px', background: 'var(--sap-bg)', borderRadius: 5, lineHeight: 1.5 }}>
                    Contexto e regras preenchidos automaticamente. Ajuste abaixo se necessário.
                  </div>
                </div>
              )}
              <FileChips />
              {efError && <div style={{ fontSize: 12, color: '#bb0000' }}>⚠ {efError}</div>}
              {!efData && (
                <div style={{ fontSize: 11, color: '#e9730c', lineHeight: 1.5 }}>
                  Carregue ao menos uma EF (.docx) para iniciar neste modo.
                </div>
              )}
            </div>
          )}

          {/* ── Nome da sessão ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              NOME DA SESSÃO *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Adicionar validação CFOP — ZPEDIDOS_ALV"
              autoFocus
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 5,
                border: `1px solid ${name.trim() ? 'var(--sap-primary, #0070f2)' : 'var(--sap-border)'}`,
                background: 'var(--sap-bg)', color: 'var(--sap-text)',
                fontSize: 13, boxSizing: 'border-box', outline: 'none',
                transition: 'border-color 0.15s'
              }}
            />
          </div>

          {/* ── Versão SAP ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              VERSÃO SAP
            </label>
            <select
              value={sapVersion}
              onChange={e => setSapVersion(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 5,
                border: '1px solid var(--sap-border)',
                background: 'var(--sap-bg)', color: 'var(--sap-text)',
                fontSize: 13, boxSizing: 'border-box', cursor: 'pointer', outline: 'none'
              }}
            >
              {SAP_VERSIONS.map(v => (
                <option key={v.value} value={v.value}>
                  {v.label}{v.desc ? ` — ${v.desc}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Contexto ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              CONTEXTO / OBJETIVO DA MODIFICAÇÃO
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Descreva o que deseja modificar, melhorar ou corrigir no programa..."
              rows={3}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 5,
                border: '1px solid var(--sap-border)',
                background: 'var(--sap-bg)', color: 'var(--sap-text)',
                fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit', lineHeight: 1.5, outline: 'none'
              }}
            />
          </div>

          {/* ── Regras de negócio ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', letterSpacing: '0.06em', display: 'block', marginBottom: 7 }}>
              REGRAS DE NEGÓCIO
            </label>
            <textarea
              value={businessRules}
              onChange={e => setBusinessRules(e.target.value)}
              placeholder={'Ex:\n• CFOP deve estar na tabela J_1BCFOP\n• Validar antes de gravar\n• Manter log de alterações'}
              rows={3}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 5,
                border: '1px solid var(--sap-border)',
                background: 'var(--sap-bg)', color: 'var(--sap-text)',
                fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit', lineHeight: 1.5, outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
          padding: '14px 24px', borderTop: '1px solid var(--sap-border)'
        }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 5,
            border: '1px solid var(--sap-border)', background: 'transparent',
            color: 'var(--sap-text)', fontSize: 13, cursor: 'pointer'
          }}>Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 22px', borderRadius: 5, border: 'none',
              background: canSubmit ? 'var(--sap-primary, #0070f2)' : 'var(--sap-border)',
              color: '#fff', fontSize: 13,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 600, transition: 'background 0.15s'
            }}
          >
            {loading ? 'Iniciando...' : '✏️ Iniciar Edição'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Session Item ──────────────────────────────────────────────────────────────
function SessionItem({ session, active, onSelect, onDelete }) {
  const [hover, setHover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const msgCount = session.messages?.length || 0
  const sapLabel = getSapLabel(session.sap_version)
  const trocas = Math.floor(msgCount / 2)

  return (
    <div
      onClick={() => onSelect(session.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDelete(false) }}
      style={{
        padding: '10px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 3,
        background: active ? 'var(--sap-active-bg)' : hover ? 'var(--sap-hover-bg)' : 'transparent',
        borderLeft: active ? '3px solid var(--sap-primary, #0070f2)' : '3px solid transparent',
        transition: 'all 0.1s', position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{
          fontWeight: active ? 600 : 400, fontSize: 13,
          color: active ? 'var(--sap-primary, #0070f2)' : 'var(--sap-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
        }}>
          {session.name}
        </div>
        {hover && (
          confirmDelete
            ? <span onClick={e => { e.stopPropagation(); onDelete(session.id) }} style={{ fontSize: 11, color: '#bb2222', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>Confirmar</span>
            : <span onClick={e => { e.stopPropagation(); setConfirmDelete(true) }} style={{ fontSize: 14, color: 'var(--sap-subtle)', cursor: 'pointer', flexShrink: 0 }}>⊗</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
          background: 'rgba(0,112,242,0.1)', color: 'var(--sap-primary, #0070f2)',
          flexShrink: 0
        }}>{sapLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>
          {trocas > 0 ? `${trocas} troca${trocas > 1 ? 's' : ''}` : 'Novo'}
        </span>
        {session.files?.length > 0 && (
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: 'var(--sap-hover-bg)', color: 'var(--sap-subtle)'
          }}>
            {session.files.length} arq.
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main EditorView ────────────────────────────────────────────────────────────
export default function EditorView() {
  const { providers, loadProviders } = useAiStore()
  const { getFlowPrompt } = useAgentStore()
  const { sessions, loading, loadSessions, createSession, updateMessages, deleteSession } = useEditorStore()

  const [activeId, setActiveId]   = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [inputText, setInputText] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [error, setError]         = useState(null)

  const messagesEndRef  = useRef(null)
  const streamAccumRef  = useRef('')
  const textareaRef     = useRef(null)

  const activeSession = sessions.find(s => s.id === activeId) || null

  useEffect(() => {
    loadSessions()
    loadProviders()
    return () => { window.api?.removeStreamListeners?.() }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages?.length, streamText])

  // ─── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (session, userText, filesForFirstMsg = null) => {
    const active = getActiveProvider(providers)
    if (!active) {
      setError('Nenhum provedor de IA ativo. Configure um provedor em Configurações.')
      return
    }
    setError(null)

    const isFirst = filesForFirstMsg != null
    const userContent = isFirst ? buildFirstMessage(session, filesForFirstMsg) : userText
    const userMsg = {
      role: 'user',
      content: userContent,
      _isFirstMsg: isFirst,
      _fileCount: filesForFirstMsg?.length || 0
    }

    const prevMessages = session.messages || []
    const newMessages  = [...prevMessages, userMsg]
    await updateMessages(session.id, newMessages)

    // ── CLI flow ─────────────────────────────────────────────────────────────
    if (active.isIntegration) {
      setStreaming(true)
      setStreamText('')
      try {
        let cliDir = null
        if (isFirst && filesForFirstMsg?.length) {
          const saved = await window.api.saveReviewFiles({ sessionId: session.id, files: filesForFirstMsg })
          if (saved.success) cliDir = saved.dir
        } else {
          const dirInfo = await window.api.getReviewDir({ sessionId: session.id })
          if (dirInfo.exists) cliDir = dirInfo.dir
        }
        const fullPrompt = buildCLIPrompt(
          session,
          userText || `Analise e edite conforme o contexto: ${session.context}`,
          cliDir
        )
        const res = await window.api.generateIntegration({
          integrationType: active.integrationType,
          systemPrompt: getFlowPrompt('editor'),
          userMessage: fullPrompt,
          programName: `Editor_${session.name}`
        })
        await updateMessages(session.id, [
          ...newMessages,
          { role: 'assistant', content: res.success ? (res.content || '(sem resposta)') : `Erro: ${res.error}` }
        ])
      } finally {
        setStreaming(false)
        setStreamText('')
      }
      return
    }

    // ── API streaming ─────────────────────────────────────────────────────────
    setStreaming(true)
    setStreamText('')
    streamAccumRef.current = ''
    window.api.removeStreamListeners()

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

    window.api.onStreamChunk(({ text }) => {
      streamAccumRef.current += text
      setStreamText(streamAccumRef.current)
    })

    window.api.onStreamDone(async () => {
      const finalText = streamAccumRef.current
      setStreaming(false)
      setStreamText('')
      streamAccumRef.current = ''
      await updateMessages(session.id, [
        ...newMessages,
        { role: 'assistant', content: finalText }
      ])
      window.api.removeStreamListeners()
      if (isFirst) notify('✏️ Editor SAP', session?.name || 'Edição concluída')
    })

    window.api.onStreamError(async ({ error: err }) => {
      const partial = streamAccumRef.current
      setStreaming(false)
      setStreamText('')
      streamAccumRef.current = ''
      window.api.removeStreamListeners()

      if (partial.trim()) {
        await updateMessages(session.id, [
          ...newMessages,
          {
            role: 'assistant',
            content: partial + '\n\n---\n⚠️ **Resposta interrompida** — limite de tokens ou erro de conexão. Peça para continuar a partir do último ponto.'
          }
        ])
      } else {
        setError(`Erro no streaming: ${err}`)
      }
    })

    const maxTokensMap = { claude: 16000, openai: 16384, groq: 8192, gemini: 16384 }
    window.api.streamStart({
      provider:     active.provider,
      apiKey:       active.apiKey,
      model:        active.model,
      systemPrompt: getFlowPrompt('editor'),
      messages:     apiMessages,
      maxTokens:    maxTokensMap[active.provider] ?? 8192
    })
  }

  const handleCreate = async (payload) => {
    const res = await createSession(payload)
    if (!res.success) { setError(res.error); return }
    setActiveId(res.session.id)
    setShowModal(false)
    // ef_data não é persistido no banco — injeta só para a primeira mensagem
    const sessionWithEf = payload.ef_data
      ? { ...res.session, ef_data: payload.ef_data }
      : res.session
    await sendMessage(sessionWithEf, null, payload.files || [])
  }

  const handleSend = async () => {
    if (!inputText.trim() || !activeSession || streaming) return
    const text = inputText.trim()
    setInputText('')
    textareaRef.current?.focus()
    await sendMessage(activeSession, text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const sapLabel = activeSession ? getSapLabel(activeSession.sap_version) : ''

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Sessions panel ── */}
      <div style={{
        width: 260, flexShrink: 0,
        borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--sap-base)', overflow: 'hidden'
      }}>
        {/* Panel header */}
        <div style={{
          padding: '14px 14px 10px', borderBottom: '1px solid var(--sap-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--sap-text)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16, opacity: 0.8 }}>✏️</span>
            Editor
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '4px 12px', borderRadius: 4, border: 'none',
              background: 'var(--sap-primary, #0070f2)', color: '#fff',
              fontSize: 12, cursor: 'pointer', fontWeight: 600
            }}
          >+ Nova</button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--sap-subtle)', fontSize: 12, padding: 16 }}>
              Carregando...
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <div style={{
              textAlign: 'center', color: 'var(--sap-subtle)',
              fontSize: 12, padding: '28px 16px', lineHeight: 1.8
            }}>
              Nenhuma sessão ainda.<br />
              <span
                onClick={() => setShowModal(true)}
                style={{ color: 'var(--sap-primary, #0070f2)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Criar primeira sessão
              </span>
            </div>
          )}
          {sessions.map(s => (
            <SessionItem
              key={s.id}
              session={s}
              active={s.id === activeId}
              onSelect={setActiveId}
              onDelete={deleteSession}
            />
          ))}
        </div>
      </div>

      {/* ── Main chat panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeSession ? (
          /* ── Empty state ── */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 14, color: 'var(--sap-subtle)', padding: 40
          }}>
            <div style={{ fontSize: 56 }}>✏️</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sap-text)' }}>Editor SAP</div>
            <div style={{
              fontSize: 13, textAlign: 'center', maxWidth: 340,
              lineHeight: 1.8, color: 'var(--sap-subtle)'
            }}>
              Edite programas ABAP de forma incremental com IA.<br />
              Carregue os arquivos, defina contexto e receba as alterações organizadas por bloco com syntax highlight e suporte a chat contínuo.
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                marginTop: 6, padding: '10px 26px', borderRadius: 6, border: 'none',
                background: 'var(--sap-primary, #0070f2)', color: '#fff',
                fontSize: 14, cursor: 'pointer', fontWeight: 600,
                boxShadow: '0 2px 12px rgba(0,112,242,0.3)'
              }}
            >
              + Nova Sessão
            </button>
          </div>
        ) : (
          <>
            {/* ── Session header ── */}
            <div style={{
              padding: '11px 20px', borderBottom: '1px solid var(--sap-border)',
              background: 'var(--sap-base)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  fontWeight: 700, fontSize: 15, color: 'var(--sap-text)',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {activeSession.name}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 4,
                  background: 'rgba(0,112,242,0.1)', color: 'var(--sap-primary, #0070f2)',
                  border: '1px solid rgba(0,112,242,0.18)', flexShrink: 0
                }}>
                  {sapLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {activeSession.context && (
                  <span style={{
                    fontSize: 12, color: 'var(--sap-subtle)',
                    flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {activeSession.context.slice(0, 120)}{activeSession.context.length > 120 ? '…' : ''}
                  </span>
                )}
                {activeSession.files?.map(f => (
                  <span key={f.name} style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    background: 'var(--sap-hover-bg)', color: 'var(--sap-subtle)',
                    fontFamily: 'monospace', flexShrink: 0
                  }}>{f.name}</span>
                ))}
              </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
              <div style={{
                padding: '8px 20px', background: '#fff5f5',
                borderBottom: '1px solid #ffd7d7',
                fontSize: 13, color: '#bb2222',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>{error}</span>
                <span onClick={() => setError(null)} style={{ cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>✕</span>
              </div>
            )}

            {/* ── Messages ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {(activeSession.messages || []).length === 0 && !streaming && (
                <div style={{
                  textAlign: 'center', color: 'var(--sap-subtle)',
                  fontSize: 13, padding: 40, lineHeight: 1.8
                }}>
                  Sessão criada. Aguardando resposta do agente...
                </div>
              )}
              {(activeSession.messages || []).map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {streaming && <StreamingBubble text={streamText} />}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input area ── */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--sap-border)',
              background: 'var(--sap-base)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  placeholder={
                    streaming
                      ? 'Aguardando resposta...'
                      : 'Ex: "No INCLUDE_001 linha 42 deu erro Y"  •  "Adicione validação no FORM_X"  •  "Explique o bloco Z"'
                  }
                  rows={2}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 6,
                    border: '1px solid var(--sap-border)',
                    background: 'var(--sap-bg)', color: 'var(--sap-text)',
                    fontSize: 13, resize: 'none', fontFamily: 'inherit',
                    lineHeight: 1.5, opacity: streaming ? 0.6 : 1, outline: 'none'
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || streaming}
                  style={{
                    padding: '9px 18px', borderRadius: 6, border: 'none',
                    background: (inputText.trim() && !streaming) ? 'var(--sap-primary, #0070f2)' : 'var(--sap-border)',
                    color: '#fff', fontSize: 13,
                    cursor: (inputText.trim() && !streaming) ? 'pointer' : 'not-allowed',
                    fontWeight: 600, flexShrink: 0, alignSelf: 'flex-end',
                    transition: 'background 0.15s'
                  }}
                >
                  {streaming ? '...' : 'Enviar'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 5 }}>
                {activeSession.messages?.length > 0
                  ? 'Reporte erros por bloco ou solicite ajustes pontuais — o agente responde de forma incremental'
                  : 'Aguardando a primeira resposta do Editor SAP...'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── New session modal ── */}
      {showModal && (
        <NewSessionModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes editorSpin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
