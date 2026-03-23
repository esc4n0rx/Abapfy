import React, { useState } from 'react'
import { useAiStore } from '../store/aiStore'
import { getActiveProvider, parseJSONResponse } from '../lib/aiClient'
import enhancementPromptRaw from '../agents/enhancement_finder.md?raw'
import AbapHighlight from '../components/AbapHighlight'

const SAP_MODULES = [
  { key: 'MM', label: 'MM — Materials Management' },
  { key: 'FI', label: 'FI — Financial Accounting' },
  { key: 'SD', label: 'SD — Sales & Distribution' },
  { key: 'PP', label: 'PP — Production Planning' },
  { key: 'CO', label: 'CO — Controlling' },
  { key: 'HR', label: 'HR/HCM — Human Resources' },
  { key: 'PM', label: 'PM — Plant Maintenance' },
  { key: 'QM', label: 'QM — Quality Management' },
  { key: 'WM', label: 'WM/EWM — Warehouse Mgmt' },
  { key: 'PS', label: 'PS — Project System' },
  { key: 'CS', label: 'CS — Customer Service' },
  { key: 'BASIS', label: 'BASIS / Cross-Module' },
]

const TYPE_COLORS = {
  'BAdI': '#0070f2',
  'User Exit': '#107e3e',
  'Enhancement Spot': '#8b5cf6',
  'Customer Exit': '#e9730c',
  'Enhancement Point': '#354a5e',
}

function RankBadge({ rank }) {
  const colors = ['#f0a500', '#8a8a8a', '#c44a00']
  const bg = colors[rank - 1] || '#6a6d70'
  return (
    <span style={{
      width: 24, height: 24, borderRadius: '50%', background: bg,
      color: '#fff', fontSize: 12, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>{rank}</span>
  )
}

function EnhancementCard({ rec }) {
  const [showCode, setShowCode] = useState(false)
  const typeColor = TYPE_COLORS[rec.type] || '#6a6d70'

  return (
    <div style={{ border: '1px solid var(--sap-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14, background: 'var(--sap-base)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--sap-border)', background: rec.rank === 1 ? '#f0f6ff' : 'var(--sap-base)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <RankBadge rank={rec.rank} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: typeColor, padding: '2px 8px', borderRadius: 4 }}>{rec.type}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--sap-text)' }}>{rec.name}</span>
          {rec.s4hana_compatible && (
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#107e3e', background: '#e8f5e9', border: '1px solid #b7e4c7', padding: '2px 8px', borderRadius: 4 }}>
              ✓ S/4HANA
            </span>
          )}
        </div>
        {rec.interface_method && (
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginBottom: 6 }}>
            Método: <span style={{ fontFamily: 'monospace', color: 'var(--sap-primary)' }}>{rec.interface_method}</span>
          </div>
        )}
        <div style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.6 }}>{rec.description}</div>
      </div>

      {/* Details */}
      <div style={{ padding: '12px 16px' }}>
        {rec.when_called && (
          <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--sap-subtle)' }}>
            <strong style={{ color: 'var(--sap-text)' }}>Quando é chamado:</strong> {rec.when_called}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {rec.pros && (
            <div style={{ padding: '8px 12px', background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#107e3e', marginBottom: 4 }}>✓ VANTAGENS</div>
              <div style={{ fontSize: 12, color: 'var(--sap-text)', lineHeight: 1.6 }}>{rec.pros}</div>
            </div>
          )}
          {rec.cons && (
            <div style={{ padding: '8px 12px', background: '#fff8f0', border: '1px solid #ffe0b2', borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e9730c', marginBottom: 4 }}>⚠ LIMITAÇÕES</div>
              <div style={{ fontSize: 12, color: 'var(--sap-text)', lineHeight: 1.6 }}>{rec.cons}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {rec.transaction && (
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>
              Transação: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--sap-primary)' }}>{rec.transaction}</span>
            </div>
          )}
          {rec.code_skeleton && (
            <button onClick={() => setShowCode(o => !o)} style={{
              marginLeft: 'auto', fontSize: 12, color: 'var(--sap-primary)', background: 'transparent',
              border: '1px solid var(--sap-primary)', borderRadius: 4, padding: '4px 12px',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              {showCode ? '▲ Ocultar código' : '▼ Ver esqueleto de código'}
            </button>
          )}
        </div>

        {showCode && rec.code_skeleton && (
          <div style={{ marginTop: 10 }}>
            <AbapHighlight code={rec.code_skeleton} maxHeight={280} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function EnhancementFinderView() {
  const { providers } = useAiStore()
  const [module, setModule] = useState('MM')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!description.trim()) { setError('Descreva a necessidade de customização.'); return }
    const provider = getActiveProvider(providers)
    if (!provider) { setError('Nenhum provedor de IA configurado.'); return }

    setLoading(true); setError(''); setResult(null)
    try {
      const userMessage =
        `Módulo SAP: ${module}\n\n` +
        `Necessidade de customização:\n${description.trim()}\n\n` +
        `Identifique os melhores pontos de enhancement SAP para atender esse requisito.`

      let raw = ''
      if (provider.isIntegration) {
        const res = await window.api.generateIntegration({ integrationType: provider.integrationType, systemPrompt: enhancementPromptRaw, userMessage, programName: 'ENH_FINDER' })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        const res = await window.api.generateAI({ provider: provider.provider, apiKey: provider.apiKey, model: provider.model, systemPrompt: enhancementPromptRaw, userMessage })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }
      setResult(parseJSONResponse(raw))
    } catch (e) { setError(`Erro: ${e.message}`) }
    finally { setLoading(false) }
  }

  const textareaStyle = {
    width: '100%', padding: '10px 12px', fontSize: 13, lineHeight: 1.6,
    border: '1px solid var(--sap-border)', borderRadius: 6,
    background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
    outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--sap-bg)' }}>
      {/* Left: form */}
      <div style={{
        width: 320, flexShrink: 0, borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--sap-base)',
        padding: 20, gap: 16, overflowY: 'auto'
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)', marginBottom: 4 }}>🔎 Enhancement Finder</div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>Encontre o BAdI ou User Exit certo para sua customização SAP.</div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>Módulo SAP</label>
          <select value={module} onChange={e => setModule(e.target.value)} style={{
            width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--sap-border)',
            borderRadius: 6, background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
            outline: 'none', fontFamily: 'inherit'
          }}>
            {SAP_MODULES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>
            Descreva a necessidade *
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={10}
            placeholder={`Descreva o que você precisa customizar. Exemplo:\n\n"Precisamos bloquear a gravação de um pedido de compra (ME21N) quando o fornecedor não tiver avaliação cadastrada. O bloqueio deve mostrar uma mensagem de erro ao usuário."`}
            style={textareaStyle}
          />
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#bb0000', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button onClick={handleSearch} disabled={loading} style={{
          background: loading ? 'var(--sap-subtle)' : 'var(--sap-primary)', color: '#fff',
          border: 'none', borderRadius: 6, padding: '10px', fontSize: 14, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Buscando...</> : '🔎 Encontrar Enhancement'}
        </button>

        {result && (
          <button onClick={() => { setResult(null); setDescription('') }} style={{
            background: 'transparent', color: 'var(--sap-subtle)',
            border: '1px solid var(--sap-border)', borderRadius: 6, padding: '8px',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
          }}>↺ Nova busca</button>
        )}
      </div>

      {/* Right: results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!result && !loading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--sap-subtle)', gap: 12 }}>
            <div style={{ fontSize: 48 }}>🔎</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)' }}>Enhancement Finder</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 380 }}>
              Descreva sua necessidade de customização no painel à esquerda e a IA encontrará os melhores BAdIs, User Exits e Enhancement Points.
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16, color: 'var(--sap-subtle)' }}>
            <span style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            <div style={{ fontSize: 14 }}>Analisando base de conhecimento SAP...</div>
          </div>
        )}

        {result && (
          <>
            {result.summary && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 8, fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--sap-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Análise</div>
                {result.summary}
              </div>
            )}

            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {result.recommendations?.length || 0} enhancement{(result.recommendations?.length || 0) !== 1 ? 's' : ''} encontrado{(result.recommendations?.length || 0) !== 1 ? 's' : ''}
            </div>

            {(result.recommendations || []).map((rec, i) => (
              <EnhancementCard key={i} rec={rec} />
            ))}

            {result.additional_notes && (
              <div style={{ padding: '12px 16px', background: '#fff8f0', border: '1px solid #ffe0b2', borderRadius: 8, fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#e9730c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>⚠ Observações Adicionais</div>
                {result.additional_notes}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
