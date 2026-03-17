import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import TitleBar from './TitleBar'

export default function ShellBar({ onToggleSidebar }) {
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header
      style={{
        background: '#354a5e',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'stretch',
        height: 48,
        flexShrink: 0,
        WebkitAppRegion: 'drag',
        position: 'relative',
        zIndex: 100
      }}
    >
      {/* Sidebar Toggle */}
      <button
        onClick={onToggleSidebar}
        style={{
          WebkitAppRegion: 'no-drag',
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          padding: '0 16px',
          cursor: 'pointer',
          fontSize: 18,
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center'
        }}
        title="Menu"
      >
        ☰
      </button>

      {/* Logo + App Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 4,
          background: '#0070f2', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, flexShrink: 0
        }}>
          AF
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
          Abapfy
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Window Controls */}
      <TitleBar theme="dark" />

      {/* User Menu */}
      <div
        style={{ WebkitAppRegion: 'no-drag', position: 'relative', display: 'flex', alignItems: 'center', paddingRight: 16 }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: 4
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#0070f2', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff'
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#ffffff',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              minWidth: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              zIndex: 200
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#32363a' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#6a6d70', marginTop: 2 }}>{user?.email}</div>
            </div>
            <button
              onClick={() => { setMenuOpen(false); logout() }}
              style={{
                width: '100%', padding: '10px 16px', border: 'none',
                background: 'transparent', textAlign: 'left',
                cursor: 'pointer', fontSize: 13, color: '#bb0000',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <span>⏻</span> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
