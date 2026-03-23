import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAiStore } from '../store/aiStore'
import { getActiveProvider } from '../lib/aiClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SYSTEM_PROMPT = `Você é um especialista ABAP/SAP assistindo um desenvolvedor em um projeto.
Você tem acesso ao contexto dos arquivos do projeto fornecidos pelo usuário.
Responda de forma técnica e precisa. Use markdown para formatar o código ABAP com \`\`\`abap.
Quando sugerir código, forneça exemplos completos e funcionais.`

function buildSystemWithFiles(files) {
  if (!files.length) return SYSTEM_PROMPT
  const filesContext = files.map(f =>
    `### Arquivo: ${f.name}\n\`\`\`abap\n${f.content.slice(0, 8000)}\n\`\`\``
  ).join('\n\n')
  return `${SYSTEM_PROMPT}\n\n---\n## Arquivos do Projeto\n\n${filesContext}`
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14, gap: 10, alignItems: 'flex-start'
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--sap-primary)',
          color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2
        }}>✦</div>
      )}
      <div style={{
        maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: isUser ? 'var(--sap-primary)' : 'var(--sap-base)',
        color: isUser ? '#fff' : 'var(--sap-text)',
        border: isUser ? 'none' : '1px solid var(--sap-border)',
        fontSize: 13, lineHeight: 1.6
      }}>
        {isUser
          ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          : <div className="md-body" style={{ color: 'var(--sap-text)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
        }
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--sap-subtle)',
          color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2
        }}>U</div>
      )}
    </div>
  )
}

// ─── File chip ────────────────────────────────────────────────────────────────
function FileChip({ file, onRemove }) {
  const lines = file.content.split('\n').length
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      background: 'var(--sap-active-bg)', border: '1px solid var(--sap-primary)',
      borderRadius: 20, fontSize: 12, color: 'var(--sap-primary)', flexShrink: 0
    }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{file.name}</span>
      <span style={{ color: 'var(--sap-subtle)', fontSize: 10 }}>{lines}L</span>
      <button onClick={() => onRemove(file.name)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sap-subtle)',
        fontSize: 14, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center'
      }}>×</button>
    </div>
  )
}

export default function ChatProjetoView() {
  const { providers } = useAiStore()
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const listenerRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // Cleanup streaming listeners on unmount
  useEffect(() => {
    return () => { if (listenerRef.current) listenerRef.current() }
  }, [])

  function handleAddFiles(e) {
    const newFiles = Array.from(e.target.files || [])
    newFiles.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => {
        setFiles(prev => {
          if (prev.find(x => x.name === f.name)) return prev
          return [...prev, { name: f.name, content: ev.target.result }]
        })
      }
      reader.readAsText(f)
    })
    e.target.value = ''
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    const provider = getActiveProvider(providers)
    if (!provider) { setError('Nenhum provedor de IA configurado.'); return }

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setError('')
    setStreaming(true)
    setStreamText('')

    const systemPrompt = buildSystemWithFiles(files)
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

    // For CLI integrations, use non-streaming
    if (provider.isIntegration) {
      try {
        const userMessage = `${text}\n\n` +
          (files.length ? `Contexto dos arquivos já fornecido no sistema.` : '')
        const res = await window.api.generateIntegration({
          integrationType: provider.integrationType,
          systemPrompt,
          userMessage,
          programName: 'CHAT_PROJETO'
        })
        if (!res.success) throw new Error(res.error)
        setMessages(prev => [...prev, { role: 'assistant', content: res.content }])
      } catch (e) {
        setError(e.message)
      } finally {
        setStreaming(false); setStreamText('')
      }
      return
    }

    // Streaming for API providers
    let accumulated = ''

    window.api.removeStreamListeners?.()

    window.api.onStreamChunk?.(({ text: chunk }) => { accumulated += chunk; setStreamText(accumulated) })
    window.api.onStreamDone?.(({ fullText }) => {
      window.api.removeStreamListeners?.()
      setMessages(prev => [...prev, { role: 'assistant', content: fullText || accumulated }])
      setStreaming(false); setStreamText('')
    })
    window.api.onStreamError?.(({ error: msg }) => {
      window.api.removeStreamListeners?.()
      setError(msg)
      setStreaming(false); setStreamText('')
    })

    listenerRef.current = () => window.api.removeStreamListeners?.()

    window.api.streamStart?.({
      provider: provider.provider,
      apiKey: provider.apiKey,
      model: provider.model,
      systemPrompt,
      messages: apiMessages
    })
  }, [input, messages, files, providers, streaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const hasMessages = messages.length > 0 || streaming

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--sap-bg)' }}>
      {/* Left: files panel */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--sap-border)',
        display: 'flex', flexDirection: 'column', background: 'var(--sap-base)'
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--sap-border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sap-text)', marginBottom: 4 }}>💬 Chat de Projeto</div>
          <div style={{ fontSize: 11, color: 'var(--sap-subtle)', lineHeight: 1.5 }}>
            Adicione arquivos ABAP como contexto. A IA lê todos os arquivos para responder suas perguntas.
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--sap-border)' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', padding: '8px', background: 'transparent',
              border: '1.5px dashed var(--sap-border)', borderRadius: 6,
              color: 'var(--sap-primary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
            + Adicionar arquivos .abap
          </button>
          <input
            ref={fileInputRef} type="file" multiple
            accept=".abap,.txt,.prog,.fugr,.clas,.intf"
            onChange={handleAddFiles} style={{ display: 'none' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {files.length === 0 ? (
            <div style={{ padding: '16px 4px', fontSize: 12, color: 'var(--sap-subtle)', textAlign: 'center', lineHeight: 1.6 }}>
              Nenhum arquivo carregado.<br />Você pode iniciar o chat sem arquivos.
            </div>
          ) : files.map(f => (
            <div key={f.name} style={{
              padding: '8px 10px', borderRadius: 6, marginBottom: 4,
              background: 'var(--sap-bg)', border: '1px solid var(--sap-border)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--sap-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--sap-subtle)' }}>
                  {f.content.split('\n').length} linhas
                </div>
              </div>
              <button onClick={() => removeFile(f.name)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--sap-subtle)', fontSize: 16, padding: 0, flexShrink: 0
              }}>×</button>
            </div>
          ))}
        </div>

        {messages.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--sap-border)' }}>
            <button onClick={() => { setMessages([]); setStreamText(''); setError('') }} style={{
              width: '100%', padding: '7px', background: 'transparent', color: 'var(--sap-subtle)',
              border: '1px solid var(--sap-border)', borderRadius: 6,
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
            }}>↺ Nova conversa</button>
          </div>
        )}
      </div>

      {/* Right: chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!hasMessages && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--sap-subtle)' }}>
              <div style={{ fontSize: 48 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--sap-text)' }}>Chat de Projeto ABAP</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 420, lineHeight: 1.7 }}>
                Carregue seus arquivos ABAP no painel à esquerda e faça perguntas sobre o código.
                A IA tem contexto completo de todos os arquivos e responde como um desenvolvedor ABAP sênior.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {[
                  'Por que este SELECT pode causar dump?',
                  'Refatore este método para OOP',
                  'Explique esta lógica de negócio',
                  'Como otimizar este LOOP?'
                ].map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{
                    padding: '6px 14px', background: 'var(--sap-base)',
                    border: '1px solid var(--sap-border)', borderRadius: 20,
                    fontSize: 12, color: 'var(--sap-text)', cursor: 'pointer', fontFamily: 'inherit'
                  }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

          {streaming && streamText && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14, gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--sap-primary)',
                color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2
              }}>✦</div>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
                background: 'var(--sap-base)', border: '1px solid var(--sap-border)', fontSize: 13
              }}>
                <div className="md-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamText}</ReactMarkdown>
                </div>
                <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--sap-primary)', marginLeft: 2, animation: 'blink 1s infinite' }} />
              </div>
            </div>
          )}

          {streaming && !streamText && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sap-primary)', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✦</div>
              <div style={{ padding: '10px 14px', background: 'var(--sap-base)', border: '1px solid var(--sap-border)', borderRadius: '12px 12px 12px 4px', fontSize: 13, color: 'var(--sap-subtle)' }}>
                Pensando...
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 14px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8, color: '#bb0000', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Files context chips */}
        {files.length > 0 && (
          <div style={{
            padding: '6px 16px', borderTop: '1px solid var(--sap-border)',
            background: 'var(--sap-base)', display: 'flex', gap: 6, flexWrap: 'wrap'
          }}>
            {files.map(f => <FileChip key={f.name} file={f} onRemove={removeFile} />)}
          </div>
        )}

        {/* Input area */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--sap-border)',
          background: 'var(--sap-base)', display: 'flex', gap: 10, alignItems: 'flex-end'
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta... (Enter para enviar, Shift+Enter para nova linha)"
            rows={2}
            style={{
              flex: 1, padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
              border: '1px solid var(--sap-border)', borderRadius: 8,
              background: 'var(--sap-input-bg)', color: 'var(--sap-text)',
              outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--sap-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--sap-border)'}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: (!input.trim() || streaming) ? 'var(--sap-border)' : 'var(--sap-primary)',
              color: '#fff', border: 'none', cursor: (!input.trim() || streaming) ? 'not-allowed' : 'pointer',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            {streaming ? '⟳' : '↑'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
