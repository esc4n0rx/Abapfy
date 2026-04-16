// ─── Utilitários compartilhados para leitura e limpeza de EFs ────────────────
// Usado em EstimativasView e EditorView (NewSessionModal).

/**
 * Remove ruído do rawText (metadados, índice, checklist de segurança) e mantém
 * somente o conteúdo funcional relevante para o modelo de IA.
 *
 * Suporta dois formatos:
 *   classic — seções numeradas 3.1/3.2 (início em "Especificação Funcional" / "Visão Geral")
 *   delta   — seções nomeadas (início em "Descritivo do Delta" / "Componentes Requeridos...")
 *
 * @param {string} rawText  Texto bruto extraído do DOCX (parágrafos unidos por \n)
 * @param {string} formato  'classic' | 'delta' | undefined
 * @returns {string}
 */
export function cleanEfForPrompt(rawText, formato) {
  if (!rawText) return ''

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  const CONTENT_HEADINGS = new Set([
    // Formato Classic
    'especificação funcional', 'especificacao funcional',
    'visão geral', 'visao geral',
    // Formato Delta
    'descritivo do delta',
    'componentes requeridos por tipo de desenvolvimento',
  ])

  let contentStartIdx = -1

  // Para Delta EF prioriza "descritivo do delta" como ponto de entrada
  if (formato === 'delta') {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase() === 'descritivo do delta') {
        contentStartIdx = i + 1
        break
      }
    }
  }

  // Fallback: última ocorrência de qualquer heading de conteúdo
  if (contentStartIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (CONTENT_HEADINGS.has(lines[i].toLowerCase())) contentStartIdx = i + 1
    }
  }

  // Último fallback: primeiro parágrafo com mais de 60 caracteres
  if (contentStartIdx === -1) {
    contentStartIdx = lines.findIndex(l => l.length > 60)
    if (contentStartIdx === -1) contentStartIdx = 0
  }

  const STOP_RE = /^(aprovação|aprovacao|aprovação:|comentarios|comentários|key user|sessão\s*1|sessao\s*1|sessão\s*a|sessao\s*a|sessão\s*b|sessao\s*b|checklist de segurança|checklist de seguranca|code inspector)\s*$/i
  const IMPL_TABLE_SKIP = /^(programa|include|método|metodo)\s*$/i

  const cleaned = []
  for (let i = contentStartIdx; i < lines.length; i++) {
    const line = lines[i]
    if (STOP_RE.test(line)) break
    if (IMPL_TABLE_SKIP.test(line)) continue
    if (line.length < 3) continue
    cleaned.push(line)
  }

  return cleaned.join('\n')
}

/**
 * Extrai os campos canônicos de um resultado de ef-read-docx para popular
 * formulários (nome da sessão, contexto, regras de negócio).
 *
 * @param {{ data: object, rawText: string, formato: string, fileName: string }} efData
 * @returns {{ sessionName: string, context: string, businessRules: string }}
 */
export function efDataToSessionFields(efData) {
  if (!efData?.data) return { sessionName: '', context: '', businessRules: '' }

  const { data, rawText, formato } = efData

  const sessionName = (data.projectName || data.titulo || efData.fileName || '').slice(0, 120)

  // Contexto: descrição resumida da EF
  const context = (data.descricaoResumida || '').slice(0, 500)

  // Regras de negócio: conteúdo funcional limpo (primeiros ~800 chars para não
  // sobrecarregar o campo, o conteúdo completo vai na primeira mensagem)
  const cleaned = cleanEfForPrompt(rawText, formato)
  const businessRules = cleaned.slice(0, 800)

  return { sessionName, context, businessRules }
}
