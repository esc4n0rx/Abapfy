import { create } from 'zustand'

const FONT_SIZES = {
  small: '12px',
  normal: '14px',
  large: '15px',
  xlarge: '16px'
}

export const useThemeStore = create((set, get) => ({
  theme: 'light',
  fontSize: 'normal',

  initialize: () => {
    const theme = localStorage.getItem('abap-theme') || 'light'
    const fontSize = localStorage.getItem('abap-fontsize') || 'normal'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.setProperty('--app-font-size', FONT_SIZES[fontSize] || '14px')
    set({ theme, fontSize })
  },

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('abap-theme', theme)
    set({ theme })
  },

  setFontSize: (size) => {
    document.documentElement.style.setProperty('--app-font-size', FONT_SIZES[size] || '14px')
    localStorage.setItem('abap-fontsize', size)
    set({ fontSize: size })
  },

  reset: () => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.style.setProperty('--app-font-size', '14px')
    localStorage.removeItem('abap-theme')
    localStorage.removeItem('abap-fontsize')
    set({ theme: 'light', fontSize: 'normal' })
  }
}))
