import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const NUMERIC_FIELDS = [
  'levantamento', 'impl_proposal', 'esp_func', 'esp_tec', 'codific',
  'traducao_en', 'traducao_es', 'teste_unitario', 'teste_qas',
  'bpp_pt', 'bpp_en', 'bpp_es', 'teste_volume',
  'homologacao', 'access_control', 'homologacao_2',
  'go_live', 'documentacao', 'gerencia'
]

function toRow(fields) {
  const row = { empresa: fields.empresa || '' }
  for (const f of NUMERIC_FIELDS) row[f] = parseFloat(fields[f]) || 0
  return row
}

export const useClienteParametrosStore = create((set) => ({
  clientes: [],
  loading: false,
  error: null,

  loadClientes: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('cliente_parametros')
        .select('*')
        .order('empresa', { ascending: true })

      if (error) throw error
      set({ clientes: data || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  addCliente: async (fields) => {
    try {
      const { data, error } = await supabase
        .from('cliente_parametros')
        .insert(toRow(fields))
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        clientes: [...state.clientes, data].sort((a, b) => a.empresa.localeCompare(b.empresa))
      }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  updateCliente: async (id, fields) => {
    try {
      const { data, error } = await supabase
        .from('cliente_parametros')
        .update(toRow(fields))
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        clientes: state.clientes
          .map((c) => (c.id === id ? data : c))
          .sort((a, b) => a.empresa.localeCompare(b.empresa))
      }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteCliente: async (id) => {
    try {
      const { error } = await supabase
        .from('cliente_parametros')
        .delete()
        .eq('id', id)

      if (error) throw error
      set((state) => ({
        clientes: state.clientes.filter((c) => c.id !== id)
      }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}))
