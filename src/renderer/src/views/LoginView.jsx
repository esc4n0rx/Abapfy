import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import TitleBar from '../components/TitleBar'

export default function LoginView() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState(null)
  const { login, register, loading, error, clearError } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setMessage(null)

    if (tab === 'login') {
      const res = await login(email, password)
      if (!res.success) return
    } else {
      if (!fullName.trim()) {
        return setMessage({ type: 'error', text: 'Por favor, informe seu nome completo.' })
      }
      const res = await register(email, password, fullName)
      if (!res.success) return
      if (res.needsConfirmation) {
        setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail para confirmar o cadastro.' })
        setTab('login')
        return
      }
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #354a5e 0%, #1a2d3f 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"72", Arial, Helvetica, sans-serif',
      borderRadius: 10,
      overflow: 'hidden'
    }}>
      {/* TitleBar no topo da tela de login */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'flex-end',
        paddingTop: 8, paddingRight: 12,
        WebkitAppRegion: 'drag'
      }}>
        <TitleBar theme="dark" />
      </div>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12,
          background: '#0070f2', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#ffffff',
          margin: '0 auto 12px',
          boxShadow: '0 4px 24px rgba(0,112,242,0.4)'
        }}>
          AF
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', letterSpacing: 1 }}>
          Abapfy
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
          Um conjunto de ferramentas para a área SAP
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 10,
        padding: '32px 40px',
        width: 380,
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          marginBottom: 28,
          borderBottom: '2px solid #f0f0f0'
        }}>
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); clearError(); setMessage(null) }}
              style={{
                flex: 1, padding: '8px 0', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#0070f2' : '#6a6d70',
                borderBottom: tab === t ? '2px solid #0070f2' : '2px solid transparent',
                marginBottom: -2,
                transition: 'all 0.2s'
              }}
            >
              {t === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <FormField
              label="Nome Completo"
              value={fullName}
              onChange={setFullName}
              placeholder="Seu nome completo"
              required
            />
          )}
          <FormField
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            required
          />
          <FormField
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />

          {(error || message) && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
              background: error || message?.type === 'error' ? '#fff1f0' : '#f0fff4',
              color: error || message?.type === 'error' ? '#bb0000' : '#107e3e',
              border: `1px solid ${error || message?.type === 'error' ? '#ffccc7' : '#b7eb8f'}`
            }}>
              {error || message?.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#bcd5f7' : '#0070f2',
              color: '#ffffff', border: 'none', borderRadius: 6,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.3, transition: 'background 0.2s',
              marginTop: 4
            }}
          >
            {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        Abapfy v1.0.1
      </div>
    </div>
  )
}

function FormField({ label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600,
        color: '#354a5e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid #d9d9d9', borderRadius: 6,
          fontSize: 14, color: '#32363a', outline: 'none',
          boxSizing: 'border-box', transition: 'border-color 0.2s',
          background: '#fafafa'
        }}
        onFocus={(e) => e.target.style.borderColor = '#0070f2'}
        onBlur={(e) => e.target.style.borderColor = '#d9d9d9'}
      />
    </div>
  )
}
