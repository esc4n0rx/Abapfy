import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useEspecificacoesStore = create((set, get) => ({
  specs: [],
  loading: false,
  error: null,

  loadSpecs: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('user_ef_specs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ specs: data || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  saveSpec: async (specData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const row = {
        user_id: user.id,
        project_name: specData.project_name || '',
        author: specData.author || '',
        client_name: specData.client_name || '',
        context_input: specData.context_input || '',
        generated_content: specData.generated_content || null,
        status: 'generated',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_ef_specs')
        .insert(row)
        .select()
        .single()

      if (error) throw error
      set((state) => ({ specs: [data, ...state.specs] }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteSpec: async (id) => {
    try {
      const { error } = await supabase
        .from('user_ef_specs')
        .delete()
        .eq('id', id)

      if (error) throw error
      set((state) => ({ specs: state.specs.filter((s) => s.id !== id) }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}))
