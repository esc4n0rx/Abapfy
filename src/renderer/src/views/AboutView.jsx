import React from 'react'
import logoSrc from '../assets/logo.png'

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
    status: 'active',
    statusLabel: 'Disponível'
  },
  {
    name: 'Code Review',
    icon: '🔍',
    desc: 'Análise estática e revisão de código ABAP com IA. Detecção de bugs, performance, segurança e boas práticas.',
    status: 'active',
    statusLabel: 'Disponível'
  },
  {
    name: 'Especificações Funcionais',
    icon: '📋',
    desc: 'Criação de EFs completas com IA a partir de descrições informais. Gera documento Word profissional automaticamente.',
    status: 'active',
    statusLabel: 'Disponível'
  },
  {
    name: 'Multi-provider IA',
    icon: '✦',
    desc: 'Suporte a Claude, Gemini, OpenAI e Groq via API, além de integrações CLI com Claude Code e Codex.',
    status: 'active',
    statusLabel: 'Disponível'
  }
]

const CHANGELOG = [
  {
    version: '1.0.1',
    date: 'Mar 2026',
    current: true,
    changes: [
      'Módulo Especificações Funcionais com geração de DOCX via IA',
      'Dashboard atualizado com dados reais dos módulos',
      'Alerta de configuração de IA no painel inicial',
      'Cards de módulo clicáveis com contadores reais',
      'Suporte ao template MODELO BASE EF.docx'
    ]
  },
  {
    version: '1.0.0',
    date: 'Mar 2026',
    current: false,
    changes: [
      'Gerador ABAP com suporte a REPORT, FUNC, CLAS, ENHO e PROG',
      'Code Review com chat interativo e análise detalhada',
      'Suporte a múltiplos provedores de IA (Claude, Gemini, OpenAI, Groq)',
      'Integração com Claude Code CLI e Codex CLI',
      'Autenticação via Supabase',
      'Tema claro e escuro com sistema SAP Fiori'
    ]
  }
]

export default function AboutView() {
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
              v1.0.1
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

      {/* Modules */}
      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 20
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, margin: '0 0 16px' }}>
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

      {/* Changelog */}
      <div style={{
        background: 'var(--sap-base)',
        border: '1px solid var(--sap-border)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 20
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--sap-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 16px' }}>
          Changelog
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {CHANGELOG.map((release) => (
            <div key={release.version}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--sap-text)' }}>
                  v{release.version}
                </span>
                <span style={{ fontSize: 12, color: 'var(--sap-subtle)' }}>{release.date}</span>
                {release.current && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 11,
                    background: '#e8f2ff', color: '#0070f2',
                    border: '1px solid #bee0fd', fontWeight: 500
                  }}>
                    atual
                  </span>
                )}
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {release.changes.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--sap-text)', lineHeight: 1.5 }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
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
        Abapfy · Construído com ❤ para a comunidade SAP · v1.0.1
      </div>
    </div>
  )
}
