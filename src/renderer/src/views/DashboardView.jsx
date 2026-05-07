import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import ShellBar from '../components/ShellBar'
import Sidebar from '../components/Sidebar'
import StatusCard from '../components/StatusCard'
import { useAuthStore } from '../store/authStore'
import { useAbapStore } from '../store/abapStore'
import { useCodeReviewStore } from '../store/codeReviewStore'
import { useEspecificacoesStore } from '../store/especificacoesStore'
import { useAiStore } from '../store/aiStore'
import SettingsView from './SettingsView'
import AboutView from './AboutView'
import AbapView from './AbapView'
import CodeReviewView from './CodeReviewView'
import EditorView from './EditorView'
import EspecificacoesView from './EspecificacoesView'
import AtualizacoesView from './AtualizacoesView'
import HistoricoView from './HistoricoView'
import SnippetLibraryView from './SnippetLibraryView'
import DtecView from './DtecView'
import EnhancementFinderView from './EnhancementFinderView'
import PerformanceView from './PerformanceView'
import EstimativasView from './EstimativasView'

// ─── SVG Icons (same visual language as Sidebar) ──────────────────────────────

const Icons = {
  abap: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="6,4 2,10 6,16" />
      <polyline points="14,4 18,10 14,16" />
      <line x1="12" y1="4" x2="8" y2="16" />
    </svg>
  ),
  editor: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <path d="M14 2l4 4-10 10H4v-4L14 2z" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  specs: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <line x1="7" y1="7" x2="13" y2="7" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="13" x2="10" y2="13" />
    </svg>
  ),
  historico: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="10" cy="10" r="8" />
      <polyline points="10,5 10,10 13,13" />
    </svg>
  ),
  performance: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="2,15 7,9 11,12 18,4" />
      <line x1="2" y1="18" x2="18" y2="18" />
    </svg>
  ),
  dtec: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <line x1="7" y1="6" x2="13" y2="6" />
      <line x1="7" y1="9" x2="13" y2="9" />
      <line x1="7" y1="12" x2="11" y2="12" />
      <circle cx="13" cy="15" r="2.5" />
      <line x1="15" y1="17" x2="17" y2="19" />
    </svg>
  ),
  enhancement: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="9" cy="9" r="6" />
      <line x1="13.5" y1="13.5" x2="18" y2="18" />
      <line x1="9" y1="6" x2="9" y2="12" />
      <line x1="6" y1="9" x2="12" y2="9" />
    </svg>
  ),
  snippets: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="5,3 2,10 5,17" />
      <polyline points="15,3 18,10 15,17" />
      <line x1="8" y1="7" x2="12" y2="13" />
    </svg>
  ),
  estimativas: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="2" y="2" width="16" height="16" rx="1.5" />
      <line x1="2" y1="7" x2="18" y2="7" />
      <line x1="7" y1="7" x2="7" y2="18" />
      <line x1="10" y1="11" x2="14" y2="11" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
    </svg>
  ),
  programs: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polyline points="6,4 2,10 6,16" />
      <polyline points="14,4 18,10 14,16" />
      <line x1="12" y1="4" x2="8" y2="16" />
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4l1.4-1.4M14 6l1.4-1.4" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M10 2L2 17h16L10 2z" />
      <line x1="10" y1="8" x2="10" y2="12" />
      <circle cx="10" cy="15" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <line x1="4" y1="10" x2="16" y2="10" />
      <polyline points="11,5 16,10 11,15" />
    </svg>
  )
}

// ─── Module definitions ────────────────────────────────────────────────────────

function buildModules(programs, sessions, specs, enabledProviders) {
  return [
    {
      id: 'abap',
      name: 'ABAP',
      icon: 'abap',
      desc: 'Gerador de objetos ABAP com IA',
      color: '#0070f2',
      path: '/dashboard/abap',
      badge: programs.length || null
    },
    {
      id: 'editor',
      name: 'Editor',
      icon: 'editor',
      desc: 'Edição incremental de programas ABAP',
      color: '#107e3e',
      path: '/dashboard/editor',
      badge: sessions.length || null
    },
    {
      id: 'specs',
      name: 'Especificações',
      icon: 'specs',
      desc: 'Criação de EFs funcionais com IA',
      color: '#107e3e',
      path: '/dashboard/specs',
      badge: specs.length || null
    },
    {
      id: 'historico',
      name: 'Histórico',
      icon: 'historico',
      desc: 'Programas ABAP gerados anteriormente',
      color: '#0070f2',
      path: '/dashboard/historico',
      badge: programs.length || null
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: 'performance',
      desc: 'Detecta anti-patterns e gargalos no código',
      color: '#c44a00',
      path: '/dashboard/performance',
      badge: null
    },
    {
      id: 'dtec',
      name: 'DTec',
      icon: 'dtec',
      desc: 'Gera documentação técnica a partir do código',
      color: '#354a5e',
      path: '/dashboard/dtec',
      badge: null
    },
    {
      id: 'enhancement',
      name: 'Enhancement',
      icon: 'enhancement',
      desc: 'Encontra BAdIs e User Exits para customizações',
      color: '#8b5cf6',
      path: '/dashboard/enhancement',
      badge: null
    },
    {
      id: 'snippets',
      name: 'Snippets',
      icon: 'snippets',
      desc: 'Biblioteca de snippets ABAP reutilizáveis',
      color: '#107e3e',
      path: '/dashboard/snippets',
      badge: null
    },
    {
      id: 'estimativas',
      name: 'Estimativas',
      icon: 'estimativas',
      desc: 'Gera cenários de estimativa de esforço com IA',
      color: '#0070f2',
      path: '/dashboard/estimativas',
      badge: null
    },
    {
      id: 'settings',
      name: 'Configurações',
      icon: 'settings',
      desc: 'IA, provedores, agentes e preferências',
      color: 'var(--sap-subtle)',
      path: '/dashboard/settings',
      badge: enabledProviders || null
    }
  ]
}

// ─── DashboardHome ─────────────────────────────────────────────────────────────

function DashboardHome() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { programs, loadPrograms } = useAbapStore()
  const { sessions, loadSessions } = useCodeReviewStore()
  const { specs, loadSpecs } = useEspecificacoesStore()
  const { providers, loadProviders } = useAiStore()
  const [appVersion, setAppVersion] = useState('')

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    loadPrograms()
    loadSessions()
    loadSpecs()
    loadProviders()
    window.api.getAppVersion().then(v => setAppVersion(v)).catch(() => {})
  }, [])

  const enabledProviders = Object.values(providers).filter((p) => p.enabled).length
  const hasProvider = enabledProviders > 0
  const MODULES = buildModules(programs, sessions, specs, enabledProviders)

  return (
    <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>

      {/* ── Welcome ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
        paddingBottom: 24, borderBottom: '1px solid var(--sap-border)'
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--sap-primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--sap-text)', margin: 0, lineHeight: 1.2 }}>
            Bem-vindo, {displayName}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sap-subtle)', margin: '3px 0 0' }}>
            Abapfy{appVersion ? ` v${appVersion}` : ''} — Ferramentas ABAP com IA
          </p>
        </div>
      </div>

      {/* ── Alert: no provider ── */}
      {!hasProvider && (
        <div
          onClick={() => navigate('/dashboard/settings/ai')}
          style={{
            marginBottom: 24, padding: '12px 16px', borderRadius: 8,
            background: 'rgba(233,115,12,0.08)', border: '1px solid rgba(233,115,12,0.3)',
            color: '#e9730c', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <span style={{ flexShrink: 0 }}>{Icons.warning}</span>
          <span>
            <strong>Nenhum provedor de IA configurado.</strong>{' '}
            Acesse{' '}
            <span style={{ textDecoration: 'underline' }}>Configurações → IA &amp; APIs</span>
            {' '}para adicionar uma API key.
          </span>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 14, marginBottom: 32
      }}>
        <StatusCard
          title="Programas ABAP"
          value={String(programs.length)}
          subtitle={programs.length === 0 ? 'Nenhum gerado ainda' : programs.length === 1 ? '1 programa' : `${programs.length} programas`}
          icon={Icons.programs}
          color="#0070f2"
        />
        <StatusCard
          title="Especificações"
          value={String(specs.length)}
          subtitle={specs.length === 0 ? 'Nenhuma criada ainda' : specs.length === 1 ? '1 EF criada' : `${specs.length} EFs criadas`}
          icon={Icons.specs}
          color="#107e3e"
        />
        <StatusCard
          title="Sessões Editor"
          value={String(sessions.length)}
          subtitle={sessions.length === 0 ? 'Nenhuma sessão' : sessions.length === 1 ? '1 sessão' : `${sessions.length} sessões`}
          icon={Icons.editor}
          color="#107e3e"
        />
        <StatusCard
          title="Provedores IA"
          value={hasProvider ? String(enabledProviders) : '—'}
          subtitle={hasProvider ? `${enabledProviders} ativo${enabledProviders > 1 ? 's' : ''}` : 'Nenhum configurado'}
          icon={Icons.ai}
          color={hasProvider ? '#0070f2' : '#e9730c'}
        />
      </div>

      {/* ── Modules ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.7, margin: '0 0 14px' }}>
          Módulos
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 10
        }}>
          {MODULES.map((mod) => (
            <ModuleCard key={mod.id} {...mod} onClick={() => navigate(mod.path)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── ModuleCard ────────────────────────────────────────────────────────────────

function ModuleCard({ name, icon, desc, color, badge, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'var(--sap-hover-bg)' : 'var(--sap-base)',
        border: `1px solid ${hover ? color : 'var(--sap-border)'}`,
        borderRadius: 8,
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hover ? `0 4px 16px ${color}22` : '0 1px 3px rgba(0,0,0,0.05)',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%'
      }}
    >
      {/* Icon + badge row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
          flexShrink: 0
        }}>
          {Icons[icon]}
        </div>
        {badge !== null && badge !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color,
            background: `${color}15`,
            borderRadius: 10,
            padding: '2px 8px',
            lineHeight: '18px'
          }}>
            {badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: hover ? color : 'var(--sap-text)',
          marginBottom: 3,
          transition: 'color 0.15s'
        }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--sap-subtle)', lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        color: hover ? color : 'var(--sap-subtle)',
        opacity: hover ? 1 : 0,
        transform: hover ? 'translateX(0)' : 'translateX(-4px)',
        transition: 'all 0.15s'
      }}>
        {Icons.arrow}
      </div>
    </button>
  )
}

// ─── DashboardView (layout shell) ─────────────────────────────────────────────

export default function DashboardView() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"72", Arial, Helvetica, sans-serif',
      background: 'var(--sap-bg)',
      overflow: 'hidden',
      borderRadius: 10
    }}>
      <ShellBar onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar collapsed={sidebarCollapsed} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="abap" element={<AbapView />} />
            <Route path="historico" element={<HistoricoView />} />
            <Route path="code-review" element={<CodeReviewView />} />
            <Route path="editor" element={<EditorView />} />
            <Route path="performance" element={<PerformanceView />} />
            <Route path="specs" element={<EspecificacoesView />} />
            <Route path="dtec" element={<DtecView />} />
            <Route path="enhancement" element={<EnhancementFinderView />} />
            <Route path="snippets" element={<SnippetLibraryView />} />
            <Route path="estimativas" element={<EstimativasView />} />
            <Route path="settings/*" element={<SettingsView />} />
            <Route path="updates" element={<AtualizacoesView />} />
            <Route path="about" element={<AboutView />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
