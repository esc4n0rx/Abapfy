import React, { useState, useEffect, useRef } from 'react'
import { useEspecificacoesStore } from '../store/especificacoesStore'
import { useAiStore } from '../store/aiStore'
import { useAuthStore } from '../store/authStore'
import { getActiveProvider, parseEfResponse, parseEffortResponse } from '../lib/aiClient'
import { useAgentStore } from '../store/agentStore'
import { notify } from '../lib/notify'

// ─── Mapeamento placeholder → chave JSON da IA ───────────────────────────────
const PLACEHOLDER_MAP = {
  'INSIRA AQUI O NOME DO PROJETO':    'project_name_cover',
  'DIGITE AQUI O NOME DO AUTOR':      'author',
  'BREVE DESCRIÇÃO DO PROJETO':       'brief_description',
  'NOME DA EMPRESA CLIENTE':          'client_name',
  'NOME DO PROJETO':                  'project_name',
  'DESCRIÇÃO RESUMIDA DO PROJETO':    'summary_description',
  'FALE DETALHADAMENTE UMA VISAO GERAL DO MACRO DO PROCESSO': 'macro_overview',
  'AQUI DETALHADAMENTE MONTE A ESPECIFICAÇÃO FUNCIONAL ,DETALHES DO PROCESSO , COMO DEVE SER FEITO, QUE TABELAS E CAMPOS USAR, RESULTADO ESPERADO': 'functional_spec'
}

// ─── Formata data para exibição ───────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Componente: Item da lista ────────────────────────────────────────────────
function SpecListItem({ spec, selected, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      style={{
        padding: '12px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        background: selected ? 'var(--sap-active-bg)' : hovered ? 'var(--sap-hover-bg)' : 'transparent',
        border: `1px solid ${selected ? 'var(--sap-primary)' : 'transparent'}`,
        transition: 'all 0.15s',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--sap-text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {spec.project_name || 'Sem título'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 2 }}>
            {spec.client_name || '—'} · {formatDate(spec.created_at)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 1 }}>
            {spec.author || ''}
          </div>
        </div>
        {hovered && (
          <div
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            style={{
              flexShrink: 0, width: 24, height: 24, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: confirmDelete ? '#bb0000' : 'var(--sap-hover-bg)',
              color: confirmDelete ? '#fff' : 'var(--sap-subtle)',
              fontSize: 12, cursor: 'pointer', border: '1px solid var(--sap-border)',
              transition: 'all 0.15s'
            }}
            title={confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
          >
            {confirmDelete ? '✓' : '✕'}
          </div>
        )}
      </div>
      {confirmDelete && (
        <div style={{
          fontSize: 11, color: '#bb0000', marginTop: 6,
          display: 'flex', gap: 8, alignItems: 'center'
        }}>
          <span>Excluir permanentemente?</span>
          <span
            onClick={(e) => { e.stopPropagation(); onDelete(spec.id) }}
            style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sim
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Não
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Componente: Seção de preview do conteúdo gerado ─────────────────────────
function ContentSection({ label, value, multiline }) {
  const [expanded, setExpanded] = useState(false)
  if (!value) return null
  const preview = String(value).slice(0, 120)
  const needsToggle = String(value).length > 120

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        background: 'var(--sap-hover-bg)', borderRadius: 6, padding: '10px 12px',
        border: '1px solid var(--sap-border)', fontSize: 13, color: 'var(--sap-text)',
        whiteSpace: multiline ? 'pre-wrap' : 'normal', lineHeight: 1.6
      }}>
        {needsToggle && !expanded ? `${preview}…` : String(value)}
        {needsToggle && (
          <span
            onClick={() => setExpanded(!expanded)}
            style={{ color: 'var(--sap-primary)', cursor: 'pointer', marginLeft: 6, fontSize: 12 }}
          >
            {expanded ? 'ver menos' : 'ver mais'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── View principal ───────────────────────────────────────────────────────────
export default function EspecificacoesView() {
  const { specs, loading: specsLoading, loadSpecs, saveSpec, deleteSpec } = useEspecificacoesStore()
  const { providers } = useAiStore()
  const { user } = useAuthStore()
  const { getFlowPrompt } = useAgentStore()

  const [panel, setPanel] = useState('empty') // 'empty' | 'create' | 'detail'
  const [selectedSpec, setSelectedSpec] = useState(null)
  const [form, setForm] = useState({ author: '', client: '', projectName: '', context: '' })

  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState(null)
  const [generatingDoc, setGeneratingDoc] = useState(false)
  const [docPath, setDocPath] = useState(null)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')

  const contextRef = useRef(null)

  // Pré-preenche autor com nome do usuário
  useEffect(() => {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
    setForm((f) => ({ ...f, author: name }))
  }, [user])

  useEffect(() => {
    loadSpecs()
  }, [])

  function openCreate() {
    setPanel('create')
    setSelectedSpec(null)
    setGeneratedContent(null)
    setDocPath(null)
    setError('')
    setSaveError('')
  }

  function openDetail(spec) {
    setPanel('detail')
    setSelectedSpec(spec)
    setGeneratedContent(spec.generated_content || null)
    setDocPath(null)
    setError('')
  }

  async function handleDelete(id) {
    await deleteSpec(id)
    if (selectedSpec?.id === id) {
      setPanel('empty')
      setSelectedSpec(null)
    }
  }

  // ─── Geração via IA ──────────────────────────────────────────────────────────
  async function handleGenerate() {
    setError('')
    if (!form.context.trim()) {
      setError('Descreva o contexto do projeto antes de gerar.')
      return
    }

    const provider = getActiveProvider(providers)
    if (!provider) {
      setError('Nenhum provedor de IA configurado. Acesse Configurações → IA & APIs.')
      return
    }

    setGenerating(true)
    setGeneratedContent(null)
    setDocPath(null)

    try {
      const userMessage = buildEfPrompt(form)
      let raw = ''

      if (provider.isIntegration) {
        const res = await window.api.generateIntegration({
          integrationType: provider.integrationType,
          systemPrompt: getFlowPrompt('ef'),
          userMessage,
          programName: `EF_${(form.projectName || 'spec').replace(/\s+/g, '_')}`
        })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        const res = await window.api.generateAI({
          provider: provider.provider,
          apiKey: provider.apiKey,
          model: provider.model,
          systemPrompt: getFlowPrompt('ef'),
          userMessage
        })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }

      const parsed = parseEfResponse(raw)
      setGeneratedContent(parsed)
      notify('📋 Especificação gerada', parsed.project_name || 'Conteúdo pronto para revisão')
    } catch (err) {
      setError(`Erro ao gerar: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Salvar no Supabase ───────────────────────────────────────────────────────
  async function handleSave() {
    if (!generatedContent) return
    setSaveError('')

    const res = await saveSpec({
      project_name: generatedContent.project_name || form.projectName || 'EF Sem Título',
      author: generatedContent.author || form.author,
      client_name: generatedContent.client_name || form.client,
      context_input: form.context,
      generated_content: generatedContent
    })

    if (!res.success) {
      setSaveError(res.error)
    } else {
      // Após salvar, abre o detalhe do item criado
      setPanel('detail')
      setSelectedSpec(res.data)
    }
  }

  // ─── Gerar arquivo DOCX ───────────────────────────────────────────────────────
  async function handleGenerateDoc(content) {
    if (!content) return
    setGeneratingDoc(true)
    setError('')

    try {
      // Monta o objeto de replacements usando o mapeamento de placeholders
      const replacements = {}
      for (const [placeholder, key] of Object.entries(PLACEHOLDER_MAP)) {
        replacements[placeholder] = content[key] || ''
      }

      const res = await window.api.generateEfDoc({
        replacements,
        projectName: content.project_name || 'EF_SPEC'
      })

      if (!res.success) throw new Error(res.error)
      setDocPath(res.path)
      notify('📄 Documento Word criado', 'Salvo em Documentos/Abapfy/EspecificacoesFuncionais')
    } catch (err) {
      setError(`Erro ao gerar documento: ${err.message}`)
    } finally {
      setGeneratingDoc(false)
    }
  }

  async function handleOpenDoc() {
    if (!docPath) return
    await window.api.openEfFile({ path: docPath })
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--sap-bg)' }}>

      {/* ── Painel esquerdo: lista ── */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--sap-border)', background: 'var(--sap-base)',
        overflow: 'hidden'
      }}>
        {/* Cabeçalho */}
        <div style={{
          padding: '16px 14px 12px', borderBottom: '1px solid var(--sap-border)',
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-text)' }}>
            📋 Especificações Funcionais
          </div>
          <button
            onClick={openCreate}
            style={{
              background: 'var(--sap-primary)', color: '#fff',
              border: 'none', borderRadius: 6, padding: '7px 14px',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Nova EF com IA
          </button>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {specsLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--sap-subtle)', fontSize: 13 }}>
              Carregando...
            </div>
          ) : specs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--sap-subtle)', fontSize: 13 }}>
              Nenhuma EF criada ainda.
            </div>
          ) : (
            specs.map((spec) => (
              <SpecListItem
                key={spec.id}
                spec={spec}
                selected={selectedSpec?.id === spec.id}
                onClick={() => openDetail(spec)}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Painel direito ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Estado vazio */}
        {panel === 'empty' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            color: 'var(--sap-subtle)', padding: 40
          }}>
            <div style={{ fontSize: 52 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--sap-text)' }}>
              Especificações Funcionais
            </div>
            <div style={{ fontSize: 14, color: 'var(--sap-subtle)', textAlign: 'center', maxWidth: 380 }}>
              Crie especificações funcionais SAP com auxílio de IA. Descreva o projeto
              informalmente e a IA gera um documento Word profissional.
            </div>
            <button
              onClick={openCreate}
              style={{
                marginTop: 8, background: 'var(--sap-primary)', color: '#fff',
                border: 'none', borderRadius: 6, padding: '9px 24px',
                fontSize: 14, fontWeight: 500, cursor: 'pointer'
              }}
            >
              + Nova EF com IA
            </button>
          </div>
        )}

        {/* Formulário de criação */}
        {panel === 'create' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
            <div style={{ maxWidth: 780 }}>

              {/* Header */}
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--sap-text)', margin: 0 }}>
                  Nova Especificação Funcional
                </h1>
                <p style={{ fontSize: 13, color: 'var(--sap-subtle)', margin: '4px 0 0' }}>
                  Descreva o projeto de forma informal — a IA refina e gera o documento Word.
                </p>
              </div>

              {/* Campos do formulário */}
              {!generatedContent && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <FormField
                      label="Autor"
                      value={form.author}
                      onChange={(v) => setForm((f) => ({ ...f, author: v }))}
                      placeholder="Seu nome"
                    />
                    <FormField
                      label="Empresa Cliente"
                      value={form.client}
                      onChange={(v) => setForm((f) => ({ ...f, client: v }))}
                      placeholder="Nome da empresa cliente"
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <FormField
                      label="Nome do Projeto (opcional)"
                      value={form.projectName}
                      onChange={(v) => setForm((f) => ({ ...f, projectName: v }))}
                      placeholder="A IA pode inferir automaticamente"
                    />
                  </div>

                  {/* Contexto principal */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>
                      Contexto do Projeto *
                    </label>
                    <textarea
                      ref={contextRef}
                      value={form.context}
                      onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
                      placeholder={`Descreva o projeto de forma informal. Inclua:\n• O que precisa ser feito (relatório, função, enhancement, etc.)\n• O processo de negócio envolvido\n• As tabelas SAP e campos relevantes (se souber)\n• Regras de negócio e validações\n• O resultado esperado\n\nExemplo: "Precisamos de um relatório Z para listar pedidos de venda pendentes de entrega. O usuário filtra por filial, data de criação e status. O relatório deve mostrar número do pedido, cliente, material, quantidade e valor. Deve ter opção de exportar para Excel..."`}
                      rows={12}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--sap-input-bg)', border: '1px solid var(--sap-border)',
                        borderRadius: 6, padding: '10px 12px', fontSize: 13,
                        color: 'var(--sap-text)', resize: 'vertical', lineHeight: 1.6,
                        fontFamily: 'inherit', outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--sap-primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--sap-border)'}
                    />
                  </div>

                  {error && (
                    <div style={{
                      marginBottom: 14, padding: '10px 14px', borderRadius: 6,
                      background: '#fff0f0', border: '1px solid #ffcccc',
                      color: '#bb0000', fontSize: 13
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                      background: generating ? 'var(--sap-subtle)' : 'var(--sap-primary)',
                      color: '#fff', border: 'none', borderRadius: 6,
                      padding: '10px 28px', fontSize: 14, fontWeight: 500,
                      cursor: generating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    {generating ? (
                      <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                        Gerando com IA...
                      </>
                    ) : (
                      <>✦ Gerar com IA</>
                    )}
                  </button>
                </>
              )}

              {/* Preview do conteúdo gerado */}
              {generatedContent && (
                <GeneratedPreview
                  content={generatedContent}
                  docPath={docPath}
                  generatingDoc={generatingDoc}
                  saveError={saveError}
                  onRegenerate={() => { setGeneratedContent(null); setDocPath(null) }}
                  onSave={handleSave}
                  onGenerateDoc={() => handleGenerateDoc(generatedContent)}
                  onOpenDoc={handleOpenDoc}
                />
              )}
            </div>
          </div>
        )}

        {/* Detalhe de EF existente */}
        {panel === 'detail' && selectedSpec && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
            <div style={{ maxWidth: 780 }}>

              {/* Header */}
              <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--sap-text)', margin: 0 }}>
                    {selectedSpec.project_name || 'Especificação Funcional'}
                  </h1>
                  <p style={{ fontSize: 13, color: 'var(--sap-subtle)', margin: '4px 0 0' }}>
                    {selectedSpec.client_name && `${selectedSpec.client_name} · `}
                    {selectedSpec.author && `${selectedSpec.author} · `}
                    {formatDate(selectedSpec.created_at)}
                  </p>
                </div>
              </div>

              {/* Conteúdo gerado */}
              {selectedSpec.generated_content && (
                <GeneratedPreview
                  content={selectedSpec.generated_content}
                  docPath={docPath}
                  generatingDoc={generatingDoc}
                  saveError=""
                  onRegenerate={null}
                  onSave={null}
                  onGenerateDoc={() => handleGenerateDoc(selectedSpec.generated_content)}
                  onOpenDoc={handleOpenDoc}
                />
              )}

              {error && (
                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 6,
                  background: '#fff0f0', border: '1px solid #ffcccc',
                  color: '#bb0000', fontSize: 13
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente: Estimativa de Esforço ───────────────────────────────────────
function EffortSection({ content }) {
  const { providers } = useAiStore()
  const [effort, setEffort] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)

  async function handleEstimate() {
    setErr(''); setLoading(true); setOpen(true)
    try {
      const provider = getActiveProvider(providers)
      if (!provider) throw new Error('Nenhum provedor de IA configurado.')

      const userMessage = `Estime o esforço de desenvolvimento para a seguinte Especificação Funcional SAP:\n\n` +
        `**Projeto:** ${content.project_name || ''}\n` +
        `**Cliente:** ${content.client_name || ''}\n\n` +
        `**Visão Geral:**\n${content.macro_overview || ''}\n\n` +
        `**Especificação Técnica:**\n${content.functional_spec || ''}`

      let raw = ''
      if (provider.isIntegration) {
        const res = await window.api.generateIntegration({
          integrationType: provider.integrationType,
          systemPrompt: getFlowPrompt('effort'),
          userMessage,
          programName: 'EFFORT_ESTIMATE'
        })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      } else {
        const res = await window.api.generateAI({
          provider: provider.provider, apiKey: provider.apiKey,
          model: provider.model, systemPrompt: getFlowPrompt('effort'), userMessage
        })
        if (!res.success) throw new Error(res.error)
        raw = res.content
      }
      setEffort(parseEffortResponse(raw))
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const COMPLEXITY_COLOR = { simples: '#107e3e', médio: '#e9730c', complexo: '#c44a00', 'muito complexo': '#bb0000' }
  const IMPACT_COLOR = { baixo: '#107e3e', médio: '#e9730c', alto: '#bb0000' }

  return (
    <div style={{ marginTop: 24, border: '1px solid var(--sap-border)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        onClick={() => { if (!effort && !loading) handleEstimate(); else setOpen(o => !o) }}
        style={{
          padding: '12px 16px', background: 'var(--sap-base)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: open && (effort || loading || err) ? '1px solid var(--sap-border)' : 'none'
        }}
      >
        <span style={{ fontSize: 16 }}>⏱</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sap-text)', flex: 1 }}>
          Estimativa de Esforço
        </span>
        {effort && (
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#fff',
            background: COMPLEXITY_COLOR[effort.complexity] || '#6a6d70',
            padding: '2px 8px', borderRadius: 4
          }}>{effort.complexity}</span>
        )}
        {effort && (
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-primary)' }}>
            {effort.total_hours}h
          </span>
        )}
        {loading && <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>Estimando...</span>}
        {!effort && !loading && <span style={{ fontSize: 12, color: 'var(--sap-primary)' }}>Clique para estimar</span>}
        <span style={{ color: 'var(--sap-subtle)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: 16, background: 'var(--sap-bg)' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--sap-subtle)', fontSize: 13 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>⟳</span>
              Analisando escopo e estimando esforço...
            </div>
          )}
          {err && (
            <div style={{ padding: '8px 12px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 6, color: '#bb0000', fontSize: 13 }}>
              {err}
            </div>
          )}
          {effort && (
            <>
              {/* Breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
                  Breakdown por fase
                </div>
                {(effort.breakdown || []).map((b, i) => {
                  const pct = Math.round((b.hours / effort.total_hours) * 100)
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span style={{ color: 'var(--sap-text)', fontWeight: 500 }}>{b.phase}</span>
                        <span style={{ color: 'var(--sap-primary)', fontWeight: 700 }}>{b.hours}h</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--sap-border)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--sap-primary)', borderRadius: 2, transition: 'width 0.4s' }} />
                      </div>
                      {b.description && <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 2 }}>{b.description}</div>}
                    </div>
                  )
                })}
                <div style={{
                  marginTop: 12, padding: '8px 12px', background: 'var(--sap-base)',
                  border: '1px solid var(--sap-border)', borderRadius: 6,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-text)' }}>Total estimado</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--sap-primary)' }}>{effort.total_hours}h</span>
                </div>
              </div>

              {/* Risks */}
              {effort.risks?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                    Riscos
                  </div>
                  {effort.risks.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: 1,
                        background: IMPACT_COLOR[r.impact] || '#6a6d70',
                        padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase'
                      }}>{r.impact}</span>
                      <span style={{ fontSize: 13, color: 'var(--sap-text)' }}>{r.risk}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Assumptions */}
              {effort.assumptions?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                    Premissas
                  </div>
                  {effort.assumptions.map((a, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--sap-text)', marginBottom: 4, display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--sap-subtle)', flexShrink: 0 }}>•</span>{a}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleEstimate} style={{
                marginTop: 14, fontSize: 12, color: 'var(--sap-subtle)', background: 'transparent',
                border: '1px solid var(--sap-border)', borderRadius: 4, padding: '4px 14px',
                cursor: 'pointer', fontFamily: 'inherit'
              }}>↺ Re-estimar</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente: Preview do conteúdo gerado + ações ──────────────────────────
function GeneratedPreview({ content, docPath, generatingDoc, saveError, onRegenerate, onSave, onGenerateDoc, onOpenDoc }) {
  return (
    <div>
      {/* Badge de sucesso */}
      <div style={{
        marginBottom: 20, padding: '10px 14px', borderRadius: 6,
        background: '#f0faf4', border: '1px solid #b7e4c7',
        color: '#107e3e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span>✓</span>
        Conteúdo gerado com sucesso. Revise abaixo e gere o documento Word.
      </div>

      {/* Campos do conteúdo */}
      <ContentSection label="Nome do Projeto" value={content.project_name} />
      <ContentSection label="Autor" value={content.author} />
      <ContentSection label="Empresa Cliente" value={content.client_name} />
      <ContentSection label="Breve Descrição" value={content.brief_description} />
      <ContentSection label="Descrição Resumida" value={content.summary_description} />
      <ContentSection label="Visão Geral do Processo (Macro)" value={content.macro_overview} multiline />
      <ContentSection label="Especificação Funcional Detalhada" value={content.functional_spec} multiline />

      {/* Botões de ação */}
      <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Gerar DOCX */}
        {!docPath && (
          <button
            onClick={onGenerateDoc}
            disabled={generatingDoc}
            style={{
              background: generatingDoc ? 'var(--sap-subtle)' : '#107e3e',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '10px 22px', fontSize: 14, fontWeight: 500,
              cursor: generatingDoc ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {generatingDoc ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Gerando DOCX...</>
            ) : (
              <>📄 Gerar Documento Word</>
            )}
          </button>
        )}

        {/* Abrir arquivo */}
        {docPath && (
          <>
            <button
              onClick={onOpenDoc}
              style={{
                background: '#107e3e', color: '#fff',
                border: 'none', borderRadius: 6, padding: '10px 22px',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              📂 Abrir Documento Word
            </button>
            <div style={{ fontSize: 12, color: 'var(--sap-subtle)', flex: 1 }}>
              Salvo em: <span style={{ color: 'var(--sap-text)' }}>{docPath}</span>
            </div>
          </>
        )}

        {/* Salvar no histórico */}
        {onSave && (
          <button
            onClick={onSave}
            style={{
              background: 'var(--sap-base)', color: 'var(--sap-text)',
              border: '1px solid var(--sap-border)', borderRadius: 6,
              padding: '10px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer'
            }}
          >
            💾 Salvar no Histórico
          </button>
        )}

        {/* Regenerar */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            style={{
              background: 'transparent', color: 'var(--sap-subtle)',
              border: '1px solid var(--sap-border)', borderRadius: 6,
              padding: '10px 18px', fontSize: 13, cursor: 'pointer'
            }}
          >
            ↺ Refazer
          </button>
        )}
      </div>

      {saveError && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 6,
          background: '#fff0f0', border: '1px solid #ffcccc',
          color: '#bb0000', fontSize: 12
        }}>
          Erro ao salvar: {saveError}
        </div>
      )}

      {docPath && (
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 6,
          background: '#f0faf4', border: '1px solid #b7e4c7',
          color: '#107e3e', fontSize: 12
        }}>
          ✓ Documento Word gerado com sucesso!
        </div>
      )}

      <EffortSection content={content} />
    </div>
  )
}

// ─── Componente: Campo de formulário ─────────────────────────────────────────
function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--sap-input-bg)', border: '1px solid var(--sap-border)',
          borderRadius: 6, padding: '8px 12px', fontSize: 13,
          color: 'var(--sap-text)', outline: 'none', fontFamily: 'inherit'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--sap-primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--sap-border)'}
      />
    </div>
  )
}

// ─── Constrói o prompt do usuário para a IA ───────────────────────────────────
function buildEfPrompt(form) {
  let p = 'CONTEXTO DO PROJETO (fornecido pelo consultor):\n\n'
  if (form.projectName?.trim()) p += `Nome do projeto: ${form.projectName}\n`
  if (form.author?.trim())      p += `Autor: ${form.author}\n`
  if (form.client?.trim())      p += `Empresa cliente: ${form.client}\n`
  p += '\n'
  p += form.context.trim()
  return p
}
