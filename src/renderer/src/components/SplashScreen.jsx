import React from 'react'

export default function SplashScreen() {
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
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2 }}>ABAP</div>
      <div style={{ fontSize: 16, opacity: 0.7, marginTop: 4 }}>Tools</div>
      <div style={{ marginTop: 32 }} className="splash-spinner" />
    </div>
  )
}
