import React, { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AGENT_TEMPLATE } from '../agents/index'
import { useAgentStore, FLOW_CONFIGS } from '../store/agentStore'

/* ─── Markdown renderer ────────────────────────────── */
function MdView({ content }) {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

/* ─── Modal ─────────────────────────────────────────── */
function AgentModal({ agent, isDefault, onClose, onSave, onDelete, onDuplicate }) {
  const [mode, setMode]           = useState('view')
  const [form, setForm]           = useState({ name: '', description: '', content: '' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setForm({
      name:        agent?.name        || '',
      description: agent?.description || '',
      content:     agent?.content     || ''
    })
    setMode('view')
    setConfirmDel(false)
    setSaveError('')
  }, [agent])

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) return
    setSaving(true)
    setSaveError('')
    const res = await onSave({ id: isDefault ? undefined : agent?.id, ...form })
    setSaving(false)
    if (res && !res.success) {
      setSaveError(res.error || 'Erro ao salvar agente')
    }
    // modal is closed by parent on success
  }

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    const res = await onDelete(agent.id)
    setDeleting(false)
    if (res?.success !== false) {
      onClose()
    } else {
      setSaveError(res.error || 'Erro ao excluir agente')
      setConfirmDel(false)
    }
  }

  const isNew = !agent?.id && !isDefault

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 8,
        width: '100%', maxWidth: 960,
        height: '82vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--sap-border)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 4,
              background: 'var(--sap-shell)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 0.5
            }}>
              {isNew ? 'NEW' : (agent?.name?.slice(0, 2) || 'AG').toUpperCase()}
            </div>
            {mode === 'edit' || isNew
              ? <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do agente"
                  style={{
                    fontSize: 15, fontWeight: 600, color: 'var(--sap-text)',
                    border: 'none', borderBottom: '1px solid var(--sap-border)',
                    background: 'transparent', outline: 'none',
                    padding: '2px 4px', minWidth: 200
                  }}
                />
              : <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)' }}>
                  {agent?.name}
                </span>
            }
            {isDefault && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px',
                borderRadius: 3, background: 'var(--sap-hover-bg)',
                color: 'var(--sap-subtle)', border: '1px solid var(--sap-border)',
                textTransform: 'uppercase', letterSpacing: 0.5
              }}>Padrão</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* View/Edit tabs (only for user agents) */}
            {!isDefault && !isNew && (
              <div style={{
                display: 'flex', border: '1px solid var(--sap-border)',
                borderRadius: 4, overflow: 'hidden'
              }}>
                {['view', 'edit'].map((m) => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    padding: '5px 12px', border: 'none', fontSize: 12,
                    background: mode === m ? 'var(--sap-primary)' : 'transparent',
                    color: mode === m ? '#fff' : 'var(--sap-subtle)',
                    cursor: 'pointer', fontWeight: mode === m ? 600 : 400
                  }}>
                    {m === 'view' ? 'Visualizar' : 'Editar'}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 4,
              border: '1px solid var(--sap-border)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--sap-subtle)', fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>×</button>
          </div>
        </div>

        {/* Description row (edit/new only) */}
        {(mode === 'edit' || isNew) && (
          <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descrição breve do agente (opcional)"
              style={{
                width: '100%', padding: '7px 10px',
                border: '1px solid var(--sap-border)', borderRadius: 4,
                background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
                fontSize: 13, outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--sap-primary)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--sap-border)')}
            />
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {(mode === 'view' || isDefault) ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <MdView content={agent?.content || ''} />
            </div>
          ) : (
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              style={{
                flex: 1, padding: '16px 20px',
                border: 'none', borderTop: '1px solid var(--sap-border)',
                background: 'var(--sap-base)', color: 'var(--sap-text)',
                fontSize: 13, fontFamily: '"Cascadia Code", "Consolas", monospace',
                lineHeight: 1.6, outline: 'none', resize: 'none'
              }}
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--sap-border)',
          flexShrink: 0, gap: 8
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Delete (user agents only) */}
            {!isDefault && !isNew && agent?.id && (
              <button onClick={handleDelete} disabled={deleting} style={{
                padding: '7px 14px', borderRadius: 4, fontSize: 13,
                border: `1px solid ${confirmDel ? 'var(--sap-negative)' : 'var(--sap-border)'}`,
                background: confirmDel ? 'var(--sap-negative)' : 'transparent',
                color: confirmDel ? '#fff' : 'var(--sap-negative)',
                cursor: deleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}>
                {deleting ? 'Excluindo...' : confirmDel ? 'Confirmar exclusão' : 'Excluir'}
              </button>
            )}
          </div>

          {/* Save error feedback */}
          {saveError && (
            <div style={{
              flex: 1, fontSize: 12, color: 'var(--sap-negative)',
              padding: '5px 10px', borderRadius: 4,
              background: '#fdf3f3', border: '1px solid #f5c6cb'
            }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Duplicate default → user agent */}
            {isDefault && (
              <button onClick={() => onDuplicate(agent)} style={{
                padding: '7px 14px', borderRadius: 4, fontSize: 13,
                border: '1px solid var(--sap-primary)',
                background: 'transparent', color: 'var(--sap-primary)',
                cursor: 'pointer', fontWeight: 400
              }}>
                Duplicar para Meus Agentes
              </button>
            )}

            {/* Save (edit or new) */}
            {(mode === 'edit' || isNew) && (
              <>
                <button onClick={() => isNew ? onClose() : setMode('view')} style={{
                  padding: '7px 14px', borderRadius: 4, fontSize: 13,
                  border: '1px solid var(--sap-border)',
                  background: 'transparent', color: 'var(--sap-text)', cursor: 'pointer'
                }}>
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || !form.content.trim()}
                  style={{
                    padding: '7px 16px', borderRadius: 4, fontSize: 13,
                    border: 'none',
                    background: 'var(--sap-primary)', color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600, minWidth: 72
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            )}

            {/* Close (view mode) */}
            {(mode === 'view' && !isNew) && (
              <button onClick={onClose} style={{
                padding: '7px 16px', borderRadius: 4, fontSize: 13,
                border: '1px solid var(--sap-border)',
                background: 'var(--sap-base)', color: 'var(--sap-text)',
                cursor: 'pointer'
              }}>
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Agent Card ─────────────────────────────────────── */
function AgentCard({ name, description, isDefault, onOpen }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--sap-base)',
        border: `1px solid ${hover ? 'var(--sap-primary)' : 'var(--sap-border)'}`,
        borderRadius: 6,
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'border-color 0.15s',
        cursor: 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 4,
            background: 'var(--sap-shell)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 0.5,
            flexShrink: 0
          }}>
            {name.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sap-text)' }}>{name}</span>
        </div>
        {isDefault && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 3,
            background: 'var(--sap-hover-bg)', color: 'var(--sap-subtle)',
            border: '1px solid var(--sap-border)',
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0
          }}>Padrão</span>
        )}
      </div>

      <p style={{
        fontSize: 12, color: 'var(--sap-subtle)', lineHeight: 1.5,
        margin: 0, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden'
      }}>
        {description}
      </p>

      <button
        onClick={onOpen}
        style={{
          padding: '6px 0', borderRadius: 4, fontSize: 12,
          border: '1px solid var(--sap-border)',
          background: hover ? 'var(--sap-primary)' : 'transparent',
          color: hover ? '#fff' : 'var(--sap-subtle)',
          cursor: 'pointer', transition: 'all 0.15s', fontWeight: 500
        }}
      >
        Abrir
      </button>
    </div>
  )
}

/* ─── Empty State ────────────────────────────────────── */
function EmptyState({ onNew }) {
  return (
    <div style={{
      padding: '32px 24px', textAlign: 'center',
      border: '1px dashed var(--sap-border)', borderRadius: 6,
      color: 'var(--sap-subtle)'
    }}>
      <div style={{ fontSize: 13, marginBottom: 12 }}>
        Nenhum agente personalizado ainda.
      </div>
      <button onClick={onNew} style={{
        padding: '7px 16px', borderRadius: 4, fontSize: 13,
        border: '1px solid var(--sap-primary)',
        background: 'transparent', color: 'var(--sap-primary)',
        cursor: 'pointer', fontWeight: 500
      }}>
        Criar primeiro agente
      </button>
    </div>
  )
}

/* ─── Section Header ─────────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)',
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginBottom: 12, paddingBottom: 8,
      borderBottom: '1px solid var(--sap-border)'
    }}>
      {children}
    </div>
  )
}

/* ─── Flow Configuration Section ────────────────────── */
function FlowsSection() {
  const { userAgents, defaultAgents, agentMappings, setFlowAgent } = useAgentStore()

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle>Configuração de Fluxos</SectionTitle>
      <div style={{
        border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden'
      }}>
        {FLOW_CONFIGS.map((flow, idx) => {
          const current = agentMappings[flow.id] || flow.defaultAgent
          const isLast = idx === FLOW_CONFIGS.length - 1
          return (
            <div key={flow.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: isLast ? 'none' : '1px solid var(--sap-border)',
              background: 'var(--sap-base)', gap: 16
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sap-text)' }}>
                  {flow.label}
                </div>
                {current !== flow.defaultAgent && (
                  <div style={{ fontSize: 11, color: 'var(--sap-primary)', marginTop: 2 }}>
                    Agente personalizado
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {current !== flow.defaultAgent && (
                  <button
                    onClick={() => setFlowAgent(flow.id, flow.defaultAgent)}
                    title="Restaurar padrão"
                    style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 3,
                      border: '1px solid var(--sap-border)', background: 'transparent',
                      color: 'var(--sap-subtle)', cursor: 'pointer'
                    }}
                  >
                    ↺ Padrão
                  </button>
                )}
                <select
                  value={current}
                  onChange={e => setFlowAgent(flow.id, e.target.value)}
                  style={{
                    padding: '6px 10px', fontSize: 12,
                    border: `1px solid ${current !== flow.defaultAgent ? 'var(--sap-primary)' : 'var(--sap-border)'}`,
                    borderRadius: 4, background: 'var(--sap-input-bg)',
                    color: 'var(--sap-text)', outline: 'none', cursor: 'pointer',
                    minWidth: 200
                  }}
                >
                  <optgroup label="Agentes Padrão">
                    {defaultAgents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                  {userAgents.length > 0 && (
                    <optgroup label="Meus Agentes">
                      {userAgents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main AgentsTab ─────────────────────────────────── */
export default function AgentsTab() {
  const { userAgents, defaultAgents, loadUserAgents, saveAgent, deleteAgent } = useAgentStore()
  const [modal, setModal]   = useState(null)
  const [dupMsg, setDupMsg] = useState(null) // { type: 'ok'|'error', text }
  // modal: { agent, isDefault } | null

  useEffect(() => { loadUserAgents() }, [])

  const openDefault = useCallback((agent) => {
    setModal({ agent, isDefault: true })
  }, [])

  const openUser = useCallback((agent) => {
    setModal({ agent, isDefault: false })
  }, [])

  const openNew = useCallback(() => {
    setModal({
      agent: { id: null, name: '', description: '', content: AGENT_TEMPLATE },
      isDefault: false
    })
  }, [])

  const handleDuplicate = useCallback(async (defaultAgent) => {
    const res = await saveAgent({
      name: `${defaultAgent.name} (cópia)`,
      description: defaultAgent.description,
      content: defaultAgent.content
    })
    setModal(null)
    if (res.success) {
      setDupMsg({ type: 'ok', text: `"${defaultAgent.name}" duplicado para Meus Agentes` })
    } else {
      setDupMsg({ type: 'error', text: res.error || 'Erro ao duplicar agente' })
    }
    setTimeout(() => setDupMsg(null), 3500)
  }, [saveAgent])

  const handleSave = useCallback(async (data) => {
    const res = await saveAgent(data)
    if (res.success) setModal(null)
    return res
  }, [saveAgent])

  const handleDelete = useCallback(async (id) => {
    const res = await deleteAgent(id)
    return res
  }, [deleteAgent])

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

      {/* Page actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: dupMsg ? 10 : 20 }}>
        <button
          onClick={openNew}
          style={{
            padding: '8px 16px', borderRadius: 4, fontSize: 13,
            border: 'none', background: 'var(--sap-primary)',
            color: '#fff', cursor: 'pointer', fontWeight: 600
          }}
        >
          + Novo Agente
        </button>
      </div>

      {/* Duplicate feedback toast */}
      {dupMsg && (
        <div style={{
          marginBottom: 16, padding: '8px 14px', borderRadius: 4, fontSize: 13,
          background: dupMsg.type === 'ok' ? '#f3faf5' : '#fdf3f3',
          color: dupMsg.type === 'ok' ? 'var(--sap-positive)' : 'var(--sap-negative)',
          border: `1px solid ${dupMsg.type === 'ok' ? '#c3e6cb' : '#f5c6cb'}`,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>{dupMsg.type === 'ok' ? '✓' : '✗'}</span>
          {dupMsg.text}
        </div>
      )}

      {/* Flow configuration */}
      <FlowsSection />

      {/* Default agents */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>Agentes Padrão ({defaultAgents.length})</SectionTitle>
        {defaultAgents.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--sap-subtle)', fontSize: 13, textAlign: 'center' }}>
            Carregando agentes padrão...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12
          }}>
            {defaultAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                name={agent.name}
                description={agent.description}
                isDefault
                onOpen={() => openDefault(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* User agents */}
      <div>
        <SectionTitle>Meus Agentes ({userAgents.length})</SectionTitle>
        {userAgents.length === 0
          ? <EmptyState onNew={openNew} />
          : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12
            }}>
              {userAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  name={agent.name}
                  description={agent.description}
                  isDefault={false}
                  onOpen={() => openUser(agent)}
                />
              ))}
            </div>
          )
        }
      </div>

      {/* Modal */}
      {modal && (
        <AgentModal
          agent={modal.agent}
          isDefault={modal.isDefault}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  )
}
