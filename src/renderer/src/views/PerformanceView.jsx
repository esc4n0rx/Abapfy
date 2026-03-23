import React, { useState } from 'react'
import { useAiStore } from '../store/aiStore'
import { getActiveProvider, parseJSONResponse } from '../lib/aiClient'
import perfPromptRaw from '../agents/performance_analyzer.md?raw'
import AbapHighlight from '../components/AbapHighlight'

const SEV = {
  critical: { color: '#bb2222', bg: '#fff5f5', border: '#ffd7d7', label: 'Crítico' },
  high:     { color: '#c44a00', bg: '#fff3ee', border: '#ffd0b3', label: 'Alto'    },
  medium:   { color: '#8a5a00', bg: '#fffbf0', border: '#fce8a0', label: 'Médio'   },
  low:      { color: '#0070f2', bg: '#f0f6ff', border: '#b3d1ff', label: 'Baixo'   },
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#107e3e' : score >= 60 ? '#e9730c' : score >= 40 ? '#c44a00' : '#bb0000'
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

function IssueCard({ issue }) {
  const [showFix, setShowFix] = useState(false)
  const s = SEV[issue.severity] || SEV.low

  return (
    <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '12px 16px', background: s.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
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
                background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 3,
                color: 'var(--sap-text)'
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

      <div style={{ padding: '10px 16px', background: 'var(--sap-base)', borderTop: `1px solid ${s.border}` }}>
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

export default function PerformanceView() {
  const { providers } = useAiStore()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze() {
    if (!code.trim()) { setError('Cole o código ABAP para analisar.'); return }
    const provider = getActiveProvider(providers)
    if (!provider) { setError('Nenhum provedor de IA configurado.'); return }

    setLoading(true); setError(''); setResult(null)
    try {
      const userMessage = `Analise a performance do seguinte código ABAP e identifique todos os problemas:\n\n\`\`\`abap\n${code.trim()}\n\`\`\``
      let raw = ''
      if (provider.isIntegration) {
        const res = await window.api.generateIntegration({ integrationType: provider.integrationType, systemPrompt: perfPromptRaw, userMessage, programName: 'PERF_ANALYSIS' })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        const res = await window.api.generateAI({ provider: provider.provider, apiKey: provider.apiKey, model: provider.model, systemPrompt: perfPromptRaw, userMessage })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }
      setResult(parseJSONResponse(raw))
    } catch (e) { setError(`Erro: ${e.message}`) }
    finally { setLoading(false) }
  }

  const sevCounts = result?.issues?.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc }, {}) || {}

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
          {error && <div style={{ padding: '8px 12px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#bb0000', fontSize: 12 }}>{error}</div>}
          <button onClick={handleAnalyze} disabled={loading} style={{
            background: loading ? 'var(--sap-subtle)' : 'var(--sap-primary)', color: '#fff',
            border: 'none', borderRadius: 6, padding: '10px', fontSize: 14, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Analisando...</> : '⚡ Analisar Performance'}
          </button>
          {result && (
            <button onClick={() => { setResult(null); setCode('') }} style={{
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
                {/* Severity badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {Object.entries(SEV).map(([key, cfg]) => sevCounts[key] > 0 && (
                    <span key={key} style={{
                      fontSize: 12, fontWeight: 700, color: cfg.color,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      padding: '3px 10px', borderRadius: 20
                    }}>{sevCounts[key]} {cfg.label}</span>
                  ))}
                  {result.issues?.length === 0 && (
                    <span style={{ fontSize: 13, color: '#107e3e', fontWeight: 600 }}>✓ Nenhum problema encontrado</span>
                  )}
                </div>
                {result.summary && <div style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.7 }}>{result.summary}</div>}
              </div>
            </div>

            {/* Issues */}
            {(result.issues || []).length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>
                  {result.issues.length} problema{result.issues.length !== 1 ? 's' : ''} encontrado{result.issues.length !== 1 ? 's' : ''}
                </div>
                {result.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
              </>
            )}

            {/* General recommendations */}
            {result.general_recommendations?.length > 0 && (
              <div style={{ padding: '14px 16px', background: '#f0f6ff', border: '1px solid #b3d1ff', borderRadius: 8, marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0070f2', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
                  Recomendações Gerais
                </div>
                {result.general_recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--sap-text)', marginBottom: 6 }}>
                    <span style={{ color: '#0070f2', flexShrink: 0 }}>→</span>{r}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
