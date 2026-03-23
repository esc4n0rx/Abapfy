import React, { useState, useEffect, useMemo } from 'react'
import { useAbapStore } from '../store/abapStore'
import AbapHighlight from '../components/AbapHighlight'

const TYPE_COLORS = {
  REPORT: '#0070f2', FUNC: '#107e3e', CLAS: '#8b5cf6',
  ENHO: '#e9730c', PROG: '#6a6d70'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || '#6a6d70'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: '#fff', background: color,
      padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', flexShrink: 0
    }}>{type}</span>
  )
}

// ─── File card inside detail panel ──────────────────────────────────────────
function DetailFileCard({ file }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(file.content || '')
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div style={{ border: '1px solid var(--sap-border)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{
        padding: '7px 12px', background: 'var(--sap-bg)',
        borderBottom: '1px solid var(--sap-border)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <TypeBadge type={file.type || 'ABAP'} />
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'var(--sap-text)', flex: 1 }}>
          {file.name}
        </span>
        {file.description && (
          <span style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>— {file.description}</span>
        )}
        <button onClick={copy} style={{
          fontSize: 11, color: copied ? '#107e3e' : 'var(--sap-primary)',
          background: 'transparent',
          border: '1px solid ' + (copied ? '#107e3e' : 'var(--sap-primary)'),
          borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
        }}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <AbapHighlight code={file.content || ''} maxHeight={300} />
    </div>
  )
}

// ─── Detail panel ────────────────────────────────────────────────────────────
function ProgramDetail({ program, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const result = program.result || {}
  const files = result.files || []

  const copyAll = () => {
    const text = files.map(f => `* === ${f.type}: ${f.name} ===\n${f.content}`).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1800)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TypeBadge type={program.type} />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--sap-text)', fontFamily: 'monospace' }}>
              {program.name}
            </span>
          </div>
          {program.description && (
            <div style={{ fontSize: 13, color: 'var(--sap-subtle)', marginBottom: 4 }}>{program.description}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)' }}>{formatDate(program.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={copyAll} style={{
            fontSize: 12, color: copiedAll ? '#107e3e' : 'var(--sap-primary)',
            background: 'transparent',
            border: '1px solid ' + (copiedAll ? '#107e3e' : 'var(--sap-primary)'),
            borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            {copiedAll ? 'Copiado!' : 'Copiar tudo'}
          </button>
          <button onClick={() => setConfirmDel(true)} style={{
            fontSize: 12, color: confirmDel ? '#fff' : '#bb0000',
            background: confirmDel ? '#bb0000' : 'transparent',
            border: '1px solid #bb0000',
            borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit'
          }} onBlur={() => setConfirmDel(false)}>
            {confirmDel ? 'Confirmar' : 'Excluir'}
          </button>
          {confirmDel && (
            <button onClick={() => { setConfirmDel(false) }} style={{
              fontSize: 12, color: 'var(--sap-subtle)', background: 'transparent',
              border: '1px solid var(--sap-border)', borderRadius: 4,
              padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDel && (
        <div style={{
          padding: '10px 14px', marginBottom: 16, borderRadius: 6,
          background: '#fff5f5', border: '1px solid #ffd7d7',
          fontSize: 13, color: '#bb0000', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span>Excluir <strong>{program.name}</strong> permanentemente?</span>
          <button onClick={() => onDelete(program.id)} style={{
            marginLeft: 'auto', fontSize: 12, color: '#fff', background: '#bb0000',
            border: 'none', borderRadius: 4, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit'
          }}>Excluir</button>
          <button onClick={() => setConfirmDel(false)} style={{
            fontSize: 12, color: 'var(--sap-subtle)', background: 'transparent',
            border: '1px solid var(--sap-border)', borderRadius: 4,
            padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit'
          }}>Cancelar</button>
        </div>
      )}

      {/* Analysis */}
      {result.analysis && (
        <div style={{
          padding: '10px 14px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 6,
          fontSize: 13, color: 'var(--sap-text)', marginBottom: 16
        }}>
          <strong>Análise:</strong> {result.analysis}
        </div>
      )}

      {/* Files */}
      {files.length === 0
        ? <div style={{ fontSize: 13, color: 'var(--sap-subtle)' }}>Nenhum arquivo encontrado nesta geração.</div>
        : files.map((f, i) => <DetailFileCard key={i} file={f} />)
      }

      {/* Notes */}
      {result.notes && (
        <div style={{
          padding: '10px 14px', background: 'var(--sap-bg)',
          border: '1px solid var(--sap-border)', borderRadius: 6,
          fontSize: 12, color: 'var(--sap-subtle)', marginTop: 4
        }}>
          <strong>Observações:</strong> {result.notes}
        </div>
      )}
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────────────────────────
export default function HistoricoView() {
  const { programs, loadPrograms, deleteProgram } = useAbapStore()
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => { loadPrograms() }, [])

  useEffect(() => {
    if (programs.length > 0 && !selected) setSelected(programs[0])
  }, [programs])

  const filtered = useMemo(() => {
    return programs.filter(p => {
      const matchType = typeFilter === 'ALL' || p.type === typeFilter
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [programs, search, typeFilter])

  const handleDelete = async (id) => {
    await deleteProgram(id)
    setSelected(filtered.find(p => p.id !== id) || null)
  }

  const TYPES = ['ALL', 'REPORT', 'FUNC', 'CLAS', 'ENHO', 'PROG']

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--sap-base)'
      }}>
        {/* Search */}
        <div style={{ padding: '14px 14px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sap-text)', marginBottom: 10 }}>
            Histórico de Gerações
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar programa..."
            style={{
              width: '100%', padding: '6px 10px', fontSize: 13,
              border: '1px solid var(--sap-border)', borderRadius: 6,
              background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
              outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
            }}
          />
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8, marginBottom: 10 }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3,
                border: '1px solid ' + (typeFilter === t ? (TYPE_COLORS[t] || 'var(--sap-primary)') : 'var(--sap-border)'),
                background: typeFilter === t ? (TYPE_COLORS[t] || 'var(--sap-primary)') : 'transparent',
                color: typeFilter === t ? '#fff' : 'var(--sap-subtle)',
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase'
              }}>{t === 'ALL' ? 'Todos' : t}</button>
            ))}
          </div>
        </div>

        {/* Program list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px 8px', fontSize: 13, color: 'var(--sap-subtle)', textAlign: 'center' }}>
              {programs.length === 0 ? 'Nenhum programa gerado ainda.' : 'Nenhum resultado.'}
            </div>
          ) : filtered.map(p => {
            const isActive = selected?.id === p.id
            return (
              <div key={p.id} onClick={() => setSelected(p)} style={{
                padding: '10px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                background: isActive ? 'var(--sap-active-bg)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--sap-primary)' : 'transparent'}`,
                transition: 'all 0.15s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <TypeBadge type={p.type} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--sap-text)',
                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{p.name}</span>
                </div>
                {p.description && (
                  <div style={{
                    fontSize: 11, color: 'var(--sap-subtle)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{p.description}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--sap-subtle)', marginTop: 2 }}>
                  {formatDate(p.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--sap-bg)' }}>
        {selected
          ? <ProgramDetail program={selected} onDelete={handleDelete} />
          : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: 'var(--sap-subtle)'
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
              <div style={{ fontSize: 14 }}>Selecione um programa para ver os detalhes</div>
            </div>
          )
        }
      </div>
    </div>
  )
}
