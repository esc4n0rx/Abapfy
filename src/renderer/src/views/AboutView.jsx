import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import logoSrc from '../assets/logo.png'

const REPO = 'esc4n0rx/Abapfy'

const STACK = [
  { name: 'Electron',        version: '28',   color: '#47848F', desc: 'Runtime desktop multiplataforma' },
  { name: 'React',           version: '18',   color: '#61DAFB', desc: 'Interface de usuário' },
  { name: 'Vite',            version: '5',    color: '#646CFF', desc: 'Build tool e dev server' },
  { name: 'Supabase',        version: 'v2',   color: '#3ECF8E', desc: 'Backend, Auth e banco de dados' },
  { name: 'Zustand',         version: '4',    color: '#443E74', desc: 'Gerenciamento de estado' },
  { name: 'React Router',    version: '6',    color: '#CA4245', desc: 'Roteamento SPA' },
  { name: 'PizZip',          version: '3',    color: '#F5A623', desc: 'Manipulação de arquivos DOCX' },
  { name: 'React Markdown',  version: '10',   color: '#0070f2', desc: 'Renderização de markdown' }
]

const MODULES = [
  {
    name: 'Gerador ABAP',
    icon: '◈',
    desc: 'Geração de objetos ABAP com IA: REPORTs, Function Modules, Classes, Enhancements e programas.',
    statusLabel: 'Disponível'
  },
  {
    name: 'Code Review',
    icon: '🔍',
    desc: 'Análise estática e revisão de código ABAP com IA. Detecção de bugs, performance, segurança e boas práticas.',
    statusLabel: 'Disponível'
  },
  {
    name: 'Especificações Funcionais',
    icon: '📋',
    desc: 'Criação de EFs completas com IA a partir de descrições informais. Gera documento Word profissional automaticamente.',
    statusLabel: 'Disponível'
  },
  {
    name: 'Multi-provider IA',
    icon: '✦',
    desc: 'Suporte a Claude, Gemini, OpenAI e Groq via API, além de integrações CLI com Claude Code e Codex.',
    statusLabel: 'Disponível'
  }
]

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Estilos do markdown injetados via componentes do ReactMarkdown
const mdComponents = {
  p:    ({ children }) => <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.6 }}>{children}</p>,
  ul:   ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ul>,
  ol:   ({ children }) => <ol style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ol>,
  li:   ({ children }) => <li style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.6, marginBottom: 2 }}>{children}</li>,
  h1:   ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text)', margin: '10px 0 4px' }}>{children}</h3>,
  h2:   ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sap-text)', margin: '10px 0 4px' }}>{children}</h3>,
  h3:   ({ children }) => <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--sap-subtle)', margin: '8px 0 4px' }}>{children}</h4>,
  a:    ({ children, href }) => (
    <button
      onClick={() => window.open(href)}
      style={{ background: 'none', border: 'none', color: 'var(--sap-primary)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
    >
      {children}
    </button>
  ),
  code: ({ children }) => (
    <code style={{ fontSize: 12, background: 'var(--sap-hover-bg)', padding: '1px 5px', borderRadius: 4, color: 'var(--sap-text)' }}>
      {children}
    </code>
  ),
}

export default function AboutView() {
  const [appVersion, setAppVersion] = useState('...')
  const [releases, setReleases] = useState([])
  const [loadingReleases, setLoadingReleases] = useState(true)

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)

    fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setReleases(Array.isArray(data) ? data : [])
        setLoadingReleases(false)
      })
      .catch(() => setLoadingReleases(false))
  }, [])

  const currentTag = appVersion !== '...' ? appVersion : null

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      background: 'var(--sap-bg)',
      color: 'var(--sap-text)',
      padding: 32
    }}>
      {/* Hero */}
      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        padding: '32px 36px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 28
      }}>
        <img
          src={logoSrc}
          alt="Abapfy"
          style={{
            width: 72, height: 72, borderRadius: 16, flexShrink: 0,
            objectFit: 'contain',
            boxShadow: '0 4px 20px rgba(0,112,242,0.2)'
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--sap-text)' }}>
              Abapfy
            </h1>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 12,
              background: '#e8f5e9', color: '#107e3e',
              border: '1px solid #c8e6c9', fontWeight: 600
            }}>
              v{appVersion}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--sap-subtle)', marginBottom: 10 }}>
            Um conjunto de ferramentas para a área SAP
          </div>
          <p style={{ fontSize: 14, color: 'var(--sap-text)', lineHeight: 1.6, maxWidth: 580, margin: 0 }}>
            Ferramentas integradas para consultores e desenvolvedores SAP: geração de código ABAP,
            revisão automatizada com IA, criação de especificações funcionais com geração de documento
            Word, e suporte a múltiplos provedores de IA — tudo em uma interface no estilo SAP Fiori.
          </p>
        </div>
      </div>

      {/* Módulos */}
      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 20
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 16px' }}>
          Módulos Disponíveis
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MODULES.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--sap-text)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--sap-subtle)', marginTop: 2, lineHeight: 1.5 }}>{m.desc}</div>
              </div>
              <div style={{
                flexShrink: 0, padding: '3px 10px', borderRadius: 20, fontSize: 11,
                background: '#e8f5e9', color: '#107e3e',
                border: '1px solid #c8e6c9', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#107e3e', display: 'inline-block' }} />
                {m.statusLabel}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Changelog dinâmico */}
      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
            Changelog
          </h2>
          <button
            onClick={() => window.open(`https://github.com/${REPO}/releases`)}
            style={{ fontSize: 12, color: 'var(--sap-primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Ver no GitHub →
          </button>
        </div>

        {loadingReleases ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--sap-subtle)', fontSize: 13 }}>
            Carregando releases...
          </div>
        ) : releases.length === 0 ? (
          <div style={{ color: 'var(--sap-subtle)', fontSize: 13 }}>
            Nenhuma release encontrada no GitHub.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {releases.map((release, idx) => {
              const tag = release.tag_name?.replace('v', '')
              const isCurrent = currentTag && tag === currentTag

              return (
                <div key={release.id} style={{
                  paddingBottom: idx < releases.length - 1 ? 24 : 0,
                  borderBottom: idx < releases.length - 1 ? '1px solid var(--sap-border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--sap-text)' }}>
                      {release.name || release.tag_name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>
                      {fmtDate(release.published_at)}
                    </span>
                    {isCurrent && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11,
                        background: '#e8f2ff', color: '#0070f2',
                        border: '1px solid #bee0fd', fontWeight: 500
                      }}>
                        instalada
                      </span>
                    )}
                    {idx === 0 && !isCurrent && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11,
                        background: '#e8f5e9', color: '#107e3e',
                        border: '1px solid #c8e6c9', fontWeight: 500
                      }}>
                        mais recente
                      </span>
                    )}
                  </div>

                  {release.body ? (
                    <div style={{ paddingLeft: 2 }}>
                      <ReactMarkdown components={mdComponents}>
                        {release.body}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--sap-subtle)', fontStyle: 'italic' }}>
                      Sem notas de release.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stack tecnológico */}
      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 20
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 16px' }}>
          Stack Tecnológico
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10
        }}>
          {STACK.map((s) => (
            <div key={s.name} style={{
              padding: '12px 14px',
              background: 'var(--sap-bg)',
              borderRadius: 8,
              border: '1px solid var(--sap-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--sap-text)' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: 'var(--sap-subtle)', marginLeft: 'auto' }}>v{s.version}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--sap-subtle)', paddingLeft: 16 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '16px 0',
        fontSize: 12, color: 'var(--sap-subtle)'
      }}>
        Abapfy v{appVersion} · Construído com ❤ para a comunidade SAP
      </div>
    </div>
  )
}
