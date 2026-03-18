import React from 'react'
import logo from '../assets/logo.png'

export default function SplashScreen({ error }) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#354a5e',
      color: '#ffffff'
    }}>
      <img src={logo} alt="Abapfy" style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 16 }} />
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>Abapfy</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>SAP Tools</div>

      {error ? (
        <div style={{
          marginTop: 32,
          background: 'rgba(187,0,0,0.25)',
          border: '1px solid rgba(187,0,0,0.6)',
          borderRadius: 8,
          padding: '16px 24px',
          maxWidth: 480,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#ff6b6b', marginBottom: 8 }}>
            Erro de configuração
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
            {error}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12 }}>
            Verifique os secrets <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong><br />
            no ambiente DEV do GitHub Actions e refaça o build.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 32 }} className="splash-spinner" />
      )}
    </div>
  )
}
