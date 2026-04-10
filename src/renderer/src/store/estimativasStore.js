import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useEstimativasStore = create((set) => ({
  estimativas: [],
  loading: false,
  error: null,

  loadEstimativas: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('user_estimativas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ estimativas: data || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  saveEstimativa: async (fields) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('user_estimativas')
        .insert({
          user_id:      user.id,
          nome_projeto: fields.nome_projeto || 'Estimativa',
          cliente:      fields.cliente      || null,
          tipo_projeto: fields.tipo_projeto || null,
          versao_sap:   fields.versao_sap   || null,
          input_type:   fields.input_type   || 'manual',
          contexto:     fields.contexto     || null,
          resultado:    fields.resultado    || null
        })
        .select()
        .single()

      if (error) throw error
      set((state) => ({ estimativas: [data, ...state.estimativas] }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteEstimativa: async (id) => {
    try {
      const { error } = await supabase
        .from('user_estimativas')
        .delete()
        .eq('id', id)

      if (error) throw error
      set((state) => ({ estimativas: state.estimativas.filter((e) => e.id !== id) }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}))
