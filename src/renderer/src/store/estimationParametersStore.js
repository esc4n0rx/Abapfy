import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useEstimationParametersStore = create((set) => ({
  parametros: [],
  loading: false,
  error: null,

  loadParametros: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('estimativa_parametros')
        .select('*')
        .order('tipo', { ascending: true })
        .order('objeto', { ascending: true })

      if (error) throw error
      set({ parametros: data || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  addParametro: async (fields) => {
    try {
      const { data, error } = await supabase
        .from('estimativa_parametros')
        .insert({
          tipo:        fields.tipo        || '',
          objeto:      fields.objeto      || '',
          complexidade: fields.complexidade || 'Média',
          analise_ef:  parseFloat(fields.analise_ef) || 0,
          espec:       parseFloat(fields.espec)      || 0,
          codific:     parseFloat(fields.codific)    || 0,
          testes:      parseFloat(fields.testes)     || 0
        })
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        parametros: [...state.parametros, data].sort((a, b) =>
          a.tipo.localeCompare(b.tipo) || a.objeto.localeCompare(b.objeto)
        )
      }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateParametro: async (id, fields) => {
    try {
      const { data, error } = await supabase
        .from('estimativa_parametros')
        .update({
          tipo:        fields.tipo,
          objeto:      fields.objeto,
          complexidade: fields.complexidade,
          analise_ef:  parseFloat(fields.analise_ef) || 0,
          espec:       parseFloat(fields.espec)      || 0,
          codific:     parseFloat(fields.codific)    || 0,
          testes:      parseFloat(fields.testes)     || 0
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        parametros: state.parametros
          .map((p) => (p.id === id ? data : p))
          .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.objeto.localeCompare(b.objeto))
      }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteParametro: async (id) => {
    try {
      const { error } = await supabase
        .from('estimativa_parametros')
        .delete()
        .eq('id', id)

      if (error) throw error
      set((state) => ({
        parametros: state.parametros.filter((p) => p.id !== id)
      }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}))
