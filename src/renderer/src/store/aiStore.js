import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const AI_PROVIDERS = {
  // ─── Integrações CLI (sem API key) ──────────────────────────────────────────
  claude_integration: {
    label: 'Claude Code (CLI)',
    color: '#CC785C',
    icon: '◆',
    isIntegration: true,
    integrationType: 'agent',
    description: 'Usa o Claude Code instalado localmente — sem API key',
    installCmd: 'npm install -g @anthropic-ai/claude-code'
  },
  codex_integration: {
    label: 'Codex CLI (OpenAI)',
    color: '#10A37F',
    icon: '⬡',
    isIntegration: true,
    integrationType: 'codex',
    description: 'Usa o Codex CLI instalado localmente — sem API key',
    installCmd: 'npm install -g @openai/codex'
  },
  // ─── Provedores API ──────────────────────────────────────────────────────────
  claude: {
    label: 'Claude',
    color: '#CC785C',
    icon: '◆',
    defaultModel: 'claude-sonnet-4-6',
    placeholder: 'sk-ant-api...',
    docsUrl: 'https://console.anthropic.com'
  },
  gemini: {
    label: 'Gemini',
    color: '#4285F4',
    icon: '✦',
    defaultModel: 'gemini-2.0-flash',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com'
  },
  openai: {
    label: 'OpenAI',
    color: '#10A37F',
    icon: '⬡',
    defaultModel: 'gpt-4o',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com'
  },
  groq: {
    label: 'Groq',
    color: '#F55036',
    icon: '⚡',
    defaultModel: 'qwen/qwen3-32b',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com'
  }
}

const defaultState = () =>
  Object.fromEntries(
    Object.entries(AI_PROVIDERS).map(([key, meta]) => [
      key,
      meta.isIntegration
        ? { enabled: false }
        : { apiKey: '', model: meta.defaultModel, enabled: false }
    ])
  )

export const useAiStore = create((set, get) => ({
  providers: defaultState(),
  loading: false,

  loadProviders: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('user_ai_providers')
        .select('provider, api_key, model, enabled')

      if (error) throw error

      const providers = defaultState()
      data?.forEach((row) => {
        if (providers[row.provider] !== undefined) {
          const meta = AI_PROVIDERS[row.provider]
          if (meta?.isIntegration) {
            providers[row.provider] = { enabled: row.enabled || false }
          } else {
            providers[row.provider] = {
              apiKey: row.api_key || '',
              model: row.model || AI_PROVIDERS[row.provider]?.defaultModel,
              enabled: row.enabled || false
            }
          }
        }
      })
      set({ providers, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateLocal: (provider, patch) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [provider]: { ...state.providers[provider], ...patch }
      }
    }))
  },

  saveProvider: async (provider) => {
    const p = get().providers[provider]
    const meta = AI_PROVIDERS[provider]
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase.from('user_ai_providers').upsert(
        {
          user_id: user.id,
          provider,
          api_key: meta?.isIntegration ? '' : (p.apiKey || ''),
          model:   meta?.isIntegration ? '' : (p.model   || ''),
          enabled: p.enabled,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,provider' }
      )
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  testProvider: async (provider) => {
    const meta = AI_PROVIDERS[provider]
    if (meta?.isIntegration) {
      const res = await window.api.checkCli({ tool: meta.integrationType })
      return {
        success: res.installed,
        error: res.installed
          ? null
          : `${meta.label} não está instalado. Execute: ${meta.installCmd}`
      }
    }
    const { apiKey, model } = get().providers[provider]
    if (!apiKey.trim()) return { success: false, error: 'API key não configurada' }
    return await window.api.testAI({ provider, apiKey, model })
  }
}))
