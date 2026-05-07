import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUpdateStore } from '../store/updateStore'

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" />
      <rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  ),
  abap: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,4 2,10 6,16" />
      <polyline points="14,4 18,10 14,16" />
      <line x1="12" y1="4" x2="8" y2="16" />
    </svg>
  ),
  historico: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <polyline points="10,5 10,10 13,13" />
    </svg>
  ),
  editor: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2l4 4-10 10H4v-4L14 2z" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,15 7,9 11,12 18,4" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  specs: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="13" x2="10" y2="13" />
    </svg>
  ),
  dtec: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <line x1="7" y1="6" x2="13" y2="6" />
      <line x1="7" y1="9" x2="13" y2="9" />
      <line x1="7" y1="12" x2="11" y2="12" />
      <circle cx="13" cy="15" r="2.5" />
      <line x1="15" y1="17" x2="17" y2="19" />
    </svg>
  ),
  enhancement: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6" />
      <line x1="13.5" y1="13.5" x2="18" y2="18" />
      <line x1="9" y1="6" x2="9" y2="12" />
      <line x1="6" y1="9" x2="12" y2="9" />
    </svg>
  ),
  snippets: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,3 2,10 5,17" />
      <polyline points="15,3 18,10 15,17" />
      <line x1="8" y1="7" x2="12" y2="13" />
    </svg>
  ),
  estimativas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="16" height="16" rx="1.5" />
      <line x1="2" y1="7" x2="18" y2="7" />
      <line x1="7" y1="7" x2="7" y2="18" />
      <line x1="10" y1="11" x2="14" y2="11" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
    </svg>
  ),
  updates: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10,3 10,13" />
      <polyline points="6,9 10,13 14,9" />
      <path d="M4,15 Q4,17 6,17 H14 Q16,17 16,15" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <line x1="10" y1="9" x2="10" y2="14" />
      <circle cx="10" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',      icon: 'dashboard',    path: '/dashboard' },
  { id: 'abap',        label: 'ABAP',           icon: 'abap',         path: '/dashboard/abap' },
  { id: 'historico',   label: 'Histórico',      icon: 'historico',    path: '/dashboard/historico' },
  { id: 'editor',      label: 'Editor',         icon: 'editor',       path: '/dashboard/editor' },
  { id: 'performance', label: 'Performance',    icon: 'performance',  path: '/dashboard/performance' },
  { id: 'specs',       label: 'Especificações', icon: 'specs',        path: '/dashboard/specs' },
  { id: 'dtec',        label: 'DTec',           icon: 'dtec',         path: '/dashboard/dtec' },
  { id: 'enhancement', label: 'Enhancement',   icon: 'enhancement',  path: '/dashboard/enhancement' },
  { id: 'snippets',    label: 'Snippets',       icon: 'snippets',     path: '/dashboard/snippets' },
  { id: 'estimativas', label: 'Estimativas',    icon: 'estimativas',  path: '/dashboard/estimativas' },
  { id: 'settings',    label: 'Configurações',  icon: 'settings',     path: '/dashboard/settings' },
  { id: 'updates',     label: 'Atualizações',   icon: 'updates',      path: '/dashboard/updates' },
  { id: 'about',       label: 'Sobre',          icon: 'about',        path: '/dashboard/about' }
]

export default function Sidebar({ collapsed = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { updateAvailable } = useUpdateStore()

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      minHeight: '100%',
      background: 'var(--sap-base)',
      borderRight: '1px solid var(--sap-border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0
    }}>
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
      <span style={{
        position: 'relative',
        width: 20, height: 20,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: isActive ? 1 : 0.55,
        transition: 'opacity 0.15s'
      }}>
        <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons[item.icon]}
        </span>
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
