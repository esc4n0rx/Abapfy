import React, { useState } from 'react'
import { useAiStore } from '../store/aiStore'
import { getActiveProvider, parseJSONResponse } from '../lib/aiClient'
import { useAgentStore } from '../store/agentStore'
import AbapHighlight from '../components/AbapHighlight'

const SEV = {
  critical: { color: 'var(--sap-negative)', label: 'Crítico' },
  high:     { color: 'var(--sap-critical)', label: 'Alto'    },
  medium:   { color: '#d4a017',             label: 'Médio'   },
  low:      { color: 'var(--sap-primary)',   label: 'Baixo'   },
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? 'var(--sap-positive)' : score >= 60 ? 'var(--sap-critical)' : score >= 40 ? 'var(--sap-negative)' : 'var(--sap-negative)'
  const label = score >= 80 ? 'Bom' : score >= 60 ? 'Regular' : score >= 40 ? 'Ruim' : 'Crítico'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
        <svg viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r="30" fill="none" stroke="var(--sap-border)" strokeWidth="8" />
          <circle cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(score / 100) * 188.5} 188.5`} strokeLinecap="round" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>Score de performance</div>
      </div>
    </div>
  )
}

function IssueCard({ issue, selected, onToggle }) {
  const [showFix, setShowFix] = useState(false)
  const s = SEV[issue.severity] || SEV.low

  return (
    <div style={{
      border: `1px solid var(--sap-border)`,
      borderLeft: `3px solid ${s.color}`,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12,
      background: 'var(--sap-base)',
    }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          {/* Checkbox para seleção */}
          {issue.fix_code && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              style={{ marginTop: 3, cursor: 'pointer', flexShrink: 0, accentColor: s.color }}
            />
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#fff', background: s.color,
            padding: '2px 8px', borderRadius: 3, flexShrink: 0, marginTop: 2
          }}>{s.label.toUpperCase()}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: s.color }}>{issue.title}</div>
            {issue.line_hint && (
              <code style={{
                display: 'inline-block', marginTop: 4,
                fontFamily: 'monospace', fontSize: 11,
                background: 'var(--sap-base2)', padding: '1px 6px', borderRadius: 3,
                color: 'var(--sap-text)', border: '1px solid var(--sap-border)'
              }}>{issue.line_hint}</code>
            )}
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.6 }}>{issue.description}</div>
        {issue.impact && (
          <div style={{ marginTop: 6, fontSize: 12, color: s.color, fontStyle: 'italic' }}>
            Impacto: {issue.impact}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 16px', background: 'var(--sap-base2)', borderTop: '1px solid var(--sap-border)' }}>
        <div style={{ fontSize: 13, color: 'var(--sap-text)', marginBottom: issue.fix_code ? 8 : 0 }}>
          <strong>Correção:</strong> {issue.fix_description}
        </div>
        {issue.fix_code && (
          <>
            <button onClick={() => setShowFix(o => !o)} style={{
              fontSize: 12, color: 'var(--sap-primary)', background: 'transparent',
              border: '1px solid var(--sap-primary)', borderRadius: 4, padding: '3px 12px',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              {showFix ? '▲ Ocultar código' : '▼ Ver código corrigido'}
            </button>
            {showFix && <div style={{ marginTop: 8 }}><AbapHighlight code={issue.fix_code} maxHeight={200} /></div>}
          </>
        )}
      </div>
    </div>
  )
}

function ApplyModal({ code, issueCount, onClose }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '82%', maxWidth: 920, maxHeight: '88vh',
        background: 'var(--sap-base)', borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--sap-border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--sap-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text)' }}>
              ✅ Código com correções aplicadas
            </div>
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2 }}>
              {issueCount} {issueCount === 1 ? 'correção aplicada' : 'correções aplicadas'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCopy} style={{
              fontSize: 12, fontWeight: 600,
              background: copied ? 'var(--sap-positive)' : 'var(--sap-primary)',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.2s'
            }}>
              {copied ? '✓ Copiado!' : '⎘ Copiar código'}
            </button>
            <button onClick={onClose} style={{
              fontSize: 14, background: 'transparent', color: 'var(--sap-subtle)',
              border: '1px solid var(--sap-border)', borderRadius: 6,
              padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit'
            }}>✕</button>
          </div>
        </div>
        {/* Code */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AbapHighlight code={code} maxHeight={9999} />
        </div>
      </div>
    </div>
  )
}

export default function PerformanceView() {
  const { providers } = useAiStore()
  const { getFlowPrompt } = useAgentStore()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFixes, setSelectedFixes] = useState({})
  const [applyLoading, setApplyLoading] = useState(false)
  const [appliedCode, setAppliedCode] = useState('')
  const [showApplyModal, setShowApplyModal] = useState(false)

  async function handleAnalyze() {
    if (!code.trim()) { setError('Cole o código ABAP para analisar.'); return }
    const provider = getActiveProvider(providers)
    if (!provider) { setError('Nenhum provedor de IA configurado.'); return }

    setLoading(true); setError(''); setResult(null); setSelectedFixes({})
    try {
      const userMessage = `Analise a performance do seguinte código ABAP e identifique todos os problemas:\n\n\`\`\`abap\n${code.trim()}\n\`\`\``
      let raw = ''
      if (provider.isIntegration) {
        const res = await window.api.generateIntegration({ integrationType: provider.integrationType, systemPrompt: getFlowPrompt('performance'), userMessage, programName: 'PERF_ANALYSIS' })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        const res = await window.api.generateAI({ provider: provider.provider, apiKey: provider.apiKey, model: provider.model, systemPrompt: getFlowPrompt('performance'), userMessage })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }
      const parsed = parseJSONResponse(raw)
      setResult(parsed)
      // Pré-selecionar todos os fixes disponíveis
      const initial = {}
      parsed?.issues?.forEach((issue, i) => { if (issue.fix_code) initial[i] = true })
      setSelectedFixes(initial)
    } catch (e) { setError(`Erro: ${e.message}`) }
    finally { setLoading(false) }
  }

  async function handleApplyAll() {
    const provider = getActiveProvider(providers)
    if (!provider) { setError('Nenhum provedor de IA configurado.'); return }

    const fixes = result?.issues?.filter((_, i) => selectedFixes[i] && result.issues[i].fix_code) || []
    if (!fixes.length) { setError('Nenhuma correção selecionada.'); return }

    setApplyLoading(true); setError('')
    try {
      const issuesList = fixes.map((issue, i) =>
        `${i + 1}. ${issue.title}\nCorreção: ${issue.fix_description}\nCódigo corrigido:\n\`\`\`abap\n${issue.fix_code}\n\`\`\``
      ).join('\n\n')

      const userMessage = `Você é um especialista ABAP. Abaixo está um código ABAP original com ${fixes.length} problemas identificados e suas respectivas correções.\n\nAplique TODAS as correções ao código original de forma coerente e retorne APENAS o código ABAP completo e corrigido — sem explicações, sem blocos markdown, sem comentários extras.\n\nCÓDIGO ORIGINAL:\n${code}\n\nPROBLEMAS E CORREÇÕES A APLICAR:\n${issuesList}`

      let raw = ''
      if (provider.isIntegration) {
        const res = await window.api.generateIntegration({ integrationType: provider.integrationType, systemPrompt: 'Você é um especialista ABAP. Retorne apenas o código ABAP puro, sem blocos markdown, sem explicações.', userMessage, programName: 'PERF_APPLY' })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        const res = await window.api.generateAI({ provider: provider.provider, apiKey: provider.apiKey, model: provider.model, systemPrompt: 'Você é um especialista ABAP. Retorne apenas o código ABAP puro, sem blocos markdown, sem explicações.', userMessage })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }

      // Limpar blocos de código markdown caso a IA tenha adicionado
      const cleaned = raw.replace(/^```abap\s*/i, '').replace(/\s*```$/, '').trim()
      setAppliedCode(cleaned)
      setShowApplyModal(true)
    } catch (e) { setError(`Erro ao aplicar correções: ${e.message}`) }
    finally { setApplyLoading(false) }
  }

  const sevCounts = result?.issues?.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc }, {}) || {}
  const fixableCount = result?.issues?.filter((_, i) => selectedFixes[i])?.length || 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--sap-bg)' }}>
      {/* Left: code input */}
      <div style={{
        width: 340, flexShrink: 0, borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--sap-base)'
      }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sap-border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)', marginBottom: 4 }}>⚡ Análise de Performance</div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>Cole o código ABAP para detectar anti-patterns e gargalos.</div>
        </div>

        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Cole o código ABAP aqui..."
            style={{
              flex: 1, padding: '10px 12px', fontSize: 12, lineHeight: 1.6,
              border: '1px solid var(--sap-border)', borderRadius: 6,
              background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
              outline: 'none', fontFamily: '"Cascadia Code","Consolas",monospace',
              resize: 'none', boxSizing: 'border-box'
            }}
          />
          {error && (
            <div style={{
              padding: '8px 12px', background: 'var(--sap-base2)',
              border: '1px solid var(--sap-negative)', borderRadius: 6,
              color: 'var(--sap-negative)', fontSize: 12
            }}>{error}</div>
          )}
          <button onClick={handleAnalyze} disabled={loading} style={{
            background: loading ? 'var(--sap-subtle)' : 'var(--sap-primary)', color: '#fff',
            border: 'none', borderRadius: 6, padding: '10px', fontSize: 14, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Analisando...</> : '⚡ Analisar Performance'}
          </button>
          {result && (
            <button onClick={() => { setResult(null); setCode(''); setSelectedFixes({}) }} style={{
              background: 'transparent', color: 'var(--sap-subtle)',
              border: '1px solid var(--sap-border)', borderRadius: 6, padding: '8px',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>↺ Nova análise</button>
          )}
        </div>
      </div>

      {/* Right: results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!result && !loading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--sap-subtle)', gap: 12 }}>
            <div style={{ fontSize: 48 }}>⚡</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)' }}>Análise de Performance ABAP</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 380 }}>
              Cole seu código no painel à esquerda. A IA detecta SELECTs dentro de LOOPs, ausência de índices, tabelas internas não otimizadas e outros anti-patterns de performance SAP.
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16, color: 'var(--sap-subtle)' }}>
            <span style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            <div style={{ fontSize: 14 }}>Analisando padrões de performance...</div>
          </div>
        )}

        {result && (
          <>
            {/* Score + summary */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 24, padding: '16px 20px', background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 10 }}>
              <ScoreGauge score={result.score || 0} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {Object.entries(SEV).map(([key, cfg]) => sevCounts[key] > 0 && (
                    <span key={key} style={{
                      fontSize: 12, fontWeight: 700, color: cfg.color,
                      background: 'var(--sap-base2)', border: `1px solid ${cfg.color}`,
                      padding: '3px 10px', borderRadius: 20
                    }}>{sevCounts[key]} {cfg.label}</span>
                  ))}
                  {result.issues?.length === 0 && (
                    <span style={{ fontSize: 13, color: 'var(--sap-positive)', fontWeight: 600 }}>✓ Nenhum problema encontrado</span>
                  )}
                </div>
                {result.summary && <div style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.7 }}>{result.summary}</div>}
              </div>
            </div>

            {/* Issues */}
            {(result.issues || []).length > 0 && (
              <>
                {/* Header com contagem e botão aplicar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {result.issues.length} problema{result.issues.length !== 1 ? 's' : ''} encontrado{result.issues.length !== 1 ? 's' : ''}
                  </div>
                  {fixableCount > 0 && (
                    <button
                      onClick={handleApplyAll}
                      disabled={applyLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 13, fontWeight: 600,
                        background: applyLoading ? 'var(--sap-subtle)' : 'var(--sap-positive)',
                        color: '#fff', border: 'none', borderRadius: 6,
                        padding: '7px 16px', cursor: applyLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {applyLoading
                        ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Aplicando...</>
                        : `✓ Aplicar ${fixableCount} correç${fixableCount === 1 ? 'ão' : 'ões'} selecionada${fixableCount === 1 ? '' : 's'}`
                      }
                    </button>
                  )}
                </div>

                {result.issues.map((issue, i) => (
                  <IssueCard
                    key={i}
                    issue={issue}
                    selected={!!selectedFixes[i]}
                    onToggle={() => setSelectedFixes(prev => ({ ...prev, [i]: !prev[i] }))}
                  />
                ))}
              </>
            )}

            {/* General recommendations */}
            {result.general_recommendations?.length > 0 && (
              <div style={{ padding: '14px 16px', background: 'var(--sap-base2)', border: '1px solid var(--sap-border)', borderRadius: 8, marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
                  Recomendações Gerais
                </div>
                {result.general_recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--sap-text)', marginBottom: 6 }}>
                    <span style={{ color: 'var(--sap-primary)', flexShrink: 0 }}>→</span>{r}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: código com correções aplicadas */}
      {showApplyModal && appliedCode && (
        <ApplyModal
          code={appliedCode}
          issueCount={fixableCount}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  )
}
