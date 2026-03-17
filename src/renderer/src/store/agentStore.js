import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAgentStore = create((set, get) => ({
  userAgents: [],
  loading: false,

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
