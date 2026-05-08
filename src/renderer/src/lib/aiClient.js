/**
 * Multi-provider AI Client
 * Suporta: Claude (Anthropic), Gemini (Google), OpenAI, Groq
 */

// ─── Provider Callers ──────────────────────────────────────────────────────────

// ─── Vision helpers ────────────────────────────────────────────────────────────

/**
 * Modelos Groq que suportam visão (verificação por substring do nome).
 * Outros modelos Groq recebem apenas texto — imagens são ignoradas silenciosamente.
 */
const GROQ_VISION_PREFIXES = ['llama-3.2', 'llama3.2', 'llava', 'minicpm']
function groqSupportsVision(model = '') {
  const m = model.toLowerCase()
  return GROQ_VISION_PREFIXES.some(p => m.includes(p))
}

/** Monta content array Claude: imagens primeiro, texto no final */
function claudeContent(text, images) {
  if (!images?.length) return text
  return [
    ...images.map(img => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mimeType, data: img.base64 }
    })),
    { type: 'text', text }
  ]
}

/** Monta content array OpenAI/Groq: texto + image_url data URIs */
function openaiContent(text, images) {
  if (!images?.length) return text
  return [
    { type: 'text', text },
    ...images.map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
    }))
  ]
}

/** Monta parts Gemini: texto + inline_data */
function geminiParts(text, images) {
  const parts = [{ text }]
  if (images?.length) {
    for (const img of images) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } })
    }
  }
  return parts
}

// ─── Provider Callers ──────────────────────────────────────────────────────────

async function callClaude(apiKey, model, systemPrompt, userPrompt, images) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: claudeContent(userPrompt, images) }]
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Claude: erro ${res.status}`)
  }
  const data = await res.json()
  return data.content[0].text
}

async function callGemini(apiKey, model, systemPrompt, userPrompt, images) {
  const modelName = model || 'gemini-2.0-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: geminiParts(userPrompt, images) }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.3 }
      })
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini: erro ${res.status}`)
  }
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}

async function callOpenAI(apiKey, model, systemPrompt, userPrompt, images) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: openaiContent(userPrompt, images) }
      ],
      max_tokens: 8192,
      temperature: 0.3
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI: erro ${res.status}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

async function callGroq(apiKey, model, systemPrompt, userPrompt, images) {
  // Imagens só para modelos Groq com visão — outros recebem texto puro
  const imgs = groqSupportsVision(model) ? images : null
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'qwen/qwen3-32b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: openaiContent(userPrompt, imgs) }
      ],
      temperature: 0.3,
      max_tokens: 8192
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Groq: erro ${res.status}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {{ provider: string, apiKey: string, model: string }} providerConfig
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Array<{base64: string, mimeType: string, name: string}>} [images]
 * @returns {Promise<string>} raw text response
 */
export async function callAI(providerConfig, systemPrompt, userPrompt, images) {
  const { provider, apiKey, model } = providerConfig
  switch (provider) {
    case 'claude':
      return callClaude(apiKey, model, systemPrompt, userPrompt, images)
    case 'gemini':
      return callGemini(apiKey, model, systemPrompt, userPrompt, images)
    case 'openai':
      return callOpenAI(apiKey, model, systemPrompt, userPrompt, images)
    case 'groq':
      return callGroq(apiKey, model, systemPrompt, userPrompt, images)
    default:
      throw new Error(`Provedor "${provider}" não suportado`)
  }
}

/**
 * Remove markdown code fences (```abap / ``` etc.) de um trecho de código ABAP.
 * Também normaliza quebras de linha para \n puro (remove \r).
 */
export function cleanCode(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/\r\n/g, '\n')           // CRLF → LF
    .replace(/\r/g, '\n')             // CR solto → LF
    .replace(/^```[a-z]*\s*/i, '')    // fence de abertura: ```abap, ```ABAP, ``` etc.
    .replace(/\s*```\s*$/i, '')       // fence de fechamento
    .trim()
}

/**
 * Percorre o resultado parseado e limpa os campos de código conhecidos,
 * removendo markdown fences que alguns LLMs inserem dentro do JSON.
 */
// Maps alternative field names some models use to our expected schema
function normalizeFile(f) {
  if (!f || typeof f !== 'object') return f
  // name: accept path, filename, file_name, object_name
  if (!f.name) {
    f.name = f.path || f.filename || f.file_name || f.object_name || 'ZUNKNOWN'
    // strip directory prefix if present (e.g. "src/Z_VIEW.cds" → "Z_VIEW")
    f.name = String(f.name).replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').toUpperCase()
  }
  // type: accept language, object_type, file_type
  if (!f.type) {
    const lang = (f.language || f.object_type || f.file_type || '').toUpperCase()
    // map common language labels to our type codes
    const langMap = {
      'ABAP CDS': 'CDS', 'CDS': 'CDS', 'DCL': 'DCL',
      'ABAP': 'PROG', 'REPORT': 'PROG', 'INCLUDE': 'INCL',
      'FUNCTION': 'FUNC', 'CLASS': 'CLAS'
    }
    f.type = langMap[lang] || 'PROG'
  }
  // content: accept code, source, source_code, body
  if (!f.content) {
    f.content = f.code || f.source || f.source_code || f.body || ''
  }
  return f
}

function sanitizeResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed

  // AbapView: files[].content — normalize schema + clean code fences
  if (Array.isArray(parsed.files)) {
    parsed.files = parsed.files.map(f => {
      f = normalizeFile(f)
      if (f.content) f.content = cleanCode(f.content)
      return f
    })
  }

  // PerformanceView: issues[].fix_code
  if (Array.isArray(parsed.issues)) {
    parsed.issues.forEach(i => { if (i.fix_code) i.fix_code = cleanCode(i.fix_code) })
  }

  // EnhancementFinderView: recommendations[].code_skeleton
  if (Array.isArray(parsed.recommendations)) {
    parsed.recommendations.forEach(r => { if (r.code_skeleton) r.code_skeleton = cleanCode(r.code_skeleton) })
  }

  return parsed
}

// ─── Extração interna de JSON ─────────────────────────────────────────────────

/**
 * Tenta parsear texto como JSON com até 3 estratégias de reparo.
 * Retorna o objeto ou null.
 */
function tryParseJSON(text) {
  if (!text) return null
  try { return JSON.parse(text) } catch (_) {}
  try { return JSON.parse(repairJsonStrings(text)) } catch (_) {}
  try {
    const cleaned = text
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      .replace(/\r\n/g, '\\n')
      .replace(/\r/g, '\\n')
    return JSON.parse(repairJsonStrings(cleaned))
  } catch (_) {}
  return null
}

/**
 * Fecha estruturas JSON abertas num texto truncado (sem closing } ou ]).
 * Percorre o texto rastreando profundidade de objetos/arrays fora de strings
 * e acrescenta os fechamentos ausentes na ordem correta.
 */
function closeTruncatedJSON(text) {
  const stack = []
  let inStr = false, esc = false
  for (let i = 0; i < text.length; i++) {
    if (esc) { esc = false; continue }
    if (text[i] === '\\' && inStr) { esc = true; continue }
    if (text[i] === '"') { inStr = !inStr; continue }
    if (!inStr) {
      if (text[i] === '{') stack.push('}')
      else if (text[i] === '[') stack.push(']')
      else if (text[i] === '}' || text[i] === ']') stack.pop()
    }
  }
  // Se acabou dentro de uma string, fecha a string antes
  let suffix = inStr ? '"' : ''
  // Fecha na ordem inversa
  while (stack.length) suffix += stack.pop()
  return text + suffix
}

/**
 * Extrai e parseia o primeiro objeto JSON de uma resposta bruta.
 * Usa depth-counting para encontrar o } raiz (não lastIndexOf, que falha em
 * respostas aninhadas). Suporta respostas truncadas fechando estruturas abertas.
 * Retorna o objeto parseado ou null — nunca lança exceção.
 */
function extractJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  const text = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

  const start = text.indexOf('{')
  if (start === -1) return null

  // Encontra o } raiz por depth-counting, ignorando strings
  let depth = 0, inStr = false, esc = false, end = -1
  for (let i = start; i < text.length; i++) {
    if (esc) { esc = false; continue }
    if (text[i] === '\\' && inStr) { esc = true; continue }
    if (text[i] === '"') { inStr = !inStr; continue }
    if (!inStr) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') { if (--depth === 0) { end = i; break } }
    }
  }

  if (end !== -1) {
    // JSON completo encontrado
    return tryParseJSON(text.slice(start, end + 1))
  }

  // Resposta truncada — repara strings primeiro, depois fecha estruturas abertas
  const truncated = text.slice(start)
  try { return JSON.parse(closeTruncatedJSON(repairJsonStrings(truncated))) } catch (_) {}
  return null
}

// Regex de detecção de código ABAP puro (sem envelope JSON ou Markdown)
const ABAP_CODE_RE = /^(REPORT|PROGRAM|FUNCTION|CLASS|TYPES|DATA|CONSTANTS|@|define\s+view|\*|AT\s+SELECTION|AT\s+LINE|SELECT\s+|LOOP\s+AT|FORM\s+|TABLES\s*\.|PARAMETERS\s+|SELECT-OPTIONS|START-OF-SELECTION|END-OF-SELECTION|PERFORM\s+|MODULE\s+|MOVE\s+|WRITE\s+|CALL\s+|IF\s+|CASE\s+|DO\s*\.|WHILE\s+|CHECK\s+|CLEAR\s+|REFRESH\s+|SORT\s+|READ\s+TABLE|DELETE\s+|INSERT\s+|MODIFY\s+|APPEND\s+|INCLUDE\s+|FIELD-SYMBOLS|ENHANCEMENT)/im

/**
 * Extrai arquivos de uma resposta Markdown estruturada no formato:
 *   ## `ZNOME` — TIPO
 *   *descrição*
 *   ```abap
 *   código
 *   ```
 */
function extractFilesFromMarkdown(text) {
  const files = []
  // Aceita — (mdash), – (ndash), - (hífen) e · (middle dot) como separador nome/tipo
  const re = /##\s+`([^`]+)`\s*[—–·\-]\s*(\w+)[^\n]*\n(?:\*([^\n]*)\*\s*\n)?\s*```(?:abap|sap|ABAP)?\s*\n([\s\S]*?)```/gi
  let match
  while ((match = re.exec(text)) !== null) {
    const name = match[1].trim().toUpperCase()
    const type = match[2].trim().toUpperCase()
    const description = match[3]?.trim() || ''
    const content = match[4].replace(/\n$/, '') // remove trailing newline antes do fence
    files.push({ name, type, description, parent: null, content })
  }
  // Atribui parent: primeiro PROG/PROG encontrado é pai dos INCL seguintes
  const mainFile = files.find(f => f.type === 'PROG' || f.type === 'FUGR')
  files.forEach(f => {
    if (f.parent === null && f.type === 'INCL' && mainFile) f.parent = mainFile.name
  })
  return files
}

// ─── Parser genérico (legado — usar parsers específicos por view) ─────────────

export function parseJSONResponse(rawText) {
  const parsed = extractJSON(rawText)
  if (parsed) return sanitizeResult(parsed)

  const text = (rawText || '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
  if (ABAP_CODE_RE.test(text)) {
    const nameMatch = text.match(/^(?:REPORT|PROGRAM)\s+(\w+)/im)
      || text.match(/define\s+view\s+entity\s+(\w+)/im)
    const name = nameMatch?.[1] || 'ZABAP_PROGRAM'
    const isCds = /define\s+view/i.test(text)
    return sanitizeResult({
      analysis: 'Resposta retornada como código puro — encapsulada automaticamente.',
      approach: isCds ? 'mixed' : 'fast_code',
      fast_code_justified: true,
      alv_approach: 'none',
      files: [{ name, type: isCds ? 'CDS' : 'PROG', description: 'Gerado automaticamente', parent: null, content: text }],
      dependencies: [],
      transport_order_type: 'Workbench',
      notes: 'O modelo retornou código sem o envelope JSON. Verifique o prompt do agente.'
    })
  }

  throw new Error(`Resposta do modelo não é JSON válido. Início: "${text.slice(0, 120)}"`)
}

// ─── Parsers especializados por view ─────────────────────────────────────────

/**
 * AbapView — { files[], analysis, approach, alv_approach, dependencies, transport_order_type, notes }
 * Fallback 1: código ABAP puro (sem JSON) → encapsula em files[].
 * Fallback 2: qualquer outro formato → empacota o texto como _markdown para renderização.
 */
export function parseAbapResponse(rawText) {
  const text = (rawText || '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

  // 1. Tenta extrair arquivos do Markdown estruturado (novo formato do agente)
  const mdFiles = extractFilesFromMarkdown(text)
  if (mdFiles.length > 0) {
    const analysisMatch = text.match(/##\s+An[aá]lise\s*\n([\s\S]*?)(?=\n---|\n##|$)/i)
    const notesMatch    = text.match(/##\s+Notas\s*\n([\s\S]*?)(?=\n---|\n##|$)/i)
    return {
      analysis: analysisMatch?.[1]?.trim() || '',
      approach: 'fast_code',
      fast_code_justified: true,
      alv_approach: 'none',
      files: mdFiles,
      dependencies: [],
      transport_order_type: 'Workbench',
      notes: notesMatch?.[1]?.trim() || '',
    }
  }

  // 2. Tenta JSON (formato legado / modelos que ainda retornam JSON)
  const parsed = extractJSON(rawText)
  if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
    parsed.files = parsed.files.map(f => {
      f = normalizeFile(f)
      if (f.content) f.content = cleanCode(f.content)
      return f
    })
    return parsed
  }

  // 3. Fallback: resposta é código ABAP puro (sem envelope)
  if (ABAP_CODE_RE.test(text)) {
    const nameMatch = text.match(/^(?:REPORT|PROGRAM)\s+(\w+)/im)
      || text.match(/define\s+view\s+entity\s+(\w+)/im)
    const name = nameMatch?.[1] || 'ZABAP_PROGRAM'
    const isCds = /define\s+view/i.test(text)
    return {
      analysis: 'Resposta retornada como código puro — encapsulada automaticamente.',
      approach: isCds ? 'mixed' : 'fast_code',
      fast_code_justified: true,
      alv_approach: 'none',
      files: [{ name, type: isCds ? 'CDS' : 'PROG', description: 'Gerado automaticamente', parent: null, content: cleanCode(text) }],
      dependencies: [],
      transport_order_type: 'Workbench',
    }
  }

  // 4. Último recurso: renderiza o texto como Markdown bruto
  return { _markdown: text }
}

/**
 * DtecView — aceita tanto JSON quanto Markdown.
 * Retorna { _markdown, object_name } quando o modelo responde em Markdown,
 * ou o objeto JSON completo quando a resposta é JSON válido.
 */
export function parseDtecResponse(rawText) {
  const text = (rawText || '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
  if (!text) throw new Error('Resposta vazia do modelo.')

  // Tenta JSON primeiro
  const parsed = extractJSON(rawText)
  if (parsed && ['object_name', 'object_type', 'objective', 'processing_logic', 'structure'].some(f => parsed[f])) {
    return parsed
  }

  // Markdown: extrai nome do objeto do título e empacota o markdown raw
  const nameMatch = text.match(/^#[^#\n]*?[—\-]\s*(\S+)/m)
    || text.match(/\|\s*\*{0,2}Nome do Objeto\*{0,2}\s*\|\s*([^|\n]+)\|/i)
  const object_name = nameMatch?.[1]?.trim() || 'DTec'
  return { _markdown: text, object_name }
}

/**
 * EspecificacoesView (geração de EF) — { project_name, author, brief_description,
 *   summary_description, macro_overview, functional_spec }
 */
export function parseEfResponse(rawText) {
  const parsed = extractJSON(rawText)
  if (!parsed || !['project_name', 'functional_spec', 'summary_description', 'macro_overview'].some(f => parsed[f])) {
    throw new Error('O modelo não retornou uma Especificação Funcional válida. Verifique o agente e tente novamente.')
  }
  return parsed
}

/**
 * EstimativasView — { projeto, versao_sap, complexidade_geral, objetos_identificados[],
 *   estimativas: { agressiva, segura, tranquila }, notas_gerais }
 */
export function parseEffortResponse(rawText) {
  const parsed = extractJSON(rawText)
  if (!parsed || (!parsed.estimativas && !parsed.objetos_identificados)) {
    throw new Error('O modelo não retornou estimativas válidas. Verifique o agente e tente novamente.')
  }
  return parsed
}

/**
 * PerformanceView — { score, summary, issues[], general_recommendations[] }
 */
export function parsePerformanceResponse(rawText) {
  const parsed = extractJSON(rawText)
  if (!parsed || (!parsed.issues && parsed.score == null)) {
    throw new Error('O modelo não retornou uma análise de performance válida. Verifique o agente e tente novamente.')
  }
  if (Array.isArray(parsed.issues)) {
    parsed.issues.forEach(i => { if (i.fix_code) i.fix_code = cleanCode(i.fix_code) })
  }
  return parsed
}

/**
 * EnhancementFinderView — { summary, recommendations[], additional_notes }
 */
export function parseEnhancementResponse(rawText) {
  const parsed = extractJSON(rawText)
  if (!parsed || (!parsed.recommendations && !parsed.summary)) {
    throw new Error('O modelo não retornou sugestões de enhancement válidas. Verifique o agente e tente novamente.')
  }
  if (Array.isArray(parsed.recommendations)) {
    parsed.recommendations.forEach(r => { if (r.code_skeleton) r.code_skeleton = cleanCode(r.code_skeleton) })
  }
  return parsed
}

/**
 * CodeReviewView — { summary, risk_level, findings[], statistics{}, verdict, notes }
 * Retorna null se a resposta for markdown conversacional (não JSON).
 */
export function parseCodeReviewResponse(rawText) {
  return extractJSON(rawText)
}

/**
 * Repara newlines literais e aspas de comentários ABAP dentro de strings JSON.
 *
 * Problemas tratados:
 * 1. Newlines literais dentro de values de string → escapados como \n
 * 2. Aspas ABAP: em ABAP, `"` inicia comentário de linha. Quando o modelo
 *    inclui código ABAP dentro de um campo JSON sem escapar, `repairJsonStrings`
 *    interpretava o `"` do comentário como fim da string JSON, corrompendo o parse.
 *    Heurística: `"` após newline (início de linha) dentro de uma string é
 *    ABAP comment — é escapado. `"` não precedido de newline encerra a string.
 */
function repairJsonStrings(text) {
  let result = ''
  let inString = false
  let escaped = false
  let afterNewline = false // true logo após processar \n ou \r dentro de string

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      result += ch
      escaped = false
      // \n or \r escape sequence = end of logical line inside string
      afterNewline = (ch === 'n' || ch === 'r')
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escaped = true
      afterNewline = false
      continue
    }

    if (ch === '"') {
      if (inString) {
        const next = text[i + 1] ?? ''
        const nextIsStructural = !next || /[\}\],:\r\n"]/.test(next)
        // Heurística 1: " início de linha (após \n + espaços) = comentário ABAP
        const isLineStart = afterNewline
        // Heurística 2: " após 2+ espaços no meio da linha = comentário inline ABAP
        //   Ex: "TYPE ekko-ebeln,       " Número do pedido"
        //   Em ABAP, " só inicia string via aspas simples; " dupla = sempre comentário
        const rLen = result.length
        const isInlineComment = !afterNewline &&
          rLen >= 2 && result[rLen - 1] === ' ' && result[rLen - 2] === ' '
        if ((isLineStart || isInlineComment) && !nextIsStructural) {
          result += '\\"'
          afterNewline = false
          continue
        }
      }
      inString = !inString
      afterNewline = false
      result += ch
      continue
    }

    if (inString) {
      if (ch === '\n') { result += '\\n'; afterNewline = true; continue }
      if (ch === '\r') { result += '\\r'; afterNewline = true; continue }
      if (ch === '\t') { result += '\\t'; afterNewline = false; continue }
      // espaços e tabs no início de linha não resetam afterNewline (indentação ABAP)
      if (afterNewline && (ch === ' ')) { result += ch; continue }
      afterNewline = false
    }

    result += ch
  }

  return result
}

/**
 * Retorna o primeiro provedor habilitado.
 * Integrações CLI têm prioridade sobre provedores API.
 * @param {object} providers - estado do aiStore.providers
 */
export function getActiveProvider(providers) {
  // Integrações CLI (Claude Code / Codex) — sem API key, apenas enabled
  const integrations = [
    { key: 'claude_integration', integrationType: 'agent', label: 'Claude Code (CLI)' },
    { key: 'codex_integration',  integrationType: 'codex', label: 'Codex CLI'          }
  ]
  for (const { key, integrationType, label } of integrations) {
    const p = providers[key]
    if (p?.enabled) {
      return { provider: key, isIntegration: true, integrationType, label, model: 'CLI local' }
    }
  }

  // Provedores via API
  const order  = ['claude', 'gemini', 'openai', 'groq']
  const labels = { claude: 'Claude', gemini: 'Gemini', openai: 'OpenAI', groq: 'Groq' }
  for (const key of order) {
    const p = providers[key]
    if (p?.enabled && p?.apiKey?.trim()) {
      return { provider: key, apiKey: p.apiKey, model: p.model, label: labels[key] }
    }
  }
  return null
}

/**
 * Constrói o prompt do usuário a partir do formulário de criação ABAP.
 */
export function buildAbapPrompt(form, sapVersion) {
  // CDS view has its own dedicated prompt builder
  if (form.type === 'CDS') return buildCdsPrompt(form, sapVersion)

  const typeNames = {
    REPORT: 'REPORT — Relatório com tela de seleção (ALV ou lista)',
    FUNC: 'FUNCTION MODULE — Módulo de função reutilizável',
    CLAS: 'CLASS — Classe ABAP (Object-Oriented)',
    ENHO: 'ENHANCEMENT — Ampliação de programa existente (BAdI / Enhancement Spot)',
    PROG: 'PROGRAM — Programa simples sem tela de seleção padrão'
  }

  let p = `Versão SAP do ambiente: ${sapVersion || 'ECC 6.0'}\n`
  p += `Tipo de objeto: ${typeNames[form.type] || form.type}\n`
  p += `Nome: ${form.name || '(não informado)'}\n`
  if (form.author) p += `Autor: ${form.author}\n`
  if (form.company) p += `Empresa/Mandante: ${form.company}\n`
  if (form.transaction_code) p += `Código de transação: ${form.transaction_code}\n`
  if (form.description) p += `Descrição: ${form.description}\n`
  p += '\n'

  // FUNC: interface
  if (form.type === 'FUNC') {
    if (form.function_group) p += `Grupo de funções: ${form.function_group}\n\n`
    if (form.imports?.filter(i => i.name).length) {
      p += `PARÂMETROS IMPORTING:\n`
      form.imports.filter(i => i.name).forEach(i => {
        p += `  ${i.name} TYPE ${i.type || 'string'}${i.optional ? ' OPTIONAL' : ''}${i.by_ref ? ' REFERENCE' : ''}\n`
      })
      p += '\n'
    }
    if (form.exports?.filter(i => i.name).length) {
      p += `PARÂMETROS EXPORTING:\n`
      form.exports.filter(i => i.name).forEach(i => {
        p += `  ${i.name} TYPE ${i.type || 'string'}\n`
      })
      p += '\n'
    }
    if (form.tables_params?.filter(i => i.name).length) {
      p += `PARÂMETROS TABLES:\n`
      form.tables_params.filter(i => i.name).forEach(i => {
        p += `  ${i.name} TYPE ${i.type || 'table'}${i.optional ? ' OPTIONAL' : ''}\n`
      })
      p += '\n'
    }
    if (form.exceptions?.filter(i => i.name).length) {
      p += `EXCEPTIONS:\n`
      form.exceptions.filter(i => i.name).forEach(i => {
        p += `  ${i.name}${i.description ? ` -- ${i.description}` : ''}\n`
      })
      p += '\n'
    }
  }

  // CLAS: estrutura OO
  if (form.type === 'CLAS') {
    if (form.superclass) p += `Herda de: ${form.superclass}\n`
    if (form.interfaces?.filter(Boolean).length) p += `Interfaces: ${form.interfaces.filter(Boolean).join(', ')}\n`
    p += `Visibilidade da classe: ${form.visibility || 'PUBLIC'}\n\n`
    if (form.attributes?.filter(a => a.name).length) {
      p += `ATRIBUTOS:\n`
      form.attributes.filter(a => a.name).forEach(a => {
        p += `  ${a.name} TYPE ${a.type || 'string'} (${a.visibility || 'PRIVATE'})${a.description ? ` -- ${a.description}` : ''}\n`
      })
      p += '\n'
    }
    if (form.methods?.filter(m => m.name).length) {
      p += `MÉTODOS:\n`
      form.methods.filter(m => m.name).forEach(m => {
        p += `  ${m.name} (${m.visibility || 'PUBLIC'})${m.description ? `: ${m.description}` : ''}\n`
      })
      p += '\n'
    }
  }

  // ENHO: detalhes do enhancement
  if (form.type === 'ENHO') {
    if (form.target_program) p += `Programa/Objeto alvo: ${form.target_program}\n`
    if (form.enhancement_type) p += `Tipo de Enhancement: ${form.enhancement_type}\n`
    if (form.spot_name) p += `Spot/BAdI: ${form.spot_name}\n`
    p += '\n'
  }

  if (form.context?.trim()) {
    p += `CONTEXTO / FLUXO DO PROGRAMA:\n${form.context.trim()}\n\n`
  }

  const validRules = (form.rules || []).filter(r => r.trim())
  if (validRules.length) {
    p += `REGRAS DE NEGÓCIO:\n`
    validRules.forEach((r, i) => { p += `${i + 1}. ${r}\n` })
    p += '\n'
  }

  const validTables = (form.tables || []).filter(t => t.table)
  if (validTables.length) {
    p += `TABELAS E CAMPOS:\n`
    const grouped = {}
    validTables.forEach(t => {
      if (!grouped[t.table]) grouped[t.table] = []
      if (t.field) {
        grouped[t.table].push(
          `${t.field}${t.type ? ` (${t.type})` : ''}${t.description ? ` - ${t.description}` : ''}`
        )
      }
    })
    Object.entries(grouped).forEach(([tbl, fields]) => {
      p += `  ${tbl}${fields.length ? ': ' + fields.join(', ') : ''}\n`
    })
    p += '\n'
  }

  return p
}

export function buildCdsPrompt(form, sapVersion) {
  const viewTypeLabels = {
    basic: 'Basic Interface View',
    composite: 'Composite Interface View',
    consumption: 'Consumption View (Fiori)',
    transactional: 'Transactional View (RAP)'
  }
  const annotationLabels = {
    analytics: 'Analytics (@Analytics.dataCategory, @Analytics.query)',
    fiori: 'Fiori (@UI.lineItem, @UI.selectionField, @UI.headerInfo)',
    search: 'Search Help (@Search.searchable, @Search.defaultSearchElement)',
    none: 'Sem anotações (apenas estrutura básica)'
  }

  let p = `GERAR CDS VIEW ABAP\n\n`
  p += `Versão SAP do ambiente: ${sapVersion || 'S/4HANA 2022'}\n`
  p += `Nome da View: ${form.name || 'Z_I_XXXX'}\n`
  if (form.description) p += `Descrição: ${form.description}\n`
  p += `Tipo de View: ${viewTypeLabels[form.cds_view_type] || form.cds_view_type}\n`
  p += `Tabela/Entidade base: ${form.cds_base_entity || '(não informada)'}\n`
  p += `Anotações: ${annotationLabels[form.cds_annotation_preset] || form.cds_annotation_preset}\n\n`

  const fields = (form.cds_fields || []).filter(f => f.field)
  if (fields.length) {
    p += `CAMPOS:\n`
    fields.forEach(f => {
      p += `  ${f.field}${f.alias ? ` as ${f.alias}` : ''}${f.type ? ` (${f.type})` : ''}`
      if (f.annotation) p += ` -- ${f.annotation}`
      p += '\n'
    })
    p += '\n'
  }

  const assocs = (form.cds_associations || []).filter(a => a.name && a.target)
  if (assocs.length) {
    p += `ASSOCIATIONS:\n`
    assocs.forEach(a => {
      p += `  association ${a.cardinality || '[0..1]'} to ${a.target} as ${a.name}`
      if (a.join) p += ` on ${a.join}`
      p += '\n'
    })
    p += '\n'
  }

  if (form.context?.trim()) {
    p += `CONTEXTO / REGRAS DE NEGÓCIO:\n${form.context.trim()}\n\n`
  }

  p += `Gere a CDS view completa incluindo: define view entity, campo-chave, todas as anotações necessárias para o tipo solicitado, e o DCL (access control) básico.\n`
  p += `O formato de resposta deve ser o JSON padrão com files[] contendo os arquivos .cds e .dcl separados.`
  return p
}
