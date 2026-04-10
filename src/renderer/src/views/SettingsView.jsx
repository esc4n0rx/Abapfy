import React, { useState, useEffect, useRef } from 'react'
import { useThemeStore } from '../store/themeStore'
import { useAiStore, AI_PROVIDERS } from '../store/aiStore'

// Separa providers em integrações CLI e APIs
const INTEGRATION_PROVIDER_IDS = Object.entries(AI_PROVIDERS)
  .filter(([, m]) => m.isIntegration)
  .map(([id]) => id)
const API_PROVIDER_IDS = Object.entries(AI_PROVIDERS)
  .filter(([, m]) => !m.isIntegration)
  .map(([id]) => id)
import AgentsTab from './AgentsTab'
import { useEstimationParametersStore } from '../store/estimationParametersStore'
import { useClienteParametrosStore } from '../store/clienteParametrosStore'

/* ─── Shared ────────────────────────────────────────── */
function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab-btn${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 600,
      color: 'var(--sap-subtle)', marginBottom: 6,
      textTransform: 'uppercase', letterSpacing: 0.4
    }}>
      {children}
    </label>
  )
}

/* ─── UI Tab ────────────────────────────────────────── */
function UiTab() {
  const { theme, fontSize, setTheme, setFontSize, reset } = useThemeStore()
  const [resetDone, setResetDone] = useState(false)

  const handleReset = () => {
    reset()
    setResetDone(true)
    setTimeout(() => setResetDone(false), 2500)
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

      {/* Aparência */}
      <div className="settings-section">
        <div className="settings-section-title">Aparência</div>
        <FieldLabel>Tema</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'light', label: 'Claro',  desc: 'Padrão' },
            { value: 'dark',  label: 'Escuro', desc: 'Contraste reduzido' }
          ].map((opt) => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 4,
                  border: `1px solid ${active ? 'var(--sap-primary)' : 'var(--sap-border)'}`,
                  background: active ? 'var(--sap-active-bg)' : 'var(--sap-base)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: 120,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--sap-primary)' : 'var(--sap-text)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 2 }}>{opt.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tipografia */}
      <div className="settings-section">
        <div className="settings-section-title">Tipografia</div>
        <FieldLabel>Tamanho da fonte</FieldLabel>
        <div className="btn-group">
          {[
            { value: 'small',  label: 'Pequena' },
            { value: 'normal', label: 'Normal' },
            { value: 'large',  label: 'Grande' },
            { value: 'xlarge', label: 'Extra' }
          ].map((opt) => (
            <button
              key={opt.value}
              className={`btn-group-item${fontSize === opt.value ? ' active' : ''}`}
              onClick={() => setFontSize(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--sap-subtle)' }}>
          A alteração é aplicada imediatamente em toda a aplicação.
        </p>
      </div>

      {/* Reset */}
      <div className="settings-section">
        <div className="settings-section-title">Redefinir</div>
        <p style={{ fontSize: 13, color: 'var(--sap-subtle)', marginBottom: 14 }}>
          Restaura o tema e o tamanho de fonte para os valores padrão do sistema.
        </p>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 18px',
            borderRadius: 4,
            border: '1px solid var(--sap-border)',
            background: resetDone ? 'var(--sap-base)' : 'var(--sap-base)',
            color: resetDone ? 'var(--sap-positive)' : 'var(--sap-text)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 400,
            transition: 'color 0.2s'
          }}
        >
          {resetDone ? 'Preferências restauradas' : 'Restaurar padrões'}
        </button>
      </div>

    </div>
  )
}

/* ─── AI Tab ────────────────────────────────────────── */

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--sap-subtle)', color: '#fff',
          fontSize: 10, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default', userSelect: 'none', flexShrink: 0
        }}
      >i</span>
      {show && (
        <div style={{
          position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)',
          zIndex: 200, width: 300, padding: '10px 12px',
          background: '#2d3748', color: '#e2e8f0', borderRadius: 6,
          fontSize: 12, lineHeight: 1.6, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)', whiteSpace: 'pre-wrap'
        }}>
          {text}
        </div>
      )}
    </span>
  )
}

const PROVIDER_INITIALS = {
  claude_integration: 'CC', codex_integration: 'CX',
  claude: 'CL', gemini: 'GM', openai: 'OA', groq: 'GR'
}

function ProviderCard({ id, meta, p, ts, ss, testMsg, showKey, onTest, onSave, onToggle, onKeyChange, onModelChange, onShowKey, isLast }) {
  if (meta.isIntegration) {
    return (
      <div style={{
        background: 'var(--sap-base)',
        borderBottom: isLast ? 'none' : '1px solid var(--sap-border)',
        padding: '20px 20px 16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 4, background: meta.color || 'var(--sap-shell)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 0.5, flexShrink: 0
            }}>
              {PROVIDER_INITIALS[id]}
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sap-text)' }}>{meta.label}</span>
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--sap-subtle)', fontStyle: 'italic' }}>CLI local</span>
            </div>
            <StatusPill enabled={p.enabled} />
          </div>
          <Toggle checked={p.enabled} onChange={onToggle} />
        </div>

        {/* Description */}
        <p style={{ fontSize: 12, color: 'var(--sap-subtle)', margin: '0 0 12px', lineHeight: 1.4 }}>
          {meta.description}
        </p>

        {/* Feedback */}
        {ts !== 'idle' && (
          <div style={{
            marginBottom: 10, padding: '7px 12px', borderRadius: 4, fontSize: 12,
            background: ts === 'ok' ? '#f3faf5' : ts === 'error' ? '#fdf3f3' : 'var(--sap-hover-bg)',
            color: ts === 'ok' ? 'var(--sap-positive)' : ts === 'error' ? 'var(--sap-negative)' : 'var(--sap-subtle)',
            border: `1px solid ${ts === 'ok' ? '#c3e6cb' : ts === 'error' ? '#f5c6cb' : 'var(--sap-border)'}`
          }}>
            {ts === 'loading' ? 'Verificando instalação...' : testMsg}
          </div>
        )}
        {ss === 'error' && (
          <div style={{
            marginBottom: 10, padding: '7px 12px', borderRadius: 4, fontSize: 12,
            background: '#fdf3f3', color: 'var(--sap-negative)', border: '1px solid #f5c6cb'
          }}>
            Erro ao salvar: {testMsg}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onTest}
            disabled={ts === 'loading'}
            style={{
              padding: '7px 16px', borderRadius: 4, fontSize: 13,
              border: '1px solid var(--sap-primary)', background: 'transparent', color: 'var(--sap-primary)',
              cursor: ts === 'loading' ? 'not-allowed' : 'pointer', fontWeight: 400, transition: 'all 0.15s'
            }}
          >
            {ts === 'loading' ? 'Verificando...' : 'Verificar instalação'}
          </button>
          <button
            onClick={onSave}
            disabled={ss === 'loading'}
            style={{
              padding: '7px 16px', borderRadius: 4, fontSize: 13, border: 'none',
              background: ss === 'ok' ? 'var(--sap-positive)' : 'var(--sap-primary)', color: '#fff',
              cursor: ss === 'loading' ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'background 0.2s', minWidth: 72
            }}
          >
            {ss === 'loading' ? 'Salvando...' : ss === 'ok' ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>
    )
  }

  // API provider card
  return (
    <div style={{
      background: 'var(--sap-base)',
      borderBottom: isLast ? 'none' : '1px solid var(--sap-border)',
      padding: '20px 20px 16px'
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 4, background: 'var(--sap-shell)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 0.5, flexShrink: 0
          }}>
            {PROVIDER_INITIALS[id]}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sap-text)' }}>{meta.label}</span>
          <StatusPill enabled={p.enabled} />
        </div>
        <Toggle checked={p.enabled} onChange={onToggle} />
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, marginBottom: 12 }}>
        <div>
          <FieldLabel>API Key</FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={p.apiKey}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder={meta.placeholder}
              style={{
                width: '100%', padding: '8px 36px 8px 10px',
                border: '1px solid var(--sap-border)', borderRadius: 4,
                background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
                fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--sap-primary)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sap-border)')}
            />
            <button
              onClick={onShowKey}
              title={showKey ? 'Ocultar' : 'Mostrar'}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sap-subtle)', fontSize: 12, padding: 2, lineHeight: 1
              }}
            >
              {showKey ? '●●' : '○○'}
            </button>
          </div>
        </div>
        <div>
          <FieldLabel>Modelo</FieldLabel>
          <input
            type="text"
            value={p.model}
            onChange={(e) => onModelChange(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px',
              border: '1px solid var(--sap-border)', borderRadius: 4,
              background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
              fontSize: 13, outline: 'none', boxSizing: 'border-box'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--sap-primary)')}
            onBlur={(e)  => (e.target.style.borderColor = 'var(--sap-border)')}
          />
        </div>
      </div>

      {/* Feedback */}
      {ts !== 'idle' && (
        <div style={{
          marginBottom: 10, padding: '7px 12px', borderRadius: 4, fontSize: 12,
          background: ts === 'ok' ? '#f3faf5' : ts === 'error' ? '#fdf3f3' : 'var(--sap-hover-bg)',
          color: ts === 'ok' ? 'var(--sap-positive)' : ts === 'error' ? 'var(--sap-negative)' : 'var(--sap-subtle)',
          border: `1px solid ${ts === 'ok' ? '#c3e6cb' : ts === 'error' ? '#f5c6cb' : 'var(--sap-border)'}`
        }}>
          {ts === 'loading' ? 'Verificando conexão...' : testMsg}
        </div>
      )}
      {ss === 'error' && (
        <div style={{
          marginBottom: 10, padding: '7px 12px', borderRadius: 4, fontSize: 12,
          background: '#fdf3f3', color: 'var(--sap-negative)', border: '1px solid #f5c6cb'
        }}>
          Erro ao salvar: {testMsg}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onTest}
          disabled={ts === 'loading' || !p.apiKey.trim()}
          style={{
            padding: '7px 16px', borderRadius: 4, fontSize: 13,
            border: '1px solid var(--sap-primary)', background: 'transparent', color: 'var(--sap-primary)',
            cursor: ts === 'loading' || !p.apiKey.trim() ? 'not-allowed' : 'pointer',
            opacity: !p.apiKey.trim() ? 0.45 : 1,
            fontWeight: 400, transition: 'all 0.15s'
          }}
        >
          {ts === 'loading' ? 'Testando...' : 'Testar conexão'}
        </button>
        <button
          onClick={onSave}
          disabled={ss === 'loading'}
          style={{
            padding: '7px 16px', borderRadius: 4, fontSize: 13, border: 'none',
            background: ss === 'ok' ? 'var(--sap-positive)' : 'var(--sap-primary)', color: '#fff',
            cursor: ss === 'loading' ? 'not-allowed' : 'pointer',
            fontWeight: 600, transition: 'background 0.2s', minWidth: 72
          }}
        >
          {ss === 'loading' ? 'Salvando...' : ss === 'ok' ? 'Salvo' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function AiTab() {
  const { providers, loadProviders, updateLocal, saveProvider, testProvider, sapVersion, setSapVersion } = useAiStore()
  const [testState, setTestState] = useState({})
  const [testMsg, setTestMsg]     = useState({})
  const [saveState, setSaveState] = useState({})
  const [showKey, setShowKey]     = useState({})

  useEffect(() => { loadProviders() }, [])

  const handleTest = async (id) => {
    setTestState((s) => ({ ...s, [id]: 'loading' }))
    setTestMsg((s) => ({ ...s, [id]: '' }))
    const res = await testProvider(id)
    setTestState((s) => ({ ...s, [id]: res.success ? 'ok' : 'error' }))
    setTestMsg((s) => ({ ...s, [id]: res.success ? (AI_PROVIDERS[id]?.isIntegration ? 'CLI instalado e disponível.' : 'Conexão estabelecida com sucesso.') : res.error }))
  }

  const handleSave = async (id) => {
    setSaveState((s) => ({ ...s, [id]: 'loading' }))
    const res = await saveProvider(id)
    setSaveState((s) => ({ ...s, [id]: res.success ? 'ok' : 'error' }))
    if (!res.success) setTestMsg((s) => ({ ...s, [id]: res.error }))
    setTimeout(() => setSaveState((s) => ({ ...s, [id]: 'idle' })), 2500)
  }

  const allIds = [...INTEGRATION_PROVIDER_IDS, ...API_PROVIDER_IDS]

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
      {/* Versão SAP */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          Ambiente SAP
        </div>
        <div style={{ border: '1px solid var(--sap-border)', borderRadius: 6, padding: '16px 20px', background: 'var(--sap-base)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--sap-text)' }}>Versão SAP do ambiente</label>
            <InfoTooltip text={'Para verificar a versão do seu SAP:\n• Transação SM51 → campo "Release"\n• Menu Sistema → Status (barra superior)\n• Transação SE80 → Sobre\n\nExemplo: "740" = ECC 6.0, "756" = S/4HANA 2022'} />
          </div>
          <select
            value={sapVersion}
            onChange={e => setSapVersion(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 13,
              border: '1px solid var(--sap-border)', borderRadius: 4,
              background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
              outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="ECC 6.0">SAP ECC 6.0 (Release 700–740)</option>
            <option value="S/4HANA 1511">SAP S/4HANA 1511 (Release 750)</option>
            <option value="S/4HANA 1610">SAP S/4HANA 1610 (Release 751)</option>
            <option value="S/4HANA 1709">SAP S/4HANA 1709 (Release 752)</option>
            <option value="S/4HANA 1809">SAP S/4HANA 1809 (Release 753)</option>
            <option value="S/4HANA 1909">SAP S/4HANA 1909 (Release 754)</option>
            <option value="S/4HANA 2020">SAP S/4HANA 2020 (Release 755)</option>
            <option value="S/4HANA 2021">SAP S/4HANA 2021 (Release 756)</option>
            <option value="S/4HANA 2022">SAP S/4HANA 2022 (Release 757)</option>
            <option value="S/4HANA 2023">SAP S/4HANA 2023 (Release 758)</option>
            <option value="S/4HANA 2024">SAP S/4HANA 2024 (Release 759)</option>
            <option value="BTP ABAP">SAP BTP ABAP Environment</option>
          </select>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--sap-subtle)', margin: '8px 0 0' }}>
            Informa ao modelo a versão do seu ambiente para gerar código compatível. Passe o cursor no ℹ para ver como verificar.
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--sap-subtle)', marginBottom: 20 }}>
        Configure os provedores de IA. Integrações CLI usam ferramentas instaladas localmente (sem API key).
        Chaves de API são armazenadas de forma segura por usuário no banco de dados.
      </p>

      {/* Integrações CLI */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Integrações CLI
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden', marginBottom: 24 }}>
        {INTEGRATION_PROVIDER_IDS.map((id, idx) => {
          const meta = AI_PROVIDERS[id]
          const p    = providers[id] || { enabled: false }
          return (
            <ProviderCard
              key={id} id={id} meta={meta} p={p}
              ts={testState[id] || 'idle'} ss={saveState[id] || 'idle'}
              testMsg={testMsg[id] || ''} showKey={false}
              isLast={idx === INTEGRATION_PROVIDER_IDS.length - 1}
              onTest={() => handleTest(id)}
              onSave={() => handleSave(id)}
              onToggle={(v) => updateLocal(id, { enabled: v })}
            />
          )
        })}
      </div>

      {/* Provedores API */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Provedores via API
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden' }}>
        {API_PROVIDER_IDS.map((id, idx) => {
          const meta = AI_PROVIDERS[id]
          const p    = providers[id] || { apiKey: '', model: meta.defaultModel, enabled: false }
          return (
            <ProviderCard
              key={id} id={id} meta={meta} p={p}
              ts={testState[id] || 'idle'} ss={saveState[id] || 'idle'}
              testMsg={testMsg[id] || ''} showKey={showKey[id] || false}
              isLast={idx === API_PROVIDER_IDS.length - 1}
              onTest={() => handleTest(id)}
              onSave={() => handleSave(id)}
              onToggle={(v) => updateLocal(id, { enabled: v })}
              onKeyChange={(v) => updateLocal(id, { apiKey: v })}
              onModelChange={(v) => updateLocal(id, { model: v })}
              onShowKey={() => setShowKey((s) => ({ ...s, [id]: !s[id] }))}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ─── Sub-components ────────────────────────────────── */
function StatusPill({ enabled }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
      background: enabled ? '#eaf6ee' : 'var(--sap-hover-bg)',
      color: enabled ? 'var(--sap-positive)' : 'var(--sap-subtle)',
      border: `1px solid ${enabled ? '#c3e6cb' : 'var(--sap-border)'}`
    }}>
      {enabled ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? 'var(--sap-primary)' : 'var(--sap-border)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: '#ffffff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </div>
  )
}

/* ─── Calculadora Tab ───────────────────────────────── */

const CLAUDE_MODELS = [
  {
    id: 'haiku',
    name: 'Haiku 4.5',
    badge: null,
    desc: 'Alta velocidade, tarefas simples em escala',
    inputUsd: 1.00,
    outputUsd: 5.00,
    context: '200K tokens',
    color: '#107e3e'
  },
  {
    id: 'sonnet',
    name: 'Sonnet 4.6',
    badge: 'Recomendado',
    desc: 'Equilíbrio ideal entre custo e performance',
    inputUsd: 3.00,
    outputUsd: 15.00,
    context: '1M tokens',
    color: '#0070f2'
  },
  {
    id: 'opus',
    name: 'Opus 4.6',
    badge: 'Mais poderoso',
    desc: 'Raciocínio complexo, agentes, código avançado',
    inputUsd: 5.00,
    outputUsd: 25.00,
    context: '1M tokens',
    color: '#8b5cf6'
  }
]

const PROGRAM_PRESETS = [
  { id: 'simples',  label: 'Simples',  lines: '1.000 – 2.000 linhas', inputK: 5,  outputK: 18 },
  { id: 'medio',    label: 'Médio',    lines: '2.000 – 5.000 linhas', inputK: 8,  outputK: 42 },
  { id: 'complexo', label: 'Complexo', lines: '5.000+ linhas',        inputK: 12, outputK: 90 }
]

const SUBSCRIPTION_PLANS = [
  { users: 10, monthly: 1056,  annual: 12676, savings: 3169 },
  { users: 20, monthly: 2113,  annual: 25351, savings: 6338 },
  { users: 30, monthly: 3169,  annual: 38027, savings: 9508 }
]

function NumInput({ value, onChange, min = 1, step = 1 }) {
  return (
    <input
      type="number" min={min} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value) || min)}
      style={{
        width: '100%', padding: '7px 10px', fontSize: 13,
        border: '1px solid var(--sap-border)', borderRadius: 4,
        background: 'var(--sap-bg)', color: 'var(--sap-text)',
        fontFamily: 'monospace', boxSizing: 'border-box'
      }}
    />
  )
}

function CalculadoraTab() {
  const [selectedModel, setSelectedModel] = useState('sonnet')
  const [selectedPreset, setSelectedPreset] = useState('medio')
  const [inputK, setInputK]           = useState(8)
  const [outputK, setOutputK]         = useState(42)
  const [genPerMonth, setGenPerMonth] = useState(50)
  const [brlRate, setBrlRate]         = useState(5.50)

  const model = CLAUDE_MODELS.find(m => m.id === selectedModel)

  const handlePreset = (p) => {
    setSelectedPreset(p.id)
    setInputK(p.inputK)
    setOutputK(p.outputK)
  }

  const handleModelSelect = (id) => {
    setSelectedModel(id)
  }

  // Custo por geração em USD:  (inputK * priceInput + outputK * priceOutput) / 1000
  const costPerGenUsd = (inputK * model.inputUsd + outputK * model.outputUsd) / 1000
  const monthlyUsd    = costPerGenUsd * genPerMonth
  const annualUsd     = monthlyUsd * 12
  const costPerGenBrl = costPerGenUsd * brlRate
  const monthlyBrl    = monthlyUsd    * brlRate
  const annualBrl     = annualUsd     * brlRate

  const fmtBrl = (n) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtUsd = (n) => `$ ${n.toFixed(4)}`

  const RESULT_CARDS = [
    { label: 'Por geração', usd: costPerGenUsd, brl: costPerGenBrl },
    { label: 'Mensal',      usd: monthlyUsd,    brl: monthlyBrl    },
    { label: 'Anual',       usd: annualUsd,     brl: annualBrl     }
  ]

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

      {/* ── Modelos Claude ──────────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-title">Claude API — Modelos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {CLAUDE_MODELS.map(m => {
            const active = selectedModel === m.id
            return (
              <button
                key={m.id}
                onClick={() => handleModelSelect(m.id)}
                style={{
                  padding: '14px 16px', borderRadius: 6, cursor: 'pointer',
                  border: `2px solid ${active ? m.color : 'var(--sap-border)'}`,
                  background: active ? `${m.color}0d` : 'var(--sap-base)',
                  textAlign: 'left', transition: 'all 0.15s', position: 'relative'
                }}
              >
                {m.badge && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: m.color, padding: '2px 7px', borderRadius: 3
                  }}>{m.badge}</span>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, color: active ? m.color : 'var(--sap-text)' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginBottom: 10, lineHeight: 1.4 }}>
                  {m.desc}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[{ lbl: 'Input', val: m.inputUsd }, { lbl: 'Output', val: m.outputUsd }].map(r => (
                    <div key={r.lbl} style={{ background: 'var(--sap-bg)', borderRadius: 4, padding: '5px 8px' }}>
                      <div style={{ fontSize: 10, color: 'var(--sap-subtle)' }}>{r.lbl}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
                        ${r.val.toFixed(2)}/MTok
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--sap-subtle)' }}>
                  Contexto: {m.context}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Simulador ───────────────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-title">Simulador de Custo</div>

        <FieldLabel>Tipo de programa ABAP</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {PROGRAM_PRESETS.map(p => {
            const active = selectedPreset === p.id
            return (
              <button
                key={p.id}
                onClick={() => handlePreset(p)}
                style={{
                  flex: 1, padding: '10px 12px', cursor: 'pointer',
                  border: `1px solid ${active ? model.color : 'var(--sap-border)'}`,
                  borderRadius: 6,
                  background: active ? `${model.color}0d` : 'var(--sap-base)',
                  textAlign: 'left', transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: active ? model.color : 'var(--sap-text)' }}>
                  {p.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 2 }}>{p.lines}</div>
                <div style={{ fontSize: 10, color: 'var(--sap-subtle)', marginTop: 4, fontFamily: 'monospace' }}>
                  ~{p.inputK}k in / ~{p.outputK}k out
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          <div>
            <FieldLabel>Input (k tokens)</FieldLabel>
            <NumInput value={inputK} onChange={v => { setSelectedPreset(null); setInputK(v) }} />
          </div>
          <div>
            <FieldLabel>Output (k tokens)</FieldLabel>
            <NumInput value={outputK} onChange={v => { setSelectedPreset(null); setOutputK(v) }} />
          </div>
          <div>
            <FieldLabel>Gerações / mês</FieldLabel>
            <NumInput value={genPerMonth} onChange={setGenPerMonth} />
          </div>
          <div>
            <FieldLabel>Câmbio (R$ / US$)</FieldLabel>
            <NumInput value={brlRate} onChange={setBrlRate} min={0.01} step={0.01} />
          </div>
        </div>

        {/* Resultado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {RESULT_CARDS.map(r => (
            <div key={r.label} style={{
              padding: '16px', borderRadius: 6,
              background: `${model.color}0a`,
              border: `1px solid ${model.color}33`
            }}>
              <div style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {r.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: model.color, fontFamily: 'monospace', lineHeight: 1 }}>
                {fmtBrl(r.brl)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 5, fontFamily: 'monospace' }}>
                {fmtUsd(r.usd)} USD
              </div>
            </div>
          ))}
        </div>

        {/* Breakdown */}
        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: 'var(--sap-bg)', border: '1px solid var(--sap-border)',
          borderRadius: 4, fontSize: 11, color: 'var(--sap-subtle)', lineHeight: 1.7
        }}>
          Modelo: <strong style={{ color: model.color }}>{model.name}</strong>
          &nbsp;·&nbsp; Input: {inputK}k tok × ${model.inputUsd}/MTok
          &nbsp;·&nbsp; Output: {outputK}k tok × ${model.outputUsd}/MTok
          &nbsp;·&nbsp; {genPerMonth} gerações/mês
          &nbsp;·&nbsp; Câmbio: R${brlRate.toFixed(2)}
        </div>
      </div>

      {/* ── Assinatura ──────────────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="settings-section-title">Assinatura Abapfy</div>
        <div style={{ border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--sap-bg)' }}>
                {['Usuários', 'Mensal', 'Anual total', 'Economia anual'].map(h => (
                  <th key={h} style={{
                    padding: '9px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)',
                    textTransform: 'uppercase', letterSpacing: 0.4,
                    borderBottom: '1px solid var(--sap-border)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUBSCRIPTION_PLANS.map((p, i) => (
                <tr key={p.users} style={{ background: i % 2 === 0 ? 'var(--sap-base)' : 'var(--sap-bg)' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--sap-text)' }}>
                    {p.users} usuários
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: 'var(--sap-text)' }}>
                    R$ {p.monthly.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: 'var(--sap-text)' }}>
                    R$ {p.annual.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#107e3e' }}>
                    ↓ R$ {p.savings.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--sap-subtle)' }}>
          * Preços em reais. Desconto aplicado no plano anual em relação ao mensal acumulado.
        </div>
      </div>

    </div>
  )
}

/* ─── Estimativa Tab ────────────────────────────────── */
const estInputStyle = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '1px solid var(--sap-border)', borderRadius: 4,
  background: 'var(--sap-base)', color: 'var(--sap-text)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
}
const estLabelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4
}
const estThStyle = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px',
  borderBottom: '2px solid var(--sap-border)', background: 'var(--sap-bg)',
  whiteSpace: 'nowrap', userSelect: 'none'
}
const estTdStyle = {
  padding: '7px 12px', fontSize: 13, borderBottom: '1px solid var(--sap-border)',
  color: 'var(--sap-text)'
}

function EstimativaTab() {
  const { parametros, loading, loadParametros, addParametro, updateParametro, deleteParametro } =
    useEstimationParametersStore()
  const [modal, setModal] = useState(null)   // null | { mode: 'add' | 'edit', id?: string }
  const [form, setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const [importErr, setImportErr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { loadParametros() }, [])

  const emptyForm = { tipo: '', objeto: '', complexidade: 'Média', analise_ef: 0, espec: 0, codific: 0, testes: 0 }

  const openAdd = () => {
    setForm({ ...emptyForm })
    setModal({ mode: 'add' })
  }

  const openEdit = (row) => {
    setForm({ ...row })
    setModal({ mode: 'edit', id: row.id })
  }

  const handleSave = async () => {
    setSaving(true)
    if (modal.mode === 'add') {
      await addParametro(form)
    } else {
      await updateParametro(modal.id, form)
    }
    setSaving(false)
    setModal(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este parâmetro?')) return
    await deleteParametro(id)
  }

  const handleCsvImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportErr(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target.result
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) throw new Error('CSV deve ter cabeçalho e ao menos uma linha de dados.')
        const sep = lines[0].includes(';') ? ';' : ','
        for (const line of lines.slice(1)) {
          const p = line.split(sep).map(s => s.trim().replace(/^"|"$/g, ''))
          if (p.length < 6) continue
          await addParametro({
            tipo: p[0] || '', objeto: p[1] || '', complexidade: p[2] || 'Média',
            analise_ef: parseFloat(p[3]) || 0,
            espec:      parseFloat(p[4]) || 0,
            codific:    parseFloat(p[5]) || 0,
            testes:     parseFloat(p[6]) || 0
          })
        }
      } catch (err) {
        setImportErr(err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const rowTotal = (p) => {
    const t = parseFloat(p.analise_ef || 0) + parseFloat(p.espec || 0) + parseFloat(p.codific || 0) + parseFloat(p.testes || 0)
    return t.toFixed(1)
  }

  const complexBadge = (c) => {
    const map = {
      'Alta':  { bg: 'rgba(187,0,0,0.10)',   color: 'var(--sap-negative)' },
      'Baixa': { bg: 'rgba(16,126,62,0.10)',  color: 'var(--sap-positive)' },
      'Média': { bg: 'rgba(233,115,12,0.10)', color: 'var(--sap-critical)' }
    }
    const s = map[c] || map['Média']
    return (
      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
        {c}
      </span>
    )
  }

  const sumCol = (col) => parametros.reduce((acc, p) => acc + parseFloat(p[col] || 0), 0).toFixed(1)
  const sumTotal = () => parametros.reduce((acc, p) => acc + parseFloat(p.analise_ef || 0) + parseFloat(p.espec || 0) + parseFloat(p.codific || 0) + parseFloat(p.testes || 0), 0).toFixed(1)

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

      {/* ── Modal add/edit ── */}
      {modal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: 'var(--sap-base)', borderRadius: 8, width: 520, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sap-border)', fontWeight: 600, fontSize: 15 }}>
              {modal.mode === 'add' ? 'Novo Parâmetro' : 'Editar Parâmetro'}
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={estLabelStyle}>Tipo</label>
                  <input value={form.tipo || ''} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={estInputStyle} placeholder="Ex: Report, Função, Classe..." />
                </div>
                <div>
                  <label style={estLabelStyle}>Objeto</label>
                  <input value={form.objeto || ''} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} style={estInputStyle} placeholder="Nome do objeto" />
                </div>
              </div>

              <div>
                <label style={estLabelStyle}>Complexidade</label>
                <select value={form.complexidade || 'Média'} onChange={e => setForm(f => ({ ...f, complexidade: e.target.value }))} style={estInputStyle}>
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={estLabelStyle}>Análise EF (h)</label>
                  <input type="number" min={0} step={0.5} value={form.analise_ef ?? 0} onChange={e => setForm(f => ({ ...f, analise_ef: parseFloat(e.target.value) || 0 }))} style={{ ...estInputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={estLabelStyle}>Espec. (h)</label>
                  <input type="number" min={0} step={0.5} value={form.espec ?? 0} onChange={e => setForm(f => ({ ...f, espec: parseFloat(e.target.value) || 0 }))} style={{ ...estInputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={estLabelStyle}>Codific. (h)</label>
                  <input type="number" min={0} step={0.5} value={form.codific ?? 0} onChange={e => setForm(f => ({ ...f, codific: parseFloat(e.target.value) || 0 }))} style={{ ...estInputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={estLabelStyle}>Testes (h)</label>
                  <input type="number" min={0} step={0.5} value={form.testes ?? 0} onChange={e => setForm(f => ({ ...f, testes: parseFloat(e.target.value) || 0 }))} style={{ ...estInputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--sap-bg)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--sap-primary)', fontSize: 16 }}>
                  {(parseFloat(form.analise_ef || 0) + parseFloat(form.espec || 0) + parseFloat(form.codific || 0) + parseFloat(form.testes || 0)).toFixed(1)} h
                </span>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--sap-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ fontSize: 13, padding: '6px 16px', border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ fontSize: 13, padding: '6px 18px', border: 'none', borderRadius: 4, background: 'var(--sap-primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section card ── */}
      <div className="settings-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="settings-section-title">Parâmetros de Estimativa</div>
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 3 }}>
              Tabela compartilhada — visível e editável por todos os usuários registrados
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCsvImport} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12, padding: '5px 14px', border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Importar CSV
            </button>
            <button
              onClick={openAdd}
              style={{ fontSize: 12, padding: '5px 14px', border: '1px solid var(--sap-primary)', borderRadius: 4, background: 'transparent', color: 'var(--sap-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Nova Linha
            </button>
          </div>
        </div>

        {importErr && (
          <div style={{ padding: '8px 12px', background: 'rgba(187,0,0,0.08)', border: '1px solid var(--sap-negative)', borderRadius: 4, color: 'var(--sap-negative)', fontSize: 12, marginBottom: 12 }}>
            {importErr}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sap-subtle)', fontSize: 13 }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--sap-border)', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ ...estThStyle, width: 130 }}>Tipo</th>
                  <th style={estThStyle}>Objeto</th>
                  <th style={{ ...estThStyle, width: 110 }}>Complexidade</th>
                  <th style={{ ...estThStyle, width: 95, textAlign: 'right' }}>Análise EF</th>
                  <th style={{ ...estThStyle, width: 85, textAlign: 'right' }}>Espec.</th>
                  <th style={{ ...estThStyle, width: 85, textAlign: 'right' }}>Codific.</th>
                  <th style={{ ...estThStyle, width: 85, textAlign: 'right' }}>Testes</th>
                  <th style={{ ...estThStyle, width: 85, textAlign: 'right' }}>Total</th>
                  <th style={{ ...estThStyle, width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {parametros.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...estTdStyle, textAlign: 'center', color: 'var(--sap-subtle)', padding: '32px 12px' }}>
                      Nenhum parâmetro cadastrado. Clique em "+ Nova Linha" ou importe um CSV.
                    </td>
                  </tr>
                ) : parametros.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 1 ? 'var(--sap-bg)' : 'var(--sap-base)' }}>
                    <td style={estTdStyle}>{p.tipo}</td>
                    <td style={{ ...estTdStyle, fontFamily: 'monospace', fontSize: 12 }}>{p.objeto}</td>
                    <td style={estTdStyle}>{complexBadge(p.complexidade)}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(p.analise_ef || 0).toFixed(1)}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(p.espec || 0).toFixed(1)}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(p.codific || 0).toFixed(1)}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(p.testes || 0).toFixed(1)}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--sap-primary)' }}>{rowTotal(p)}</td>
                    <td style={{ ...estTdStyle, padding: '4px 8px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(p)} title="Editar" style={{ width: 26, height: 26, background: 'transparent', border: '1px solid var(--sap-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                        <button onClick={() => handleDelete(p.id)} title="Remover" style={{ width: 26, height: 26, background: 'transparent', border: '1px solid var(--sap-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--sap-negative)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {parametros.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--sap-bg)' }}>
                    <td colSpan={3} style={{ ...estTdStyle, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--sap-subtle)', letterSpacing: '0.3px' }}>
                      Total geral ({parametros.length} linha{parametros.length !== 1 ? 's' : ''})
                    </td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{sumCol('analise_ef')}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{sumCol('espec')}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{sumCol('codific')}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{sumCol('testes')}</td>
                    <td style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--sap-primary)' }}>{sumTotal()}</td>
                    <td style={estTdStyle} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--sap-subtle)' }}>
          Formato CSV esperado: <code style={{ fontFamily: 'monospace', background: 'var(--sap-bg)', padding: '1px 5px', borderRadius: 3 }}>Tipo;Objeto;Complexidade;Analise_EF;Espec;Codific;Testes</code>
          {' '}(separador <code style={{ fontFamily: 'monospace', background: 'var(--sap-bg)', padding: '1px 5px', borderRadius: 3 }}>;</code> ou <code style={{ fontFamily: 'monospace', background: 'var(--sap-bg)', padding: '1px 5px', borderRadius: 3 }}>,</code>)
        </div>
      </div>
    </div>
  )
}

/* ─── Cliente Parametros Section ────────────────────── */
const CLI_FIELDS = [
  { key: 'levantamento',   label: 'Levantam.' },
  { key: 'impl_proposal',  label: 'Impl.\nProposal' },
  { key: 'esp_func',       label: 'Esp.\nFunc.' },
  { key: 'esp_tec',        label: 'Esp.\nTéc.' },
  { key: 'codific',        label: 'Codific.' },
  { key: 'traducao_en',    label: 'Tradução\nEN' },
  { key: 'traducao_es',    label: 'Tradução\nES' },
  { key: 'teste_unitario', label: 'Teste\nUnitário' },
  { key: 'teste_qas',      label: 'Teste\n(QAS)' },
  { key: 'bpp_pt',         label: 'BPP\nPT' },
  { key: 'bpp_en',         label: 'BPP\nEN' },
  { key: 'bpp_es',         label: 'BPP\nES' },
  { key: 'teste_volume',   label: 'Teste\nVolume' },
  { key: 'homologacao',    label: 'Homolo-\ngação' },
  { key: 'access_control', label: 'Access\nControl' },
  { key: 'homologacao_2',  label: 'Homolo-\nçao' },
  { key: 'go_live',        label: 'Go-live' },
  { key: 'documentacao',   label: 'Documen-\ntação' },
  { key: 'gerencia',       label: 'Gerência' }
]

const CLI_EMPTY = CLI_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), { empresa: '' })

const MODAL_GROUPS = [
  { label: null, fields: [{ key: 'empresa', label: 'Empresa', type: 'text', cols: 4 }] },
  {
    label: 'Fases Iniciais',
    fields: [
      { key: 'levantamento',  label: 'Levantam.' },
      { key: 'impl_proposal', label: 'Impl. Proposal' },
      { key: 'esp_func',      label: 'Esp. Func.' },
      { key: 'esp_tec',       label: 'Esp. Téc.' },
      { key: 'codific',       label: 'Codific.' }
    ]
  },
  {
    label: 'Tradução',
    fields: [
      { key: 'traducao_en', label: 'Tradução EN' },
      { key: 'traducao_es', label: 'Tradução ES' }
    ]
  },
  {
    label: 'Testes',
    fields: [
      { key: 'teste_unitario', label: 'Teste Unitário' },
      { key: 'teste_qas',      label: 'Teste (QAS)' },
      { key: 'teste_volume',   label: 'Teste Volume' }
    ]
  },
  {
    label: 'BPP',
    fields: [
      { key: 'bpp_pt', label: 'BPP PT' },
      { key: 'bpp_en', label: 'BPP EN' },
      { key: 'bpp_es', label: 'BPP ES' }
    ]
  },
  {
    label: 'Homologação / Controle',
    fields: [
      { key: 'homologacao',    label: 'Homologação' },
      { key: 'access_control', label: 'Access Control' },
      { key: 'homologacao_2',  label: 'Homologaçao' }
    ]
  },
  {
    label: 'Finalização',
    fields: [
      { key: 'go_live',       label: 'Go-live' },
      { key: 'documentacao',  label: 'Documentação' },
      { key: 'gerencia',      label: 'Gerência' }
    ]
  }
]

function ClienteParametrosTab() {
  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
      <ClienteParametrosSection />
    </div>
  )
}

function ClienteParametrosSection() {
  const { clientes, loading, loadClientes, addCliente, updateCliente, deleteCliente } =
    useClienteParametrosStore()
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [importErr, setImportErr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { loadClientes() }, [])

  const openAdd  = () => { setForm({ ...CLI_EMPTY }); setModal({ mode: 'add' }) }
  const openEdit = (row) => { setForm({ ...row }); setModal({ mode: 'edit', id: row.id }) }

  const handleSave = async () => {
    setSaving(true)
    if (modal.mode === 'add') await addCliente(form)
    else await updateCliente(modal.id, form)
    setSaving(false)
    setModal(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este parâmetro de cliente?')) return
    await deleteCliente(id)
  }

  const handleCsvImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportErr(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) throw new Error('CSV deve ter cabeçalho e ao menos uma linha.')
        const sep = lines[0].includes(';') ? ';' : ','
        const keys = ['empresa', ...CLI_FIELDS.map(f => f.key)]
        for (const line of lines.slice(1)) {
          const parts = line.split(sep).map(s => s.trim().replace(/^"|"$/g, ''))
          if (!parts[0]) continue
          const row = {}
          keys.forEach((k, i) => { row[k] = parts[i] ?? '' })
          await addCliente(row)
        }
      } catch (err) {
        setImportErr(err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const numVal = (row, key) => parseFloat(row[key] || 0).toFixed(1)

  return (
    <>
      {/* ── Modal ── */}
      {modal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: 'var(--sap-base)', borderRadius: 8, width: 680, maxWidth: '96vw', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sap-border)', fontWeight: 600, fontSize: 15 }}>
              {modal.mode === 'add' ? 'Novo Parâmetro de Cliente' : 'Editar Parâmetro de Cliente'}
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {MODAL_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.label && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--sap-border)' }}>
                      {group.label}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.fields[0]?.cols || group.fields.length}, 1fr)`, gap: 10 }}>
                    {group.fields.map(f => (
                      <div key={f.key} style={{ gridColumn: f.cols ? `span ${f.cols}` : undefined }}>
                        <label style={estLabelStyle}>{f.label}</label>
                        {f.type === 'text' ? (
                          <input
                            value={form[f.key] || ''}
                            onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                            style={estInputStyle}
                            placeholder="Nome da empresa / cliente"
                          />
                        ) : (
                          <input
                            type="number" min={0} step={0.5}
                            value={form[f.key] ?? 0}
                            onChange={e => setForm(v => ({ ...v, [f.key]: parseFloat(e.target.value) || 0 }))}
                            style={{ ...estInputStyle, fontFamily: 'monospace' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--sap-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ fontSize: 13, padding: '6px 16px', border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ fontSize: 13, padding: '6px 18px', border: 'none', borderRadius: 4, background: 'var(--sap-primary)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section card ── */}
      <div className="settings-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="settings-section-title">Parâmetros de Cliente</div>
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 3 }}>
              Tabela compartilhada — visível e editável por todos os usuários registrados
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCsvImport} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12, padding: '5px 14px', border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Importar CSV
            </button>
            <button
              onClick={openAdd}
              style={{ fontSize: 12, padding: '5px 14px', border: '1px solid var(--sap-primary)', borderRadius: 4, background: 'transparent', color: 'var(--sap-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Nova Linha
            </button>
          </div>
        </div>

        {importErr && (
          <div style={{ padding: '8px 12px', background: 'rgba(187,0,0,0.08)', border: '1px solid var(--sap-negative)', borderRadius: 4, color: 'var(--sap-negative)', fontSize: 12, marginBottom: 12 }}>
            {importErr}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sap-subtle)', fontSize: 13 }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--sap-border)', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1560 }}>
              <thead>
                <tr>
                  <th style={{ ...estThStyle, width: 140, fontSize: 11 }}>Empresa</th>
                  {CLI_FIELDS.map(f => (
                    <th key={f.key} style={{ ...estThStyle, width: 72, textAlign: 'right', fontSize: 10, whiteSpace: 'pre-line', lineHeight: 1.3 }}>
                      {f.label}
                    </th>
                  ))}
                  <th style={{ ...estThStyle, width: 64 }}></th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={CLI_FIELDS.length + 2} style={{ ...estTdStyle, textAlign: 'center', color: 'var(--sap-subtle)', padding: '32px 12px' }}>
                      Nenhum parâmetro de cliente cadastrado. Clique em "+ Nova Linha" ou importe um CSV.
                    </td>
                  </tr>
                ) : clientes.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 1 ? 'var(--sap-bg)' : 'var(--sap-base)' }}>
                    <td style={{ ...estTdStyle, fontWeight: 600, fontSize: 12 }}>{c.empresa}</td>
                    {CLI_FIELDS.map(f => (
                      <td key={f.key} style={{ ...estTdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: 11 }}>
                        {numVal(c, f.key)}
                      </td>
                    ))}
                    <td style={{ ...estTdStyle, padding: '4px 8px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(c)} title="Editar" style={{ width: 26, height: 26, background: 'transparent', border: '1px solid var(--sap-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                        <button onClick={() => handleDelete(c.id)} title="Remover" style={{ width: 26, height: 26, background: 'transparent', border: '1px solid var(--sap-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--sap-negative)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--sap-subtle)' }}>
          Formato CSV: <code style={{ fontFamily: 'monospace', background: 'var(--sap-bg)', padding: '1px 5px', borderRadius: 3 }}>Empresa;Levantam;ImplProposal;EspFunc;EspTec;Codific;TraducaoEN;TraducaoES;TesteUnitario;TesteQAS;BppPT;BppEN;BppES;TesteVolume;Homologacao;AccessControl;Homologacao2;GoLive;Documentacao;Gerencia</code>
        </div>
      </div>
    </>
  )
}

/* ─── Main ──────────────────────────────────────────── */
export default function SettingsView() {
  const [tab, setTab] = useState('ui')

  const TABS = [
    { id: 'ui',          label: 'Interface' },
    { id: 'ai',          label: 'Inteligência Artificial' },
    { id: 'agents',      label: 'Agentes' },
    { id: 'calculadora', label: 'Calculadora' },
    { id: 'parametros',  label: 'Parâmetros de Estimativa' },
    { id: 'clientes',    label: 'Parâmetros de Cliente' }
  ]

  return (
    <div className="settings-page">
      <div style={{
        padding: '20px 24px 0',
        background: 'var(--sap-base)',
        borderBottom: '1px solid var(--sap-border)',
        flexShrink: 0
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--sap-text)', marginBottom: 12 }}>
          Configurações
        </h1>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'ui'          && <UiTab />}
        {tab === 'ai'          && <AiTab />}
        {tab === 'agents'      && <AgentsTab />}
        {tab === 'calculadora' && <CalculadoraTab />}
        {tab === 'parametros'  && <EstimativaTab />}
        {tab === 'clientes'    && <ClienteParametrosTab />}
      </div>
    </div>
  )
}
