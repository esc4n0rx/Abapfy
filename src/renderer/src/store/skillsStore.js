import { create } from 'zustand'
import { loadSkills } from '../lib/skillsLoader'

const ALL_SKILLS = loadSkills()

const ENABLED_KEY = 'abapfy_skills_enabled'
const ASSOC_KEY   = 'abapfy_skills_associations'

// Object types that can have skill associations
export const SKILL_OBJECT_TYPES = [
  { key: 'REPORT', label: 'Report' },
  { key: 'FUNC',   label: 'Function Module' },
  { key: 'CLAS',   label: 'Classe ABAP' },
  { key: 'ENHO',   label: 'Enhancement' },
  { key: 'PROG',   label: 'Programa' },
  { key: 'CDS',    label: 'CDS View' },
  { key: 'EF',     label: 'Modo EF (Especificação Funcional)' }
]

// Default associations per type
const DEFAULT_ASSOCIATIONS = {
  REPORT: ['sap-abap'],
  FUNC:   ['sap-abap'],
  CLAS:   ['sap-abap'],
  ENHO:   ['sap-abap'],
  PROG:   ['sap-abap'],
  CDS:    ['sap-abap', 'sap-abap-cds'],
  EF:     ['sap-abap']
}

function loadEnabled() {
  try { return JSON.parse(localStorage.getItem(ENABLED_KEY) || '{}') }
  catch { return {} }
}

function loadAssociations() {
  try {
    const saved = JSON.parse(localStorage.getItem(ASSOC_KEY) || '{}')
    // Merge with defaults so new types always have defaults
    return { ...DEFAULT_ASSOCIATIONS, ...saved }
  } catch { return { ...DEFAULT_ASSOCIATIONS } }
}

function persistEnabled(skills) {
  const state = {}
  skills.forEach(s => { state[s.id] = s.enabled })
  localStorage.setItem(ENABLED_KEY, JSON.stringify(state))
}

function persistAssociations(assoc) {
  localStorage.setItem(ASSOC_KEY, JSON.stringify(assoc))
}

export const useSkillsStore = create((set, get) => {
  const savedEnabled = loadEnabled()
  const skills = ALL_SKILLS.map(s => ({
    ...s,
    enabled: savedEnabled[s.id] !== false // default: all enabled
  }))

  return {
    skills,
    associations: loadAssociations(), // { REPORT: ['sap-abap'], CDS: ['sap-abap', 'sap-abap-cds'], ... }

    toggleSkill: (id) => {
      set(state => {
        const updated = state.skills.map(s =>
          s.id === id ? { ...s, enabled: !s.enabled } : s
        )
        persistEnabled(updated)
        return { skills: updated }
      })
    },

    enableAll: () => {
      set(state => {
        const updated = state.skills.map(s => ({ ...s, enabled: true }))
        persistEnabled(updated)
        return { skills: updated }
      })
    },

    disableAll: () => {
      set(state => {
        const updated = state.skills.map(s => ({ ...s, enabled: false }))
        persistEnabled(updated)
        return { skills: updated }
      })
    },

    // Toggle a skill association for an object type
    toggleAssociation: (objectType, skillId) => {
      set(state => {
        const current = state.associations[objectType] || []
        const updated = current.includes(skillId)
          ? current.filter(id => id !== skillId)
          : [...current, skillId]
        const newAssoc = { ...state.associations, [objectType]: updated }
        persistAssociations(newAssoc)
        return { associations: newAssoc }
      })
    },

    // Returns prompt context for skills associated with the given object type
    // Only includes skills that are both enabled AND associated with the type
    getSkillsForType: (objectType) => {
      const { skills, associations } = get()
      const associated = associations[objectType] || []
      const relevant = skills.filter(s =>
        s.enabled && s.skillContent && associated.includes(s.id)
      )
      if (!relevant.length) return ''
      const sections = relevant.map(s =>
        `## Skill Reference: ${s.name}\n\n${s.skillContent}`
      ).join('\n\n---\n\n')
      return `\n\n# SAP Skills Reference\n\n${sections}`
    }
  }
})
