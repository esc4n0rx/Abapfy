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
import EspecificacoesView from './EspecificacoesView'
import AtualizacoesView from './AtualizacoesView'
import HistoricoView from './HistoricoView'
import SnippetLibraryView from './SnippetLibraryView'
import DtecView from './DtecView'
import EnhancementFinderView from './EnhancementFinderView'
import PerformanceView from './PerformanceView'
import EstimativasView from './EstimativasView'

function DashboardHome() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { programs, loadPrograms } = useAbapStore()
  const { sessions, loadSessions } = useCodeReviewStore()
  const { specs, loadSpecs } = useEspecificacoesStore()
  const { providers, loadProviders } = useAiStore()
  const [appVersion, setAppVersion] = useState('')

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'

  useEffect(() => {
    loadPrograms()
    loadSessions()
    loadSpecs()
    loadProviders()
    window.api.getAppVersion().then(v => setAppVersion(v)).catch(() => {})
  }, [])

  const enabledProviders = Object.values(providers).filter((p) => p.enabled).length
  const hasProvider = enabledProviders > 0

  const MODULES = [
    {
      name: 'ABAP',
      icon: '◈',
      desc: 'Gerador de objetos ABAP com IA',
      color: '#0070f2',
      path: '/dashboard/abap',
      count: programs.length,
      countLabel: programs.length === 1 ? 'programa gerado' : 'programas gerados',
      active: true
    },
    {
      name: 'Code Review',
      icon: '🔍',
      desc: 'Revisão de código ABAP com IA',
      color: '#107e3e',
      path: '/dashboard/code-review',
      count: sessions.length,
      countLabel: sessions.length === 1 ? 'sessão' : 'sessões',
      active: true
    },
    {
      name: 'Especificações',
      icon: '📋',
      desc: 'Criação de EFs funcionais com IA',
      color: '#107e3e',
      path: '/dashboard/specs',
      count: specs.length,
      countLabel: specs.length === 1 ? 'especificação' : 'especificações',
      active: true
    },
    {
      name: 'Configurações',
      icon: '⚙',
      desc: 'IA, provedores e preferências',
      color: 'var(--sap-subtle)',
      path: '/dashboard/settings',
      count: enabledProviders,
      countLabel: enabledProviders === 1 ? 'provedor ativo' : 'provedores ativos',
      active: true
    },
    {
      name: 'Histórico',
      icon: '🗂',
      desc: 'Programas ABAP gerados anteriormente',
      color: '#0070f2',
      path: '/dashboard/historico',
      count: programs.length,
      countLabel: programs.length === 1 ? 'geração' : 'gerações',
      active: true
    },
    {
      name: 'Performance',
      icon: '⚡',
      desc: 'Analisa anti-patterns e gargalos no código',
      color: '#c44a00',
      path: '/dashboard/performance',
      count: 0,
      countLabel: '',
      active: true
    },
    {
      name: 'DTec',
      icon: '📄',
      desc: 'Gera documentação técnica a partir do código',
      color: '#354a5e',
      path: '/dashboard/dtec',
      count: 0,
      countLabel: '',
      active: true
    },
    {
      name: 'Enhancement Finder',
      icon: '🔎',
      desc: 'Encontra BAdIs e User Exits para sua customização',
      color: '#8b5cf6',
      path: '/dashboard/enhancement',
      count: 0,
      countLabel: '',
      active: true
    },
    {
      name: 'Snippets',
      icon: '✂',
      desc: 'Biblioteca de snippets ABAP reutilizáveis',
      color: '#107e3e',
      path: '/dashboard/snippets',
      count: 0,
      countLabel: '',
      active: true
    },
    {
      name: 'Estimativas',
      icon: '📊',
      desc: 'Gera 3 cenários de estimativa de esforço com IA',
      color: '#0070f2',
      path: '/dashboard/estimativas',
      count: 0,
      countLabel: '',
      active: true
    }
  ]

  return (
    <div style={{ padding: 32, flex: 1, overflowY: 'auto' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--sap-text)', margin: 0 }}>
          Bem-vindo, {displayName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--sap-subtle)', margin: '4px 0 0' }}>
          Painel de controle — Abapfy{appVersion ? ` v${appVersion}` : ''}
        </p>
      </div>

      {/* Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        <StatusCard
          title="Programas ABAP"
          value={String(programs.length)}
          subtitle={programs.length === 0 ? 'Nenhum gerado ainda' : programs.length === 1 ? '1 programa gerado' : `${programs.length} programas gerados`}
          icon="◈"
          color="#0070f2"
        />
        <StatusCard
          title="Especificações"
          value={String(specs.length)}
          subtitle={specs.length === 0 ? 'Nenhuma criada ainda' : specs.length === 1 ? '1 EF criada' : `${specs.length} EFs criadas`}
          icon="📋"
          color="#107e3e"
        />
        <StatusCard
          title="Code Reviews"
          value={String(sessions.length)}
          subtitle={sessions.length === 0 ? 'Nenhuma sessão' : sessions.length === 1 ? '1 sessão' : `${sessions.length} sessões`}
          icon="🔍"
          color="#107e3e"
        />
        <StatusCard
          title="IA"
          value={hasProvider ? 'Ativa' : 'Config'}
          subtitle={hasProvider ? `${enabledProviders} provedor${enabledProviders > 1 ? 'es' : ''} ativo${enabledProviders > 1 ? 's' : ''}` : 'Configure um provedor de IA'}
          icon="✦"
          color={hasProvider ? '#107e3e' : '#e9730c'}
        />
      </div>

      {/* Alert: no provider configured */}
      {!hasProvider && (
        <div
          onClick={() => navigate('/dashboard/settings/ai')}
          style={{
            marginBottom: 24, padding: '12px 16px', borderRadius: 8,
            background: '#fff8f0', border: '1px solid #ffe0b2',
            color: '#e9730c', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <span style={{ fontSize: 18 }}>⚠</span>
          <span>
            <strong>Nenhum provedor de IA configurado.</strong>{' '}
            Configure uma API key ou integração CLI nas{' '}
            <span style={{ textDecoration: 'underline' }}>Configurações → IA &amp; APIs</span> para usar os módulos.
          </span>
        </div>
      )}

      {/* Modules Grid */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--sap-text)', margin: '0 0 16px' }}>
          Módulos
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12
        }}>
          {MODULES.map((mod) => (
            <ModuleCard key={mod.name} {...mod} onClick={() => navigate(mod.path)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ name, icon, desc, color, count, countLabel, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--sap-base)',
        border: `1px solid ${hover ? color : 'var(--sap-border)'}`,
        borderRadius: 8,
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: hover ? `0 4px 16px ${color}22` : '0 1px 4px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sap-text)', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginBottom: 10 }}>{desc}</div>
      <div style={{
        fontSize: 11, fontWeight: 500, color,
        display: 'flex', alignItems: 'center', gap: 5
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
        {count > 0 ? `${count} ${countLabel}` : 'Disponível'}
      </div>
    </div>
  )
}

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
