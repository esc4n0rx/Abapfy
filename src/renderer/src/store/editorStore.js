import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useEditorStore = create((set, get) => ({
  sessions: [],
  loading: false,

  loadSessions: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('editor_sessions')
        .select('id, name, sap_version, context, business_rules, files, messages, created_at, updated_at')
        .order('updated_at', { ascending: false })
      if (error) throw error
      set({ sessions: data || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createSession: async ({ name, sap_version, context, business_rules, files }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Não autenticado' }

      const { data, error } = await supabase
        .from('editor_sessions')
        .insert({
          user_id: user.id,
          name,
          sap_version,
          context: context || '',
          business_rules: business_rules || '',
          files: files || [],
          messages: []
        })
        .select()
        .single()

      if (error) throw error
      set(state => ({ sessions: [data, ...state.sessions] }))
      return { success: true, session: data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateMessages: async (sessionId, messages) => {
    try {
      const { error } = await supabase
        .from('editor_sessions')
        .update({ messages, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (error) throw error

      set(state => ({
        sessions: state.sessions.map(s =>
          s.id === sessionId
            ? { ...s, messages, updated_at: new Date().toISOString() }
            : s
        )
      }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteSession: async (sessionId) => {
    await supabase.from('editor_sessions').delete().eq('id', sessionId)
    set(state => ({ sessions: state.sessions.filter(s => s.id !== sessionId) }))
  }
}))
