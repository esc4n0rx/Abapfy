import React from 'react'

export default function StatusCard({ title, value, subtitle, color = '#0070f2', icon }) {
  return (
    <div style={{
      background: 'var(--sap-base)',
      border: '1px solid var(--sap-border)',
      borderRadius: 8,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
          {title}
        </span>
        {icon && <span style={{ fontSize: 20, opacity: 0.5 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>{subtitle}</div>
      )}
    </div>
  )
}
