import React from 'react'

export default function StatusCard({ title, value, subtitle, color = '#0070f2', icon }) {
  return (
    <div style={{
      background: 'var(--sap-base)',
      border: '1px solid var(--sap-border)',
      borderTop: `3px solid ${color}`,
      borderRadius: 8,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
          {title}
        </span>
        {icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, flexShrink: 0
          }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  )
}
