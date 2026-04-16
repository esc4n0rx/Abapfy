import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { ALL_AGENT_PROMPTS } from '../agents/index'

// ─── Flow → Agent mapping ──────────────────────────────────────────────────────

const FLOW_MAPPINGS_KEY = 'abapfy_flow_mappings'

export const FLOW_CONFIGS = [
  { id: 'abap',        label: 'Gerador ABAP',            defaultAgent: 'abaper' },
  { id: 'code_review', label: 'Code Review',              defaultAgent: 'code_review' },
  { id: 'editor',      label: 'Editor SAP',               defaultAgent: 'editor' },
  { id: 'ef',          label: 'Especificação Funcional',  defaultAgent: 'ef_consultant' },
  { id: 'effort',      label: 'Estimativa de Esforço',    defaultAgent: 'effort_estimator' },
  { id: 'dtec',        label: 'Gerador DTec',             defaultAgent: 'dtec_consultant' },
  { id: 'performance', label: 'Análise de Performance',   defaultAgent: 'performance_analyzer' },
  { id: 'enhancement', label: 'Enhancement Finder',       defaultAgent: 'enhancement_finder' },
]

export const FLOW_DEFAULTS = Object.fromEntries(
  FLOW_CONFIGS.map(f => [f.id, f.defaultAgent])
)

const loadMappings = () => {
  try { return JSON.parse(localStorage.getItem(FLOW_MAPPINGS_KEY) || '{}') }
  catch { return {} }
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAgentStore = create((set, get) => ({
  userAgents:    [],
  defaultAgents: [],   // carregados do banco — disponíveis para todos os usuários autenticados
  loading:       false,
  agentMappings: loadMappings(),

  // ── Flow configuration ───────────────────────────────────────────────────────

  setFlowAgent: (flow, agentId) => {
    const mappings = { ...get().agentMappings, [flow]: agentId }
    localStorage.setItem(FLOW_MAPPINGS_KEY, JSON.stringify(mappings))
    set({ agentMappings: mappings })
  },

  /**
   * Retorna o system prompt para um dado flow.
   * Prioridade: agente do usuário → agente padrão do banco → fallback local (build-time).
   */
  getFlowPrompt: (flow) => {
    const { agentMappings, userAgents, defaultAgents } = get()
    const agentId = agentMappings[flow] || FLOW_DEFAULTS[flow]

    // 1. Agentes do usuário (Supabase, por usuário)
    const userAgent = userAgents.find(a => a.id === agentId)
    if (userAgent?.content) return userAgent.content

    // 2. Agentes padrão do banco (Supabase, shared)
    const dbDefault = defaultAgents.find(a => a.id === agentId)
    if (dbDefault?.content) return dbDefault.content

    // 3. Fallback local — caso o banco ainda não tenha carregado ou esteja offline
    if (ALL_AGENT_PROMPTS[agentId]) return ALL_AGENT_PROMPTS[agentId]

    // 4. Último recurso: default do flow (banco → local)
    const flowDefault = defaultAgents.find(a => a.id === FLOW_DEFAULTS[flow])
    return flowDefault?.content || ALL_AGENT_PROMPTS[FLOW_DEFAULTS[flow]] || ''
  },

  // ── Default agents (banco) ────────────────────────────────────────────────────

  loadDefaultAgents: async () => {
    try {
      const { data, error } = await supabase
        .from('default_agents')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      set({ defaultAgents: data || [] })
    } catch {
      // Falha silenciosa — fallback local (ALL_AGENT_PROMPTS) continua funcionando
    }
  },

  // ── User agents CRUD ─────────────────────────────────────────────────────────

  loadUserAgents: async () => {
    set({ loading: true })
    try {
      // Carrega agentes do usuário e defaults em paralelo
      const [userRes, defaultRes] = await Promise.all([
        supabase.from('user_agents').select('*').order('created_at', { ascending: false }),
        supabase.from('default_agents').select('*').order('sort_order', { ascending: true })
      ])
      if (userRes.error) throw userRes.error
      set({
        userAgents:    userRes.data    || [],
        defaultAgents: defaultRes.data || [],
        loading: false
      })
    } catch {
      set({ loading: false })
      // Garante que defaults locais continuam disponíveis — nenhuma ação extra necessária
    }
  },

  saveAgent: async ({ id, name, description, content }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      if (id) {
        const { error } = await supabase
          .from('user_agents')
          .update({ name, description, content, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_agents')
          .insert({ user_id: user.id, name, description: description || '', content })
        if (error) throw error
      }
      await get().loadUserAgents()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteAgent: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')
      const { error } = await supabase
        .from('user_agents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      await get().loadUserAgents()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}))
