import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAbapStore = create((set, get) => ({
  programs: [],
  loading: false,

  loadPrograms: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('user_abap_programs')
        .select('id, name, type, description, result, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      set({ programs: data || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  saveProgram: async ({ name, type, description, metadata, result }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { error } = await supabase
        .from('user_abap_programs')
        .insert({ user_id: user.id, name, type, description, metadata, result })
      if (error) throw error
      await get().loadPrograms()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteProgram: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { error } = await supabase
        .from('user_abap_programs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      await get().loadPrograms()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}))
