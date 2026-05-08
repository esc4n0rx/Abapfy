import React, { useState, useEffect } from 'react'
import { useAiStore } from '../store/aiStore'
import { useAgentStore } from '../store/agentStore'
import { useEstimationParametersStore } from '../store/estimationParametersStore'
import { useClienteParametrosStore } from '../store/clienteParametrosStore'
import { useEstimativasStore } from '../store/estimativasStore'
import { callAI, getActiveProvider, parseEffortResponse } from '../lib/aiClient'
import { cleanEfForPrompt } from '../lib/efUtils'

// ─── SAP versions ─────────────────────────────────────────────────────────────
const SAP_VERSIONS = [
  'ECC 6.0', 'ECC 6.0 EhP7', 'ECC 6.0 EhP8',
  'S/4HANA 1909', 'S/4HANA 2020', 'S/4HANA 2021',
  'S/4HANA 2022', 'S/4HANA 2023', 'S/4HANA Cloud',
  'BTP / CAP', 'Outro'
]

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '1px solid var(--sap-border)', borderRadius: 4,
  background: 'var(--sap-base)', color: 'var(--sap-text)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--sap-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4
}
const sectionTitle = {
  fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12
}

// ─── Helper components ────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Grid({ cols = 2, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {children}
    </div>
  )
}

function EstimativaCard({ tipo, data, accent }) {
  if (!data) return null

  const iconMap  = { agressiva: '⚡', segura: '⚖', tranquila: '🛡' }
  const labelMap = { agressiva: 'Agressiva', segura: 'Segura', tranquila: 'Tranquila' }
  const descMap  = {
    agressiva: 'Poucas horas · maior risco',
    segura:    'Equilíbrio · recomendada',
    tranquila: 'Mais horas · menor risco'
  }

  const dist = data.distribuicao || {}
  const distEntries = Object.entries(dist)

  return (
    <div style={{
      border: `2px solid ${accent}`,
      borderRadius: 8,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }}>
      {/* Header */}
      <div style={{ background: accent, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {iconMap[tipo]} {labelMap[tipo]}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
            {descMap[tipo]}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {data.total_horas}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>horas</div>
        </div>
      </div>

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Distribuição */}
        {distEntries.length > 0 && (
          <div>
            <div style={{ ...sectionTitle, marginBottom: 8 }}>Distribuição</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {distEntries.map(([k, v]) => {
                const pct = data.total_horas > 0 ? Math.round((v / data.total_horas) * 100) : 0
                const labelMap2 = {
                  analise_ef: 'Análise EF', espec: 'Especificação',
                  codific: 'Codificação', testes: 'Testes', outros: 'Outros'
                }
                return (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: 'var(--sap-text)' }}>{labelMap2[k] || k}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--sap-subtle)' }}>{v}h ({pct}%)</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--sap-border)', borderRadius: 2 }}>
                      <div style={{ height: 3, borderRadius: 2, background: accent, width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Premissas */}
        {data.premissas?.length > 0 && (
          <div>
            <div style={sectionTitle}>Premissas</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {data.premissas.map((p, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--sap-text)' }}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Riscos */}
        {data.riscos?.length > 0 && (
          <div>
            <div style={{ ...sectionTitle, color: '#bb0000' }}>Riscos</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {data.riscos.map((r, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--sap-text)' }}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt({ form, mode, efData, sapVersion, parametros, clientes, corrections, removedObjects, addedObjects }) {
  const clienteRow = clientes.find(c =>
    c.empresa.trim().toLowerCase() === (form.cliente || '').trim().toLowerCase()
  )

  let p = `== PROJETO ==\n`
  p += `Cliente: ${form.cliente || 'Não informado'}\n`
  p += `Versão SAP: ${sapVersion || 'ECC 6.0'}\n`

  if (mode === 'ef') {
    p += `Tipo de Projeto: A ser identificado a partir da EF\n`
    p += `Objetos ABAP: A serem identificados a partir da EF\n`
  } else {
    p += `Tipo de Projeto: ${form.tipoProjeto || 'Não informado'}\n`
    p += `INSTRUÇÃO: Identifique todos os objetos ABAP envolvidos (Reports, Classes, Funções, BAdIs, Tabelas Z, Interfaces, etc.) a partir do contexto fornecido.\n`
  }
  p += `\n`

  if (mode === 'ef' && efData?.data) {
    p += `== ESPECIFICAÇÃO FUNCIONAL ==\n`
    p += `Arquivo: ${efData.fileName || 'ef.docx'}\n`
    p += `INSTRUÇÃO: Identifique os objetos ABAP, tipo de projeto e contexto completo a partir do conteúdo da EF abaixo.\n`
    if (efData.data.titulo)            p += `Título: ${efData.data.titulo}\n`
    if (efData.data.descricaoResumida) p += `Descrição: ${efData.data.descricaoResumida}\n`

    // Sempre usa o conteúdo limpo do rawText para garantir cobertura total da EF
    // (o parser de seções pode não capturar EFs sem numeração 3.1/3.2)
    const cleaned = cleanEfForPrompt(efData.rawText, efData.formato)
    if (cleaned) p += `\nConteúdo da Especificação Funcional:\n${cleaned}\n`
    if (efData.formato === 'delta') p += `\nObservação: Esta é uma EF de Delta/Alteração de programa existente.\n`
  } else {
    p += `== CONTEXTO DO PROJETO ==\n${form.contexto || 'Sem contexto adicional fornecido.'}\n`
  }

  if (form.regras) p += `\n== REGRAS E RESTRIÇÕES ADICIONAIS ==\n${form.regras}\n`

  const hasAdjustments = corrections?.length > 0 || removedObjects?.length > 0 || addedObjects?.length > 0
  if (hasAdjustments) {
    p += `\n== AJUSTES DO USUÁRIO NA LISTA DE OBJETOS ==\n`
    p += `O usuário ajustou a lista de objetos após a primeira análise.\n`
    p += `INSTRUÇÃO: Recalcule APENAS os campos "estimativas", "complexidade_geral" e "notas_gerais". O campo "objetos_identificados" será ignorado nesta resposta.\n`
    if (corrections?.length > 0) {
      p += `\nComplexidades alteradas:\n`
      for (const c of corrections) {
        p += `- ${c.nome} (${c.tipo}): ${c.original} → ${c.corrigida}\n`
      }
    }
    if (removedObjects?.length > 0) {
      p += `\nObjetos REMOVIDOS da estimativa (não incluir no cálculo):\n`
      for (const r of removedObjects) {
        p += `- ${r.nome} (${r.tipo}): ${r.complexidade}\n`
      }
    }
    if (addedObjects?.length > 0) {
      p += `\nObjetos ADICIONADOS à estimativa (incluir no cálculo):\n`
      for (const a of addedObjects) {
        p += `- ${a.nome} (${a.tipo}): Complexidade ${a.complexidade}${a.contexto ? ` — ${a.contexto}` : ''}\n`
      }
    }
  }

  if (parametros.length > 0) {
    p += `\n== PARÂMETROS DE ESTIMATIVA (horas de referência) ==\n`
    p += `Tipo\t\tObjeto\t\tComplexidade\tAnalise_EF\tEspec\tCodific\tTestes\n`
    p += `${'─'.repeat(90)}\n`
    for (const row of parametros) {
      p += `${row.tipo}\t\t${row.objeto}\t\t${row.complexidade}\t\t${row.analise_ef}\t\t${row.espec}\t${row.codific}\t${row.testes}\n`
    }
  } else {
    p += `\n== PARÂMETROS DE ESTIMATIVA ==\nNenhum parâmetro cadastrado. Use referências de mercado.\n`
  }

  if (clienteRow) {
    p += `\n== PARÂMETROS DO CLIENTE: ${clienteRow.empresa} ==\n`
    const phases = [
      ['Levantamento', clienteRow.levantamento],
      ['Impl. Proposal', clienteRow.impl_proposal],
      ['Esp. Func.', clienteRow.esp_func],
      ['Esp. Téc.', clienteRow.esp_tec],
      ['Codificação', clienteRow.codific],
      ['Tradução EN', clienteRow.traducao_en],
      ['Tradução ES', clienteRow.traducao_es],
      ['Teste Unitário', clienteRow.teste_unitario],
      ['Teste QAS', clienteRow.teste_qas],
      ['BPP PT', clienteRow.bpp_pt],
      ['BPP EN', clienteRow.bpp_en],
      ['BPP ES', clienteRow.bpp_es],
      ['Teste Volume', clienteRow.teste_volume],
      ['Homologação', clienteRow.homologacao],
      ['Access Control', clienteRow.access_control],
      ['Homologação 2', clienteRow.homologacao_2],
      ['Go-live', clienteRow.go_live],
      ['Documentação', clienteRow.documentacao],
      ['Gerência', clienteRow.gerencia]
    ]
    for (const [label, val] of phases) {
      if (parseFloat(val) > 0) p += `${label}: ${val}\n`
    }
  } else if (form.cliente) {
    p += `\n== PARÂMETROS DO CLIENTE ==\n`
    p += `Cliente "${form.cliente}" não encontrado na base. Use distribuição padrão de mercado para o segmento.\n`
  }

  return p
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function EstimativasView() {
  const { providers, sapVersion, setSapVersion } = useAiStore()
  const { loadUserAgents, getFlowPrompt }         = useAgentStore()
  const { parametros, loadParametros }             = useEstimationParametersStore()
  const { clientes, loadClientes }                 = useClienteParametrosStore()
  const { estimativas, loadEstimativas, saveEstimativa, deleteEstimativa } = useEstimativasStore()

  const [mode, setMode]       = useState('manual')  // 'ef' | 'manual'
  const [efData, setEfData]   = useState(null)
  const [efLoading, setEfLoading] = useState(false)
  const [form, setForm]       = useState({ cliente: '', tipoProjeto: '', contexto: '', regras: '' })
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState(null)
  const [result, setResult]         = useState(null)
  const [saved, setSaved]           = useState(false)
  const [selected, setSelected]     = useState(null)  // id of history item being viewed

  // ── Complexidade editável ──
  const [editedComplexidades, setEditedComplexidades] = useState({})   // index → nova complexidade
  const [recalculating, setRecalculating]             = useState(false)
  const hasEdits = Object.keys(editedComplexidades).length > 0

  // ── Remover / adicionar objetos ──
  const [removedIndices, setRemovedIndices] = useState(new Set())
  const [addedObjects, setAddedObjects]     = useState([])   // [{nome,tipo,complexidade,contexto}]
  const [showAddForm, setShowAddForm]       = useState(false)
  const [addForm, setAddForm]               = useState({ nome: '', tipo: '', complexidade: '', contexto: '' })

  const hasPendingChanges = hasEdits || removedIndices.size > 0 || addedObjects.length > 0
  const totalPending = Object.keys(editedComplexidades).length + removedIndices.size + addedObjects.length

  useEffect(() => {
    loadUserAgents()
    loadParametros()
    loadClientes()
    loadEstimativas()
  }, [])

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Unique client names for autocomplete
  const clienteOptions = [...new Set(clientes.map(c => c.empresa))].sort()

  // Complexidades únicas extraídas dos parâmetros cadastrados
  const complexidadeOptions = [...new Set(parametros.map(p => p.complexidade))].filter(Boolean)

  // Unique tipos for select
  const tipoOptions = [...new Set(parametros.map(p => p.tipo))].filter(Boolean).sort()

  const handleLoadEf = async () => {
    setEfLoading(true)
    setGenError(null)
    try {
      const res = await window.api.readEfDocx()
      if (res?.success) {
        setEfData(res)
        if (res.data?.empresa) f('cliente', res.data.empresa)
      } else if (res?.docLegacy) {
        setGenError(res.error)
      } else if (!res?.canceled && res?.error) {
        setGenError(`Erro ao carregar EF: ${res.error}`)
      }
    } finally {
      setEfLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    setResult(null)
    setSaved(false)
    setSelected(null)
    setEditedComplexidades({})
    setRemovedIndices(new Set())
    setAddedObjects([])
    setShowAddForm(false)
    setAddForm({ nome: '', tipo: '', complexidade: '', contexto: '' })

    try {
      const active = getActiveProvider(providers)
      if (!active) throw new Error('Nenhum provedor de IA configurado. Acesse Configurações → IA.')

      const systemPrompt = getFlowPrompt('effort')
      if (!systemPrompt) throw new Error('Agente "effort_estimator" não encontrado. Execute o SQL em sql/estimativas.sql no Supabase e recarregue.')

      const userPrompt = buildPrompt({ form, mode, efData, sapVersion, parametros, clientes })
      const images = mode === 'ef' && efData?.images?.length ? efData.images.slice(0, 6) : []

      const rawText = await callAI(active, systemPrompt, userPrompt, images)
      const parsed  = parseEffortResponse(rawText)
      setResult(parsed)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleRecalculate = async () => {
    if (!result || !hasPendingChanges) return
    setRecalculating(true)
    setGenError(null)
    setSaved(false)

    try {
      const active = getActiveProvider(providers)
      if (!active) throw new Error('Nenhum provedor de IA configurado.')

      const systemPrompt = getFlowPrompt('effort')
      if (!systemPrompt) throw new Error('Agente "effort_estimator" não encontrado.')

      // Correções de complexidade (excluindo removidos)
      const corrections = (result.objetos_identificados || [])
        .map((obj, i) => {
          if (removedIndices.has(i)) return null
          const nova = editedComplexidades[i]
          if (!nova || nova === obj.complexidade) return null
          return { nome: obj.nome, tipo: obj.tipo, original: obj.complexidade, corrigida: nova }
        })
        .filter(Boolean)

      // Objetos removidos
      const removedObjects = (result.objetos_identificados || [])
        .filter((_, i) => removedIndices.has(i))

      // Lista final client-side: originais (sem removidos, com edições) + adicionados
      const objetosCorrigidos = [
        ...(result.objetos_identificados || [])
          .map((obj, i) => ({ obj, i }))
          .filter(({ i }) => !removedIndices.has(i))
          .map(({ obj, i }) => ({ ...obj, complexidade: editedComplexidades[i] ?? obj.complexidade })),
        ...addedObjects.map(a => ({
          nome: a.nome, tipo: a.tipo, complexidade: a.complexidade,
          justificativa: a.contexto || 'Adicionado pelo usuário'
        }))
      ]

      const userPrompt = buildPrompt({ form, mode, efData, sapVersion, parametros, clientes, corrections, removedObjects, addedObjects })
      const images = mode === 'ef' && efData?.images?.length ? efData.images.slice(0, 6) : []

      const rawText = await callAI(active, systemPrompt, userPrompt, images)
      const parsed  = parseEffortResponse(rawText)

      if (!parsed?.estimativas) throw new Error('Resposta inválida da IA.')

      setResult({
        ...result,
        estimativas:           parsed.estimativas,
        complexidade_geral:    parsed.complexidade_geral ?? result.complexidade_geral,
        notas_gerais:          parsed.notas_gerais       ?? result.notas_gerais,
        objetos_identificados: objetosCorrigidos
      })
      setEditedComplexidades({})
      setRemovedIndices(new Set())
      setAddedObjects([])
      setShowAddForm(false)
      setAddForm({ nome: '', tipo: '', complexidade: '', contexto: '' })
    } catch (err) {
      setGenError(err.message)
    } finally {
      setRecalculating(false)
    }
  }

  const handleSave = async () => {
    if (!result || saved) return
    const nome = result.projeto || form.contexto?.slice(0, 60) || 'Estimativa'
    const res = await saveEstimativa({
      nome_projeto: nome,
      cliente:      form.cliente,
      tipo_projeto: form.tipoProjeto,
      versao_sap:   sapVersion,
      input_type:   mode,
      contexto:     mode === 'ef' ? efData?.fileName : form.contexto?.slice(0, 500),
      resultado:    result
    })
    if (res.success) setSaved(true)
  }

  const handleSelectHistory = (item) => {
    if (selected === item.id) {
      setSelected(null); setResult(null); setEditedComplexidades({})
      setRemovedIndices(new Set()); setAddedObjects([]); setShowAddForm(false)
      return
    }
    setSelected(item.id)
    setResult(item.resultado)
    setSaved(true)
    setGenError(null)
    setEditedComplexidades({})
    setRemovedIndices(new Set())
    setAddedObjects([])
    setShowAddForm(false)
    setAddForm({ nome: '', tipo: '', complexidade: '', contexto: '' })
  }

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Remover esta estimativa?')) return
    await deleteEstimativa(id)
    if (selected === id) { setSelected(null); setResult(null) }
  }

  const canGenerate = !generating && !recalculating && (
    (mode === 'ef' && efData) ||
    (mode === 'manual' && form.contexto?.trim())
  )

  const accentMap = {
    agressiva: '#bb0000',
    segura:    '#0070f2',
    tranquila: '#107e3e'
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left: History panel ── */}
      <div style={{
        width: 268, minWidth: 268, borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--sap-base)', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--sap-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Histórico
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {estimativas.length === 0 ? (
            <div style={{ padding: '24px 16px', fontSize: 12, color: 'var(--sap-subtle)', textAlign: 'center' }}>
              Nenhuma estimativa salva ainda.
            </div>
          ) : estimativas.map(item => (
            <div
              key={item.id}
              onClick={() => handleSelectHistory(item)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: selected === item.id ? 'var(--sap-active-bg)' : 'transparent',
                borderBottom: '1px solid var(--sap-border)',
                borderLeft: selected === item.id ? '3px solid var(--sap-primary)' : '3px solid transparent',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {item.nome_projeto}
                </div>
                <button
                  onClick={(e) => handleDeleteHistory(item.id, e)}
                  style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 14, lineHeight: 1, flexShrink: 0, padding: 0 }}
                >×</button>
              </div>
              {item.cliente && (
                <div style={{ fontSize: 11, color: 'var(--sap-subtle)', marginTop: 2 }}>{item.cliente}</div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {item.versao_sap && (
                  <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--sap-bg)', borderRadius: 8, color: 'var(--sap-subtle)' }}>
                    {item.versao_sap}
                  </span>
                )}
                {item.resultado?.estimativas?.segura?.total_horas && (
                  <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(0,112,242,0.1)', borderRadius: 8, color: 'var(--sap-primary)', fontFamily: 'monospace' }}>
                    {item.resultado.estimativas.segura.total_horas}h
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--sap-subtle)', marginTop: 4 }}>
                {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Form + Result ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Form card ── */}
        <div style={{ background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text)' }}>📊 Nova Estimativa</div>
              <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2 }}>
                Preencha os dados e gere 3 cenários de esforço com IA
              </div>
            </div>
            {/* SAP Version selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>SAP</span>
              <select
                value={sapVersion || 'ECC 6.0'}
                onChange={e => setSapVersion(e.target.value)}
                style={{ ...inputStyle, width: 160, fontSize: 12 }}
              >
                {SAP_VERSIONS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 18, border: '1px solid var(--sap-border)', borderRadius: 4, overflow: 'hidden', width: 'fit-content' }}>
            {[['ef', '📄 Carregar EF'], ['manual', '✏ Definir Manualmente']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setMode(val)}
                style={{
                  padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  border: 'none', borderRight: val === 'ef' ? '1px solid var(--sap-border)' : 'none',
                  background: mode === val ? 'var(--sap-primary)' : 'transparent',
                  color: mode === val ? '#fff' : 'var(--sap-text)',
                  fontWeight: mode === val ? 600 : 400
                }}
              >{lbl}</button>
            ))}
          </div>

          {/* EF Mode */}
          {mode === 'ef' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Especificação Funcional (DOCX)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleLoadEf}
                  disabled={efLoading}
                  style={{
                    padding: '7px 16px', fontSize: 13, border: '1px solid var(--sap-border)',
                    borderRadius: 4, background: 'var(--sap-bg)', color: 'var(--sap-text)',
                    cursor: efLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {efLoading ? 'Carregando...' : '📂 Selecionar arquivo .docx'}
                </button>
                {efData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--sap-positive)', fontWeight: 600 }}>
                      ✓ {efData.fileName}
                    </span>
                    {efData.formato && (
                      <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 8, fontWeight: 600,
                        background: efData.formato === 'delta' ? 'rgba(233,115,12,0.12)' : 'rgba(0,112,242,0.1)',
                        color: efData.formato === 'delta' ? '#e9730c' : 'var(--sap-primary)'
                      }}>
                        {efData.formato === 'delta' ? 'Delta EF' : 'EF Clássica'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {efData?.data && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--sap-bg)', borderRadius: 4, fontSize: 12 }}>
                  {efData.data.titulo && <div><strong>Título:</strong> {efData.data.titulo}</div>}
                  {efData.data.empresa && <div><strong>Empresa:</strong> {efData.data.empresa}</div>}
                  {efData.data.descricaoResumida && (
                    <div style={{ marginTop: 4, color: 'var(--sap-subtle)' }}>{efData.data.descricaoResumida.slice(0, 200)}{efData.data.descricaoResumida.length > 200 ? '...' : ''}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <div style={{ marginBottom: 16 }}>
              <Field label="Contexto do Projeto">
                <textarea
                  value={form.contexto}
                  onChange={e => f('contexto', e.target.value)}
                  placeholder="Descreva o projeto: o que será desenvolvido, regras de negócio, integrações esperadas, módulos envolvidos..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                />
              </Field>
            </div>
          )}

          {/* Shared fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'ef' ? (
              /* EF mode: only Cliente — versão SAP já está no cabeçalho */
              <Grid cols={1}>
                <Field label="Cliente">
                  <input
                    list="cliente-list"
                    value={form.cliente}
                    onChange={e => f('cliente', e.target.value)}
                    placeholder="Nome da empresa (preenchido automaticamente da EF)"
                    style={inputStyle}
                  />
                  <datalist id="cliente-list">
                    {clienteOptions.map(c => <option key={c} value={c} />)}
                  </datalist>
                </Field>
              </Grid>
            ) : (
              /* Manual mode: todos os campos */
              <>
                <Grid cols={2}>
                  <Field label="Cliente">
                    <input
                      list="cliente-list"
                      value={form.cliente}
                      onChange={e => f('cliente', e.target.value)}
                      placeholder="Nome da empresa"
                      style={inputStyle}
                    />
                    <datalist id="cliente-list">
                      {clienteOptions.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </Field>

                  <Field label="Tipo de Projeto">
                    {tipoOptions.length > 0 ? (
                      <select value={form.tipoProjeto} onChange={e => f('tipoProjeto', e.target.value)} style={inputStyle}>
                        <option value="">Selecione...</option>
                        {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input value={form.tipoProjeto} onChange={e => f('tipoProjeto', e.target.value)} placeholder="Ex: Report, Classe, BAdI..." style={inputStyle} />
                    )}
                  </Field>
                </Grid>

                <Field label="Regras e Restrições Adicionais">
                  <textarea
                    value={form.regras}
                    onChange={e => f('regras', e.target.value)}
                    placeholder="Restrições técnicas, prazos, dependências, padrões exigidos pelo cliente..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
                  />
                </Field>
              </>
            )}
          </div>

          {/* Generate button */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                padding: '9px 24px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                border: 'none', borderRadius: 4,
                background: canGenerate ? 'var(--sap-primary)' : 'var(--sap-border)',
                color: canGenerate ? '#fff' : 'var(--sap-subtle)',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s'
              }}
            >
              {generating ? '⏳ Gerando estimativas...' : '✦ Gerar Estimativas'}
            </button>
            {generating && (
              <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>
                Analisando contexto e calculando cenários...
              </span>
            )}
            {genError && (
              <span style={{ fontSize: 12, color: 'var(--sap-negative)', flex: 1 }}>
                ⚠ {genError}
              </span>
            )}
          </div>
        </div>

        {/* ── Result ── */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary bar */}
            <div style={{ background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text)' }}>{result.projeto}</div>
                <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {result.versao_sap && <span>SAP: {result.versao_sap}</span>}
                  {result.complexidade_geral && (() => {
                    const opts = complexidadeOptions.length > 0 ? complexidadeOptions : ['Baixa', 'Média', 'Alta']
                    const idx  = opts.indexOf(result.complexidade_geral)
                    const col  = idx === 0 ? '#107e3e' : idx === opts.length - 1 ? '#bb0000' : '#e9730c'
                    const bg   = idx === 0 ? 'rgba(16,126,62,0.1)' : idx === opts.length - 1 ? 'rgba(187,0,0,0.1)' : 'rgba(233,115,12,0.1)'
                    return (
                      <span style={{ padding: '1px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: bg, color: col }}>
                        Complexidade {result.complexidade_geral}
                      </span>
                    )
                  })()}
                </div>
              </div>
              {!saved ? (
                <button
                  onClick={handleSave}
                  style={{ padding: '6px 16px', fontSize: 12, border: '1px solid var(--sap-primary)', borderRadius: 4, background: 'transparent', color: 'var(--sap-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  💾 Salvar Estimativa
                </button>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--sap-positive)', fontWeight: 600 }}>✓ Salvo</span>
              )}
            </div>

            {/* 3 estimate cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {['agressiva', 'segura', 'tranquila'].map(tipo => (
                <EstimativaCard
                  key={tipo}
                  tipo={tipo}
                  data={result.estimativas?.[tipo]}
                  accent={accentMap[tipo]}
                />
              ))}
            </div>

            {/* Objects identified — complexidade editável + remover/adicionar */}
            {(result.objetos_identificados?.length > 0 || addedObjects.length > 0) && (
              <div style={{ background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: 8, padding: '14px 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={sectionTitle}>Objetos Identificados</div>
                    {hasPendingChanges && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(233,115,12,0.12)', color: '#e9730c', fontWeight: 600 }}>
                        {totalPending} alteração(ões) pendente(s)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setShowAddForm(v => !v); setAddForm({ nome: '', tipo: tipoOptions[0] || '', complexidade: (complexidadeOptions.length > 0 ? complexidadeOptions : ['Baixa', 'Média', 'Alta'])[0], contexto: '' }) }}
                      style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                        border: '1px solid var(--sap-border)', borderRadius: 4,
                        background: showAddForm ? 'var(--sap-bg)' : 'transparent',
                        color: 'var(--sap-text)', cursor: 'pointer', transition: 'background 0.15s'
                      }}
                    >
                      {showAddForm ? '✕ Cancelar' : '＋ Adicionar Objeto'}
                    </button>
                    {hasPendingChanges && (
                      <button
                        onClick={handleRecalculate}
                        disabled={recalculating}
                        style={{
                          padding: '6px 16px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                          border: 'none', borderRadius: 4,
                          background: recalculating ? 'var(--sap-border)' : '#e9730c',
                          color: recalculating ? 'var(--sap-subtle)' : '#fff',
                          cursor: recalculating ? 'not-allowed' : 'pointer',
                          transition: 'background 0.15s'
                        }}
                      >
                        {recalculating ? '⏳ Recalculando...' : '↻ Recalcular com Alterações'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Object Form */}
                {showAddForm && (
                  <div style={{
                    marginBottom: 14, padding: '12px 14px', borderRadius: 6,
                    border: '1px dashed var(--sap-primary)', background: 'rgba(0,112,242,0.04)',
                    display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: '2 1 160px' }}>
                      <label style={{ ...labelStyle, marginBottom: 3 }}>Objeto</label>
                      <input
                        value={addForm.nome}
                        onChange={e => setAddForm(p => ({ ...p, nome: e.target.value }))}
                        placeholder="Ex: ZCL_MINHA_CLASSE"
                        style={{ ...inputStyle, fontSize: 12 }}
                      />
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                      <label style={{ ...labelStyle, marginBottom: 3 }}>Tipo</label>
                      {tipoOptions.length > 0 ? (
                        <select value={addForm.tipo} onChange={e => setAddForm(p => ({ ...p, tipo: e.target.value }))} style={{ ...inputStyle, fontSize: 12 }}>
                          {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <input value={addForm.tipo} onChange={e => setAddForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Ex: Classe, BAdI..." style={{ ...inputStyle, fontSize: 12 }} />
                      )}
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                      <label style={{ ...labelStyle, marginBottom: 3 }}>Complexidade</label>
                      <select value={addForm.complexidade} onChange={e => setAddForm(p => ({ ...p, complexidade: e.target.value }))} style={{ ...inputStyle, fontSize: 12 }}>
                        {(complexidadeOptions.length > 0 ? complexidadeOptions : ['Baixa', 'Média', 'Alta']).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: '3 1 200px' }}>
                      <label style={{ ...labelStyle, marginBottom: 3 }}>Contexto / Justificativa</label>
                      <input
                        value={addForm.contexto}
                        onChange={e => setAddForm(p => ({ ...p, contexto: e.target.value }))}
                        placeholder="Descreva o que esse objeto faz..."
                        style={{ ...inputStyle, fontSize: 12 }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!addForm.nome.trim()) return
                        setAddedObjects(prev => [...prev, { ...addForm, nome: addForm.nome.trim() }])
                        setShowAddForm(false)
                        setAddForm({ nome: '', tipo: tipoOptions[0] || '', complexidade: (complexidadeOptions.length > 0 ? complexidadeOptions : ['Baixa', 'Média', 'Alta'])[0], contexto: '' })
                      }}
                      style={{
                        padding: '7px 16px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                        border: 'none', borderRadius: 4, background: 'var(--sap-primary)',
                        color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      + Adicionar
                    </button>
                  </div>
                )}

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--sap-bg)' }}>
                        {['Objeto', 'Tipo', 'Complexidade', 'Justificativa', ''].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--sap-border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Existing objects */}
                      {(result.objetos_identificados || []).map((obj, i) => {
                        const isRemoved    = removedIndices.has(i)
                        const complexAtual = editedComplexidades[i] ?? obj.complexidade
                        const foiEditado   = !isRemoved && editedComplexidades[i] && editedComplexidades[i] !== obj.complexidade
                        const opts         = complexidadeOptions.length > 0 ? complexidadeOptions : ['Baixa', 'Média', 'Alta']
                        const idxOpt       = opts.indexOf(complexAtual)
                        const palette      = idxOpt === 0
                          ? { color: '#107e3e', bg: 'rgba(16,126,62,0.08)' }
                          : idxOpt === opts.length - 1
                            ? { color: '#bb0000', bg: 'rgba(187,0,0,0.08)' }
                            : { color: '#e9730c', bg: 'rgba(233,115,12,0.08)' }
                        const rowBg = isRemoved
                          ? 'rgba(187,0,0,0.04)'
                          : i % 2 === 1 ? 'var(--sap-bg)' : 'var(--sap-base)'
                        return (
                          <tr key={i} style={{ background: rowBg, opacity: isRemoved ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, borderBottom: '1px solid var(--sap-border)', textDecoration: isRemoved ? 'line-through' : 'none', color: isRemoved ? 'var(--sap-subtle)' : 'inherit' }}>
                              {obj.nome}
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--sap-border)', color: isRemoved ? 'var(--sap-subtle)' : 'inherit' }}>
                              {obj.tipo}
                            </td>
                            <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--sap-border)' }}>
                              {isRemoved ? (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(187,0,0,0.1)', color: '#bb0000', fontWeight: 600 }}>Removido</span>
                              ) : (
                                <>
                                  <select
                                    value={complexAtual}
                                    onChange={e => {
                                      const val = e.target.value
                                      setEditedComplexidades(prev => {
                                        if (val === obj.complexidade) { const next = { ...prev }; delete next[i]; return next }
                                        return { ...prev, [i]: val }
                                      })
                                    }}
                                    style={{
                                      padding: '2px 6px', fontSize: 11, fontWeight: 600,
                                      border: foiEditado ? `1px solid ${palette.color}` : '1px solid var(--sap-border)',
                                      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                                      background: palette.bg, color: palette.color, outline: 'none'
                                    }}
                                  >
                                    {opts.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                  {foiEditado && (
                                    <span style={{ marginLeft: 6, fontSize: 10, color: '#e9730c' }}>(era {obj.complexidade})</span>
                                  )}
                                </>
                              )}
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--sap-subtle)', borderBottom: '1px solid var(--sap-border)' }}>
                              {obj.justificativa}
                            </td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--sap-border)', textAlign: 'center' }}>
                              {isRemoved ? (
                                <button
                                  onClick={() => setRemovedIndices(prev => { const s = new Set(prev); s.delete(i); return s })}
                                  title="Restaurar objeto"
                                  style={{ width: 22, height: 22, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--sap-primary)', fontSize: 13, lineHeight: 1, padding: 0 }}
                                >↩</button>
                              ) : (
                                <button
                                  onClick={() => setRemovedIndices(prev => new Set([...prev, i]))}
                                  title="Remover objeto da estimativa"
                                  style={{ width: 22, height: 22, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 15, lineHeight: 1, padding: 0 }}
                                >×</button>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Added objects */}
                      {addedObjects.map((obj, ai) => {
                        const opts   = complexidadeOptions.length > 0 ? complexidadeOptions : ['Baixa', 'Média', 'Alta']
                        const idxOpt = opts.indexOf(obj.complexidade)
                        const palette = idxOpt === 0
                          ? { color: '#107e3e', bg: 'rgba(16,126,62,0.08)' }
                          : idxOpt === opts.length - 1
                            ? { color: '#bb0000', bg: 'rgba(187,0,0,0.08)' }
                            : { color: '#e9730c', bg: 'rgba(233,115,12,0.08)' }
                        return (
                          <tr key={`added-${ai}`} style={{ background: 'rgba(0,112,242,0.04)' }}>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--sap-border)' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{obj.nome}</span>
                              <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 6, background: 'rgba(0,112,242,0.12)', color: 'var(--sap-primary)', fontWeight: 700, verticalAlign: 'middle' }}>NOVO</span>
                            </td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--sap-border)' }}>{obj.tipo}</td>
                            <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--sap-border)' }}>
                              <select
                                value={obj.complexidade}
                                onChange={e => setAddedObjects(prev => prev.map((o, idx) => idx === ai ? { ...o, complexidade: e.target.value } : o))}
                                style={{
                                  padding: '2px 6px', fontSize: 11, fontWeight: 600,
                                  border: `1px solid ${palette.color}`, borderRadius: 8,
                                  cursor: 'pointer', fontFamily: 'inherit',
                                  background: palette.bg, color: palette.color, outline: 'none'
                                }}
                              >
                                {opts.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--sap-subtle)', borderBottom: '1px solid var(--sap-border)' }}>
                              {obj.contexto || '—'}
                            </td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--sap-border)', textAlign: 'center' }}>
                              <button
                                onClick={() => setAddedObjects(prev => prev.filter((_, idx) => idx !== ai))}
                                title="Remover objeto adicionado"
                                style={{ width: 22, height: 22, border: '1px solid var(--sap-border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', color: 'var(--sap-subtle)', fontSize: 15, lineHeight: 1, padding: 0 }}
                              >×</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {result.notas_gerais && (
              <div style={{ background: 'rgba(233,115,12,0.06)', border: '1px solid rgba(233,115,12,0.3)', borderRadius: 8, padding: '14px 20px' }}>
                <div style={{ ...sectionTitle, color: '#e9730c', marginBottom: 8 }}>⚠ Notas e Alertas</div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.6 }}>{result.notas_gerais}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
