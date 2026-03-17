import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCodeReviewStore = create((set, get) => ({
  sessions: [],
  loading: false,

  loadSessions: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('user_code_reviews')
        .select('id, name, context, files, messages, created_at, updated_at')
        .order('updated_at', { ascending: false })
      if (error) throw error
      set({ sessions: data || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createSession: async ({ name, context, files }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Não autenticado' }

      const { data, error } = await supabase
        .from('user_code_reviews')
        .insert({ user_id: user.id, name, context, files: files || [], messages: [] })
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
        .from('user_code_reviews')
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
    await supabase.from('user_code_reviews').delete().eq('id', sessionId)
    set(state => ({ sessions: state.sessions.filter(s => s.id !== sessionId) }))
  }
}))
