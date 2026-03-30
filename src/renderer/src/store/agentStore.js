import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { ALL_AGENT_PROMPTS } from '../agents/index'

// ─── Flow → Agent mapping ──────────────────────────────────────────────────────

const FLOW_MAPPINGS_KEY = 'abapfy_flow_mappings'

export const FLOW_CONFIGS = [
  { id: 'abap',        label: 'Gerador ABAP',            defaultAgent: 'abaper' },
  { id: 'code_review', label: 'Code Review',              defaultAgent: 'code_review' },
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
  userAgents: [],
  loading: false,
  agentMappings: loadMappings(),

  // ── Flow configuration ───────────────────────────────────────────────────────

  setFlowAgent: (flow, agentId) => {
    const mappings = { ...get().agentMappings, [flow]: agentId }
    localStorage.setItem(FLOW_MAPPINGS_KEY, JSON.stringify(mappings))
    set({ agentMappings: mappings })
  },

  /**
   * Returns the system prompt for a given flow.
   * Prefers the configured agent; falls back to the default for the flow.
   */
  getFlowPrompt: (flow) => {
    const { agentMappings, userAgents } = get()
    const agentId = agentMappings[flow] || FLOW_DEFAULTS[flow]

    // Default agents (available immediately from build-time imports)
    if (ALL_AGENT_PROMPTS[agentId]) return ALL_AGENT_PROMPTS[agentId]

    // User agents (loaded from Supabase)
    const userAgent = userAgents.find(a => a.id === agentId)
    if (userAgent?.content) return userAgent.content

    // Fallback to default for this flow
    return ALL_AGENT_PROMPTS[FLOW_DEFAULTS[flow]] || ''
  },

  // ── User agents CRUD ─────────────────────────────────────────────────────────

  loadUserAgents: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('user_agents')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ userAgents: data || [], loading: false })
    } catch {
      set({ loading: false })
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
