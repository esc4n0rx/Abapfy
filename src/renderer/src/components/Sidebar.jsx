import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUpdateStore } from '../store/updateStore'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',         icon: '⊞', path: '/dashboard' },
  { id: 'abap',         label: 'ABAP',              icon: '◈', path: '/dashboard/abap' },
  { id: 'historico',    label: 'Histórico',         icon: '🗂', path: '/dashboard/historico' },
  { id: 'code-review',  label: 'Code Review',       icon: '🔍', path: '/dashboard/code-review' },
  { id: 'performance',  label: 'Performance',       icon: '⚡', path: '/dashboard/performance' },
  { id: 'specs',        label: 'Especificações',    icon: '📋', path: '/dashboard/specs' },
  { id: 'dtec',         label: 'DTec',              icon: '📄', path: '/dashboard/dtec' },
  { id: 'enhancement',  label: 'Enhancement',       icon: '🔎', path: '/dashboard/enhancement' },
  { id: 'snippets',     label: 'Snippets',          icon: '✂', path: '/dashboard/snippets' },
  { id: 'chat',         label: 'Chat Projeto',      icon: '💬', path: '/dashboard/chat' },
  { id: 'settings',     label: 'Configurações',     icon: '⚒', path: '/dashboard/settings' },
  { id: 'updates',      label: 'Atualizações',      icon: '⬆', path: '/dashboard/updates' },
  { id: 'about',        label: 'Sobre',             icon: 'ℹ', path: '/dashboard/about' }
]

export default function Sidebar({ collapsed = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { updateAvailable } = useUpdateStore()

  return (
    <aside
      style={{
        width: collapsed ? 56 : 220,
        minHeight: '100%',
        background: 'var(--sap-base)',
        borderRight: '1px solid var(--sap-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
          return (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isActive}
              collapsed={collapsed}
              onClick={() => navigate(item.path)}
              badge={item.id === 'updates' && updateAvailable}
            />
          )
        })}
      </nav>
    </aside>
  )
}

function SidebarItem({ item, isActive, collapsed, onClick, badge }) {
  const [hover, setHover] = React.useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 14px',
        border: 'none',
        background: isActive
          ? 'var(--sap-active-bg)'
          : hover ? 'var(--sap-hover-bg)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--sap-primary)' : '3px solid transparent',
        cursor: 'pointer',
        textAlign: 'left',
        color: isActive ? 'var(--sap-primary)' : 'var(--sap-text)',
        fontSize: 14,
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      }}
    >
      <span style={{ position: 'relative', width: 20, height: 20, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, lineHeight: 1,
        opacity: isActive ? 1 : 0.6
      }}>
        {item.icon}
        {badge && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 7, height: 7, borderRadius: '50%',
            background: '#e9730c', border: '1.5px solid var(--sap-base)'
          }} />
        )}
      </span>
      {!collapsed && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3, flex: 1 }}>
          {item.label}
        </span>
      )}
      {!collapsed && badge && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#fff',
          background: '#e9730c', borderRadius: 10,
          padding: '1px 6px', flexShrink: 0
        }}>
          Novo
        </span>
      )}
    </button>
  )
}
