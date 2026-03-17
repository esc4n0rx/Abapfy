import React, { useState, useEffect } from 'react'
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
  const { providers, loadProviders, updateLocal, saveProvider, testProvider } = useAiStore()
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

/* ─── Main ──────────────────────────────────────────── */
export default function SettingsView() {
  const [tab, setTab] = useState('ui')

  const TABS = [
    { id: 'ui',     label: 'Interface' },
    { id: 'ai',     label: 'Inteligência Artificial' },
    { id: 'agents', label: 'Agentes' }
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
        {tab === 'ui'     && <UiTab />}
        {tab === 'ai'     && <AiTab />}
        {tab === 'agents' && <AgentsTab />}
      </div>
    </div>
  )
}
