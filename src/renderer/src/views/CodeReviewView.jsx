import React, { useState, useEffect, useRef } from 'react'
import { useAiStore } from '../store/aiStore'
import { useCodeReviewStore } from '../store/codeReviewStore'
import { getActiveProvider, parseJSONResponse } from '../lib/aiClient'
import { notify } from '../lib/notify'
import { useAgentStore } from '../store/agentStore'

// ─── Severity config ───────────────────────────────────────────────────────────
const SEV = {
  critical: { color: '#bb2222', bg: '#fff5f5', border: '#ffd7d7', label: 'Crítico' },
  high:     { color: '#c44a00', bg: '#fff3ee', border: '#ffd0b3', label: 'Alto'    },
  medium:   { color: '#8a5a00', bg: '#fffbf0', border: '#fce8a0', label: 'Médio'   },
  low:      { color: '#0070f2', bg: '#f0f6ff', border: '#b3d1ff', label: 'Baixo'   },
  info:     { color: '#6c757d', bg: '#f8f9fa', border: '#dee2e6', label: 'Info'    }
}

const VERDICT_CONFIG = {
  approved:              { color: '#107e3e', bg: '#e8f5e9', label: '✓ Aprovado'               },
  approved_with_changes: { color: '#e9730c', bg: '#fff3e0', label: '⚠ Aprovado com alterações' },
  rejected:              { color: '#bb2222', bg: '#fff5f5', label: '✗ Reprovado'               }
}

const RISK_COLOR = { low: '#107e3e', medium: '#c67800', high: '#e9730c', critical: '#bb2222' }

// ─── Build first analysis message (user prompt content) ────────────────────────
function buildFirstMessage(context, files) {
  let msg = 'Por favor, realize um code review com base no contexto abaixo.\n\n'
  if (context?.trim()) msg += `**Contexto / Problema:**\n${context.trim()}\n\n`

  if (files?.length) {
    msg += `**Arquivos para análise:**\n\n`
    for (const f of files) {
      msg += `=== ${f.name} ===\n${f.content}\n\n`
    }
  }
  msg += 'Retorne a análise completa no formato JSON definido.'
  return msg
}

// ─── Build CLI prompt (full context for each message) ─────────────────────────
function buildCLIPrompt(session, newUserText, cliDir) {
  let prompt = ''

  if (cliDir) {
    prompt += `Os arquivos para análise estão na pasta: ${cliDir}\n`
    prompt += `Leia os arquivos nessa pasta para realizar a análise.\n\n`
  }

  if (session.context?.trim()) {
    prompt += `**Contexto / Problema:**\n${session.context.trim()}\n\n`
  }

  const history = session.messages || []
  if (history.length > 0) {
    prompt += `**Histórico da conversa:**\n`
    for (const m of history) {
      const role = m.role === 'user' ? 'Usuário' : 'Assistente'
      const content = m.content?.slice(0, 800) || ''
      prompt += `${role}: ${content}\n\n`
    }
  }

  prompt += `**Nova mensagem do usuário:**\n${newUserText}`
  return prompt
}

// ─── Severity order for sorting ───────────────────────────────────────────────
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

const CATEGORY_LABEL = {
  performance: 'Performance',
  bug:         'Bug',
  security:    'Segurança',
  style:       'Estilo',
  dead_code:   'Código morto',
  deadlock:    'Deadlock',
  data_loss:   'Perda de dados'
}

// ─── FindingsDisplay — renders structured JSON code review ────────────────────
function FindingsDisplay({ parsed }) {
  const [expanded, setExpanded] = useState({})
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const verdict   = VERDICT_CONFIG[parsed.verdict] || VERDICT_CONFIG.approved_with_changes
  const riskColor = RISK_COLOR[parsed.risk_level] || '#6c757d'
  const stats     = parsed.statistics || {}

  // Sort findings by severity
  const findings = [...(parsed.findings || [])].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
  )

  return (
    <div style={{ fontSize: 13, width: '100%' }}>

      {/* ── Verdict banner ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 6, marginBottom: 12,
        background: verdict.bg, border: `1px solid ${verdict.color}44`
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: verdict.color }}>{verdict.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: `${riskColor}22`, color: riskColor, border: `1px solid ${riskColor}44`
          }}>
            Risco {parsed.risk_level?.toUpperCase()}
          </span>
          {parsed.files_analyzed?.map(f => (
            <span key={f} style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 3,
              background: 'rgba(0,0,0,0.06)', color: 'var(--sap-text)',
              fontFamily: 'monospace'
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      {parsed.summary && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 14,
          borderLeft: `3px solid ${riskColor}`,
          background: 'var(--sap-hover-bg)', color: 'var(--sap-text)', lineHeight: 1.6
        }}>
          {parsed.summary}
        </div>
      )}

      {/* ── Statistics bar ─────────────────────────────────────────────────── */}
      {stats.total_findings > 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
          padding: '8px 12px', borderRadius: 6,
          background: 'var(--sap-hover-bg)', flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 11, color: 'var(--sap-subtle)', marginRight: 4 }}>
            {stats.total_findings} finding{stats.total_findings > 1 ? 's' : ''}:
          </span>
          {Object.entries(SEV).map(([sev, cfg]) => {
            const count = stats[sev] || 0
            if (!count) return null
            return (
              <span key={sev} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: cfg.color, display: 'inline-block', flexShrink: 0
                }} />
                {count} {cfg.label}
              </span>
            )
          })}
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '8px 12px', borderRadius: 6, background: '#e8f5e9',
          color: '#107e3e', fontSize: 12, fontWeight: 600
        }}>
          ✓ Nenhum finding encontrado — código aprovado
        </div>
      )}

      {/* ── Findings list ──────────────────────────────────────────────────── */}
      {findings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
          }}>
            Findings ({findings.length})
          </div>

          {findings.map((f) => {
            const sev    = SEV[f.severity] || SEV.info
            const isOpen = expanded[f.id]
            const catLabel = CATEGORY_LABEL[f.category] || f.category

            return (
              <div key={f.id} style={{
                marginBottom: 6, borderRadius: 6, overflow: 'hidden',
                border: `1px solid ${isOpen ? sev.color + '66' : sev.border}`,
                background: isOpen ? sev.bg : 'var(--sap-base)',
                transition: 'border-color 0.15s'
              }}>
                {/* Header row */}
                <div
                  onClick={() => toggle(f.id)}
                  style={{
                    padding: '9px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderLeft: `3px solid ${sev.color}`
                  }}
                >
                  {/* Severity pill */}
                  <span style={{
                    padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                    background: sev.color, color: '#fff', flexShrink: 0,
                    letterSpacing: '0.03em', textTransform: 'uppercase'
                  }}>{sev.label}</span>

                  {/* Category pill */}
                  <span style={{
                    padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: `${sev.color}18`, color: sev.color, flexShrink: 0
                  }}>{catLabel}</span>

                  {/* ID */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', flexShrink: 0
                  }}>{f.id}</span>

                  {/* Title */}
                  <span style={{
                    fontWeight: 600, color: 'var(--sap-text)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{f.title}</span>

                  {/* File:line */}
                  {f.file && (
                    <span style={{
                      fontSize: 10, color: 'var(--sap-subtle)',
                      fontFamily: 'monospace', flexShrink: 0
                    }}>
                      {f.file}{f.line_start ? `:${f.line_start}` : ''}
                    </span>
                  )}

                  <span style={{ color: 'var(--sap-subtle)', fontSize: 11, flexShrink: 0 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div style={{
                    padding: '12px 14px 14px',
                    borderTop: `1px solid ${sev.border}`
                  }}>
                    {/* Description */}
                    <p style={{
                      color: 'var(--sap-text)', lineHeight: 1.6, margin: '0 0 8px'
                    }}>{f.description}</p>

                    {/* Impact */}
                    {f.impact && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 6,
                        padding: '6px 10px', borderRadius: 4, marginBottom: 10,
                        background: `${sev.color}12`, border: `1px solid ${sev.color}30`
                      }}>
                        <span style={{ color: sev.color, fontSize: 13, flexShrink: 0 }}>⚡</span>
                        <span style={{ fontSize: 12, color: sev.color, fontWeight: 500, lineHeight: 1.5 }}>
                          {f.impact}
                        </span>
                      </div>
                    )}

                    {/* Code blocks side by side when both exist, stacked otherwise */}
                    {(f.original_code || f.suggested_code) && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: f.original_code && f.suggested_code ? '1fr 1fr' : '1fr',
                        gap: 10, marginTop: 4
                      }}>
                        {f.original_code && (
                          <div>
                            <div style={{
                              fontSize: 10, fontWeight: 700, color: '#bb2222',
                              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5
                            }}>
                              ✗ Código atual
                            </div>
                            <pre style={{
                              background: '#1e1e2e', color: '#f38ba8',
                              padding: '10px 12px', borderRadius: 4, fontSize: 11.5,
                              overflowX: 'auto', margin: 0, lineHeight: 1.6,
                              fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
                              border: '1px solid #bb222244'
                            }}>{f.original_code}</pre>
                          </div>
                        )}
                        {f.suggested_code && (
                          <div>
                            <div style={{
                              fontSize: 10, fontWeight: 700, color: '#107e3e',
                              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5
                            }}>
                              ✓ Sugestão
                            </div>
                            <pre style={{
                              background: '#1a2b1e', color: '#a6e3a1',
                              padding: '10px 12px', borderRadius: 4, fontSize: 11.5,
                              overflowX: 'auto', margin: 0, lineHeight: 1.6,
                              fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
                              border: '1px solid #107e3e44'
                            }}>{f.suggested_code}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Approved patterns ──────────────────────────────────────────────── */}
      {parsed.approved_patterns?.length > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 6, marginBottom: 12,
          background: '#e8f5e9', border: '1px solid #c8e6c9'
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#107e3e',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
          }}>
            Padrões aprovados ({parsed.approved_patterns.length})
          </div>
          {parsed.approved_patterns.map((p, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              marginBottom: i < parsed.approved_patterns.length - 1 ? 6 : 0
            }}>
              <span style={{ color: '#107e3e', flexShrink: 0, fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 12, color: '#1b5e20', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      {parsed.notes && (
        <div style={{
          padding: '10px 14px', borderRadius: 6,
          background: 'var(--sap-hover-bg)',
          border: '1px solid var(--sap-border)',
          borderLeft: '3px solid var(--sap-subtle)'
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--sap-subtle)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5
          }}>Observações</div>
          <div style={{ fontSize: 12, color: 'var(--sap-text)', lineHeight: 1.6 }}>
            {parsed.notes}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{
          maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 2px 12px',
          background: 'var(--sap-primary, #0070f2)', color: '#fff',
          fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
        }}>
          {/* Show short version if it's the big first message */}
          {msg._isFirstMsg
            ? `[Análise inicial enviada com ${msg._fileCount || 0} arquivo(s)]`
            : msg.content}
        </div>
      </div>
    )
  }

  // AI message
  let jsonParsed = null
  if (msg.isJson) {
    try { jsonParsed = parseJSONResponse(msg.content) } catch { /* fallback to text */ }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
      <div style={{
        width: jsonParsed ? '100%' : undefined,
        maxWidth: jsonParsed ? '100%' : '90%',
        padding: jsonParsed ? '14px 16px' : '12px 16px',
        borderRadius: '2px 12px 12px 12px',
        background: 'var(--sap-base)', border: '1px solid var(--sap-border)',
        fontSize: 13, lineHeight: 1.5
      }}>
        {jsonParsed
          ? <FindingsDisplay parsed={jsonParsed} />
          : <div style={{ whiteSpace: 'pre-wrap', color: 'var(--sap-text)', wordBreak: 'break-word' }}>{msg.content}</div>
        }
      </div>
    </div>
  )
}

// ─── Streaming bubble ──────────────────────────────────────────────────────────
function StreamingBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
      <div style={{
        maxWidth: '90%', padding: '12px 16px', borderRadius: '2px 12px 12px 12px',
        background: 'var(--sap-base)', border: '1px solid var(--sap-primary, #0070f2)',
        fontSize: 13, lineHeight: 1.5, color: 'var(--sap-text)'
      }}>
        {text
          ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}<span style={{ animation: 'blink 1s step-end infinite', borderRight: '2px solid var(--sap-text)' }}>&nbsp;</span></span>
          : <span style={{ color: 'var(--sap-subtle)' }}>Analisando<span style={{ animation: 'blink 1s step-end infinite' }}>...</span></span>
        }
      </div>
    </div>
  )
}

// ─── New Analysis Modal ────────────────────────────────────────────────────────
function NewAnalysisModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [context, setContext] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    await onCreate({ name: name.trim(), context, files })
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'var(--sap-base)', borderRadius: 10, width: 560,
        maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        border: '1px solid var(--sap-border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--sap-border)'
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sap-text)' }}>Nova Análise</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--sap-subtle)' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 6 }}>
              Nome da Análise *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Review ZPEDIDOS_ALV"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--sap-border)',
                background: 'var(--sap-bg)', color: 'var(--sap-text)', fontSize: 13, boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Context */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 6 }}>
              Contexto / Problema
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Descreva o que deseja analisar, o problema identificado ou o objetivo da revisão..."
              rows={4}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid var(--sap-border)',
                background: 'var(--sap-bg)', color: 'var(--sap-text)', fontSize: 13,
                resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Files */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', display: 'block', marginBottom: 6 }}>
              Arquivos
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".abap,.txt,.js,.ts,.py,.go,.java,.cs,.cpp,.c,.h,.xml,.json"
              onChange={handleFiles}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '7px 14px', borderRadius: 4, border: '1px dashed var(--sap-border)',
                background: 'var(--sap-bg)', color: 'var(--sap-subtle)', fontSize: 12,
                cursor: 'pointer', marginBottom: 8
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
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '14px 24px', borderTop: '1px solid var(--sap-border)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px', borderRadius: 4, border: '1px solid var(--sap-border)',
              background: 'transparent', color: 'var(--sap-text)', fontSize: 13, cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            style={{
              padding: '7px 18px', borderRadius: 4, border: 'none',
              background: name.trim() ? 'var(--sap-primary, #0070f2)' : 'var(--sap-border)',
              color: '#fff', fontSize: 13, cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600
            }}
          >
            {loading ? 'Iniciando...' : 'Iniciar Análise'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Session list item ─────────────────────────────────────────────────────────
function SessionItem({ session, active, onSelect, onDelete }) {
  const [hover, setHover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const msgCount = session.messages?.length || 0

  return (
    <div
      onClick={() => onSelect(session.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setConfirmDelete(false) }}
      style={{
        padding: '10px 14px', cursor: 'pointer', borderRadius: 6, marginBottom: 4,
        background: active ? 'var(--sap-active-bg)' : hover ? 'var(--sap-hover-bg)' : 'transparent',
        borderLeft: active ? '3px solid var(--sap-primary, #0070f2)' : '3px solid transparent',
        transition: 'all 0.1s', position: 'relative'
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6
      }}>
        <div style={{
          fontWeight: active ? 600 : 400, fontSize: 13,
          color: active ? 'var(--sap-primary, #0070f2)' : 'var(--sap-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
        }}>
          {session.name}
        </div>
        {hover && (
          confirmDelete
            ? (
              <span
                onClick={e => { e.stopPropagation(); onDelete(session.id) }}
                style={{ fontSize: 11, color: '#bb2222', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >Confirmar</span>
            ) : (
              <span
                onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                style={{ fontSize: 14, color: 'var(--sap-subtle)', cursor: 'pointer', flexShrink: 0 }}
              >⊗</span>
            )
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>
          {msgCount > 0 ? `${Math.floor(msgCount / 2)} troca(s)` : 'Sem mensagens'}
        </span>
        {session.files?.length > 0 && (
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: 'var(--sap-hover-bg)', color: 'var(--sap-subtle)'
          }}>
            {session.files.length} arquivo(s)
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main CodeReviewView ───────────────────────────────────────────────────────
export default function CodeReviewView() {
  const { providers, loadProviders } = useAiStore()
  const { getFlowPrompt } = useAgentStore()
  const { sessions, loading, loadSessions, createSession, updateMessages, deleteSession } = useCodeReviewStore()

  const [activeId, setActiveId] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [inputText, setInputText] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const streamAccumRef = useRef('')

  const activeSession = sessions.find(s => s.id === activeId) || null

  useEffect(() => {
    loadSessions()
    loadProviders()
    return () => { window.api?.removeStreamListeners?.() }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages?.length, streamText])

  // ─── Send a message to the active session ─────────────────────────────────
  const sendMessage = async (session, userText, filesForFirstMsg = null) => {
    const active = getActiveProvider(providers)
    if (!active) {
      setError('Nenhum provedor de IA ativo. Configure um provedor em Configurações.')
      return
    }

    setError(null)

    // Build user message content
    const isFirst = filesForFirstMsg != null
    const userContent = isFirst
      ? buildFirstMessage(session.context, filesForFirstMsg)
      : userText

    // Mark first message so we can display it compactly
    const userMsg = {
      role: 'user',
      content: userContent,
      _isFirstMsg: isFirst,
      _fileCount: filesForFirstMsg?.length || 0
    }

    const prevMessages = session.messages || []
    const newMessages = [...prevMessages, userMsg]

    // Optimistically update store
    await updateMessages(session.id, newMessages)

    // ── CLI flow ──────────────────────────────────────────────────────────────
    if (active.isIntegration) {
      setStreaming(true)
      setStreamText('')

      try {
        let cliDir = null

        // For the first message, save files to disk
        if (isFirst && filesForFirstMsg?.length) {
          const saved = await window.api.saveReviewFiles({ sessionId: session.id, files: filesForFirstMsg })
          if (saved.success) cliDir = saved.dir
        } else {
          // For follow-ups, get existing dir
          const dirInfo = await window.api.getReviewDir({ sessionId: session.id })
          if (dirInfo.exists) cliDir = dirInfo.dir
        }

        const fullPrompt = buildCLIPrompt(session, userText || `Analise os arquivos conforme o contexto: ${session.context}`, cliDir)

        const res = await window.api.generateIntegration({
          integrationType: active.integrationType,
          systemPrompt: getFlowPrompt('code_review'),
          userMessage: fullPrompt,
          programName: `CodeReview_${session.name}`
        })

        const aiMsg = {
          role: 'assistant',
          content: res.success ? (res.content || '(sem resposta)') : `Erro: ${res.error}`,
          isJson: false
        }
        await updateMessages(session.id, [...newMessages, aiMsg])
      } finally {
        setStreaming(false)
        setStreamText('')
      }

      return
    }

    // ── API streaming flow ─────────────────────────────────────────────────────
    setStreaming(true)
    setStreamText('')
    streamAccumRef.current = ''

    window.api.removeStreamListeners()

    // Build messages array for API (only role + content, no internal fields)
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

      const aiMsg = {
        role: 'assistant',
        content: finalText,
        isJson: isFirst   // first response should be JSON
      }
      await updateMessages(session.id, [...newMessages, aiMsg])
      window.api.removeStreamListeners()
      if (isFirst) {
        notify('🔍 Code Review concluído', session?.name || 'Análise disponível')
      }
    })

    window.api.onStreamError(({ error: err }) => {
      setStreaming(false)
      setStreamText('')
      streamAccumRef.current = ''
      setError(`Erro no streaming: ${err}`)
      window.api.removeStreamListeners()
    })

    window.api.streamStart({
      provider: active.provider,
      apiKey: active.apiKey,
      model: active.model,
      systemPrompt: getFlowPrompt('code_review'),
      messages: apiMessages
    })
  }

  // ─── Create new session + trigger first analysis ───────────────────────────
  const handleCreate = async ({ name, context, files }) => {
    const res = await createSession({ name, context, files })
    if (!res.success) { setError(res.error); return }
    setActiveId(res.session.id)
    setShowModal(false)
    await sendMessage(res.session, null, files)
  }

  // ─── Send follow-up message ────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || !activeSession || streaming) return
    const text = inputText.trim()
    setInputText('')
    await sendMessage(activeSession, text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Sessions panel ── */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--sap-base)', overflow: 'hidden'
      }}>
        {/* Panel header */}
        <div style={{
          padding: '14px 14px 10px', borderBottom: '1px solid var(--sap-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--sap-text)' }}>Code Review</div>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--sap-subtle)', fontSize: 12, padding: 16 }}>
              Carregando...
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--sap-subtle)', fontSize: 12, padding: 24 }}>
              Nenhuma análise salva.<br />Clique em + Nova para começar.
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

      {/* ── Chat panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeSession ? (
          /* Empty state */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--sap-subtle)', padding: 32
          }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--sap-text)' }}>Code Review</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
              Crie uma nova análise para revisar seu código ABAP com IA.
              Adicione contexto e arquivos para um review mais preciso.
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                marginTop: 8, padding: '9px 22px', borderRadius: 6, border: 'none',
                background: 'var(--sap-primary, #0070f2)', color: '#fff',
                fontSize: 14, cursor: 'pointer', fontWeight: 600
              }}
            >
              + Nova Análise
            </button>
          </div>
        ) : (
          <>
            {/* Session header */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid var(--sap-border)',
              background: 'var(--sap-base)', flexShrink: 0
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--sap-text)', marginBottom: 4 }}>
                {activeSession.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {activeSession.context && (
                  <span style={{ fontSize: 12, color: 'var(--sap-subtle)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

            {/* Error banner */}
            {error && (
              <div style={{
                padding: '8px 20px', background: '#fff5f5', borderBottom: '1px solid #ffd7d7',
                fontSize: 13, color: '#bb2222', display: 'flex', justifyContent: 'space-between'
              }}>
                {error}
                <span onClick={() => setError(null)} style={{ cursor: 'pointer', fontWeight: 600 }}>✕</span>
              </div>
            )}

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px'
            }}>
              {(activeSession.messages || []).length === 0 && !streaming && (
                <div style={{ textAlign: 'center', color: 'var(--sap-subtle)', fontSize: 13, padding: 32 }}>
                  Análise iniciada. Aguardando resposta...
                </div>
              )}

              {(activeSession.messages || []).map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {streaming && <StreamingBubble text={streamText} />}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--sap-border)',
              background: 'var(--sap-base)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  placeholder={streaming ? 'Aguardando resposta...' : 'Mensagem (Enter para enviar, Shift+Enter para nova linha)'}
                  rows={2}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 6,
                    border: '1px solid var(--sap-border)', background: 'var(--sap-bg)',
                    color: 'var(--sap-text)', fontSize: 13, resize: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5,
                    opacity: streaming ? 0.6 : 1
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || streaming}
                  style={{
                    padding: '9px 18px', borderRadius: 6, border: 'none',
                    background: (inputText.trim() && !streaming) ? 'var(--sap-primary, #0070f2)' : 'var(--sap-border)',
                    color: '#fff', fontSize: 13, cursor: (inputText.trim() && !streaming) ? 'pointer' : 'not-allowed',
                    fontWeight: 600, flexShrink: 0, alignSelf: 'flex-end'
                  }}
                >
                  {streaming ? '...' : 'Enviar'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 5 }}>
                {activeSession.messages?.length > 0
                  ? 'Continue a conversa sobre o código analisado'
                  : 'Faça perguntas sobre os findings ou solicite correções específicas'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* New analysis modal */}
      {showModal && (
        <NewAnalysisModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* CSS for blink animation */}
      <style>{`@keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  )
}
