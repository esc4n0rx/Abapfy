import React, { useEffect, useState } from 'react'
import { useUpdateStore } from '../store/updateStore'

const REPO = 'esc4n0rx/Abapfy'

// ─── Formata bytes em MB ──────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return ''
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    uptodate:   { bg: '#e8f5e9', color: '#107e3e', border: '#c8e6c9', label: '✓ Atualizado' },
    available:  { bg: '#e8f2ff', color: '#0070f2', border: '#bee0fd', label: '⬆ Atualização disponível' },
    checking:   { bg: '#f5f6f7', color: '#6a6d70', border: '#d9d9d9', label: '⟳ Verificando...' },
    downloading:{ bg: '#fff8f0', color: '#e9730c', border: '#ffe0b2', label: '⬇ Baixando...' },
    ready:      { bg: '#e8f5e9', color: '#107e3e', border: '#c8e6c9', label: '✓ Pronta para instalar' },
    error:      { bg: '#fff0f0', color: '#bb0000', border: '#ffcccc', label: '✕ Erro' },
    dev:        { bg: '#f5f6f7', color: '#6a6d70', border: '#d9d9d9', label: '⚙ Modo desenvolvimento' },
  }
  const s = map[status] || map.uptodate
  return (
    <span style={{
      padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`
    }}>
      {s.label}
    </span>
  )
}

// ─── Barra de progresso ───────────────────────────────────────────────────────
function ProgressBar({ percent, bytesPerSecond, transferred, total }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--sap-subtle)', marginBottom: 6 }}>
        <span>{Math.round(percent)}%</span>
        <span>{fmtBytes(transferred)} / {fmtBytes(total)} · {fmtBytes(bytesPerSecond)}/s</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--sap-hover-bg)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: 'var(--sap-primary)',
          width: `${Math.min(percent, 100)}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  )
}

// ─── Card de release do GitHub ────────────────────────────────────────────────
function ReleaseCard({ release }) {
  if (!release) return null
  const assets = release.assets || []
  const exe = assets.find(a => a.name.endsWith('.exe'))

  return (
    <div style={{
      background: 'var(--sap-base)', border: '1px solid var(--sap-border)',
      borderRadius: 10, padding: '20px 24px', marginBottom: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)' }}>
            {release.name || release.tag_name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2 }}>
            Publicado em {fmtDate(release.published_at)}
            {exe && ` · ${fmtBytes(exe.size)}`}
          </div>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11,
          background: '#e8f2ff', color: '#0070f2', border: '1px solid #bee0fd', fontWeight: 600
        }}>
          {release.tag_name}
        </span>
      </div>

      {/* Release notes */}
      {release.body && (
        <div style={{
          fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.6,
          background: 'var(--sap-bg)', borderRadius: 6, padding: '12px 14px',
          border: '1px solid var(--sap-border)', whiteSpace: 'pre-wrap',
          maxHeight: 220, overflowY: 'auto'
        }}>
          {release.body}
        </div>
      )}
    </div>
  )
}

// ─── View principal ───────────────────────────────────────────────────────────
export default function AtualizacoesView() {
  const {
    checking, updateAvailable, updateInfo,
    downloading, progress, downloaded, error,
    latestRelease, loadingRelease,
    setChecking, setUpdateAvailable, setUpdateNotAvailable,
    setDownloading, setProgress, setDownloaded, setError,
    setLatestRelease, setLoadingRelease
  } = useUpdateStore()

  const [appVersion, setAppVersion] = useState('...')
  const [progressDetail, setProgressDetail] = useState({})
  const [isDev, setIsDev] = useState(false)
  const [installing, setInstalling] = useState(false)

  // ─── Carrega versão do app e release do GitHub ─────────────────────────────
  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)
    fetchLatestRelease()
    setupListeners()
    return () => window.api.removeUpdateListeners()
  }, [])

  async function fetchLatestRelease() {
    setLoadingRelease(true)
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLatestRelease(data)
    } catch {
      setLoadingRelease(false)
    }
  }

  function setupListeners() {
    window.api.onUpdateChecking(() => setChecking())
    window.api.onUpdateAvailable((info) => setUpdateAvailable(info))
    window.api.onUpdateNotAvailable(() => setUpdateNotAvailable())
    window.api.onUpdateProgress((p) => { setProgress(p); setProgressDetail(p) })
    window.api.onUpdateDownloaded((info) => setDownloaded(info))
    window.api.onUpdateError(({ message }) => setError(message))
  }

  async function handleCheck() {
    setChecking()
    const res = await window.api.checkForUpdate()
    if (res?.dev) {
      setIsDev(true)
      setUpdateNotAvailable()
    } else if (!res?.success && res?.error) {
      setError(res.error)
    }
  }

  async function handleDownload() {
    setDownloading()
    const res = await window.api.downloadUpdate()
    if (!res?.success && res?.error) setError(res.error)
  }

  function handleInstall() {
    setInstalling(true)
    window.api.installUpdate()
  }

  // ─── Determina status atual ────────────────────────────────────────────────
  function getStatus() {
    if (isDev)        return 'dev'
    if (installing)   return 'ready'
    if (downloaded)   return 'ready'
    if (downloading)  return 'downloading'
    if (checking)     return 'checking'
    if (error)        return 'error'
    if (updateAvailable) return 'available'
    return 'uptodate'
  }

  const status = getStatus()

  // ─── Compara versões ───────────────────────────────────────────────────────
  const latestTag = latestRelease?.tag_name?.replace('v', '') || null
  const isOutdated = latestTag && appVersion !== '...' && latestTag !== appVersion

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--sap-bg)', padding: 28 }}>
      <div style={{ maxWidth: 680 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--sap-text)', margin: 0 }}>
            Atualizações
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sap-subtle)', margin: '4px 0 0' }}>
            Verifique e instale novas versões do Abapfy
          </p>
        </div>

        {/* Versão atual */}
        <div style={{
          background: 'var(--sap-base)', border: '1px solid var(--sap-border)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 20
        }}>
          {/* Logo */}
          <div style={{
            width: 52, height: 52, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #0070f2 0%, #354a5e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff'
          }}>
            AF
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)' }}>Abapfy</span>
              <span style={{
                padding: '2px 8px', borderRadius: 12, fontSize: 12,
                background: 'var(--sap-hover-bg)', color: 'var(--sap-subtle)',
                border: '1px solid var(--sap-border)', fontWeight: 500
              }}>
                v{appVersion} instalada
              </span>
              {latestTag && (
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                  background: isOutdated ? '#e8f2ff' : '#e8f5e9',
                  color: isOutdated ? '#0070f2' : '#107e3e',
                  border: `1px solid ${isOutdated ? '#bee0fd' : '#c8e6c9'}`
                }}>
                  {isOutdated ? `v${latestTag} disponível` : 'Versão mais recente'}
                </span>
              )}
            </div>
            <div style={{ marginTop: 6 }}>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {/* Verificar */}
            {!downloading && !downloaded && !installing && (
              <button
                onClick={handleCheck}
                disabled={checking}
                style={{
                  background: checking ? 'var(--sap-hover-bg)' : 'var(--sap-base)',
                  color: 'var(--sap-text)', border: '1px solid var(--sap-border)',
                  borderRadius: 6, padding: '7px 16px', fontSize: 13,
                  fontWeight: 500, cursor: checking ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'inline-block', animation: checking ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
                {checking ? 'Verificando...' : 'Verificar'}
              </button>
            )}

            {/* Baixar */}
            {updateAvailable && !downloading && !downloaded && (
              <button
                onClick={handleDownload}
                style={{
                  background: 'var(--sap-primary)', color: '#fff',
                  border: 'none', borderRadius: 6, padding: '7px 16px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                }}
              >
                ⬇ Baixar v{updateInfo?.version}
              </button>
            )}

            {/* Instalar */}
            {downloaded && (
              <button
                onClick={handleInstall}
                disabled={installing}
                style={{
                  background: '#107e3e', color: '#fff',
                  border: 'none', borderRadius: 6, padding: '7px 16px',
                  fontSize: 13, fontWeight: 600, cursor: installing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                }}
              >
                {installing ? '⟳ Instalando...' : '↺ Reiniciar e instalar'}
              </button>
            )}
          </div>
        </div>

        {/* Barra de progresso do download */}
        {downloading && (
          <div style={{
            background: 'var(--sap-base)', border: '1px solid var(--sap-border)',
            borderRadius: 10, padding: '16px 20px', marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sap-text)', marginBottom: 8 }}>
              Baixando Abapfy v{updateInfo?.version}...
            </div>
            <ProgressBar
              percent={progressDetail.percent || 0}
              bytesPerSecond={progressDetail.bytesPerSecond}
              transferred={progressDetail.transferred}
              total={progressDetail.total}
            />
          </div>
        )}

        {/* Update baixado — pronto para instalar */}
        {downloaded && !installing && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 8,
            background: '#e8f5e9', border: '1px solid #c8e6c9',
            color: '#107e3e', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span>
              <strong>v{updateInfo?.version} baixada com sucesso!</strong>{' '}
              Clique em "Reiniciar e instalar" para aplicar a atualização.
            </span>
          </div>
        )}

        {/* Modo dev */}
        {isDev && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: 'var(--sap-hover-bg)', border: '1px solid var(--sap-border)',
            color: 'var(--sap-subtle)', fontSize: 13
          }}>
            ⚙ Auto-update desativado em modo desenvolvimento. As releases abaixo são carregadas via GitHub API.
          </div>
        )}

        {/* Erro */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: '#fff0f0', border: '1px solid #ffcccc',
            color: '#bb0000', fontSize: 13
          }}>
            {error}
          </div>
        )}

        {/* Última release do GitHub */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
              Última Release
            </h2>
            <button
              onClick={() => window.open(`https://github.com/${REPO}/releases`)}
              style={{ fontSize: 12, color: 'var(--sap-primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Ver todas →
            </button>
          </div>

          {loadingRelease ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--sap-subtle)', fontSize: 13 }}>
              Carregando release...
            </div>
          ) : (
            <ReleaseCard release={latestRelease} />
          )}
        </div>

        {/* Link para releases */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button
            onClick={() => window.open(`https://github.com/${REPO}/releases`)}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--sap-primary)', fontSize: 13, cursor: 'pointer',
              textDecoration: 'underline', padding: 0
            }}
          >
            Ver histórico completo de releases no GitHub
          </button>
        </div>

      </div>
    </div>
  )
}
