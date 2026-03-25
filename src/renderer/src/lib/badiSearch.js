/**
 * BM25 RAG engine para busca de BAdIs SAP
 * - Zero dependências externas
 * - Retrieval em 2 fases: module pre-filter + BM25 global
 * - Índice invertido para performance em 25k+ docs
 * - Normaliza acentos e tokeniza nomes SAP (separadores / _ .)
 */

import badiCsvRaw from '../docs/base_badi.csv?raw'

const BM25_K1 = 1.5
const BM25_B  = 0.75

// Termos técnicos SAP por módulo — ampliam o recall para nomes de BAdI crípticos
const MODULE_ALIASES = {
  MM:    ['mm', 'material', 'purchase', 'purchasing', 'vendor', 'goods', 'receipt', 'invoice', 'migo', 'me21', 'me51', 'mb'],
  WM:    ['wm', 'scwm', 'ewm', 'warehouse', 'lager', 'lagerort', 'storage', 'bin', 'inventory', 'inventur', 'lenum', 'huitem'],
  FI:    ['fi', 'finance', 'financial', 'account', 'accounting', 'posting', 'ledger', 'payment', 'invoice', 'gl', 'ap', 'ar'],
  SD:    ['sd', 'sales', 'order', 'delivery', 'billing', 'vbak', 'vbap', 'vbrp', 'va01', 'vl01', 'vf01'],
  PP:    ['pp', 'production', 'planning', 'order', 'bom', 'routing', 'work', 'center', 'co01', 'ca01'],
  CO:    ['co', 'controlling', 'cost', 'center', 'internal', 'order', 'profitability', 'copa'],
  HR:    ['hr', 'hcm', 'human', 'employee', 'payroll', 'time', 'pa', 'pt', 'py', 'personnel'],
  PM:    ['pm', 'pm0', 'plant', 'maintenance', 'equipment', 'order', 'notification', 'iw31', 'ie01'],
  QM:    ['qm', 'quality', 'inspection', 'lot', 'defect', 'notification', 'qa01', 'qm01'],
  PS:    ['ps', 'project', 'system', 'wbs', 'network', 'activity', 'cj01'],
  CS:    ['cs', 'service', 'customer', 'repair', 'notification', 'iw51'],
  BASIS: ['basis', 'bc', 'system', 'user', 'auth', 'authorization', 'profile', 'role'],
}

// Prefixos de namespace SAP por módulo — garante BAdIs de namespace incluídos
const MODULE_NAMESPACES = {
  MM:    ['mm_', '/mm/', 'badi_mm', 'me_', 'mb_', 'ml_', 'mrm_'],
  WM:    ['wm_', '/wm/', '/scwm/', '/ewm/', 'lm_', 'badi_wm'],
  FI:    ['fi_', '/fi/', 'ac_', 'fkk_', 'fvd_', 'badi_fi'],
  SD:    ['sd_', '/sd/', 'badi_sd', 'v_', 'vofm'],
  PP:    ['pp_', '/pp/', 'badi_pp', 'co_mfbf', 'ppco'],
  CO:    ['co_', '/co/', 'badi_co'],
  HR:    ['hr_', '/hr/', 'hcm_', 'pa_', 'pt_', 'py_', 'hrpad'],
  PM:    ['pm_', '/pm/', 'pm0', 'badi_pm', 'iwo_'],
  QM:    ['qm_', '/qm/', 'badi_qm'],
  PS:    ['ps_', '/ps/', 'badi_ps'],
  CS:    ['cs_', '/cs/', 'badi_cs'],
  BASIS: ['bc_', '/bc/', 'su_', 'auth_'],
}

// ─── Lazy state ───────────────────────────────────────────────────────────────
let _docs        = null  // [{ name, point, desc, tokens, nameLower }]
let _invertedIdx = null  // term -> [{ id, tf }]
let _avgdl       = 0
let _df          = null  // term -> docCount

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function tokenize(str) {
  return normalize(str)
    .split(/[/_;,.\s\-()+]+/)
    .filter(t => t.length > 1)
}

// ─── Index builder (runs once) ───────────────────────────────────────────────

function buildIndex() {
  if (_docs) return

  const lines = badiCsvRaw.split('\n')
  _docs = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(';')
    const name  = (parts[0] || '').trim().replace(/^\uFEFF/, '')
    const point = (parts[1] || '').trim()
    const desc  = (parts[2] || '').trim()
    if (!name) continue

    const tokens   = tokenize(`${name} ${point} ${desc}`)
    const nameLower = normalize(name)
    _docs.push({ name, point, desc, tokens, nameLower })
  }

  const N = _docs.length
  _avgdl = _docs.reduce((s, d) => s + d.tokens.length, 0) / N

  _df = {}
  _docs.forEach(doc => {
    const seen = new Set(doc.tokens)
    seen.forEach(term => { _df[term] = (_df[term] || 0) + 1 })
  })

  _invertedIdx = {}
  _docs.forEach((doc, id) => {
    const tf = {}
    doc.tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1 })
    Object.entries(tf).forEach(([term, count]) => {
      if (!_invertedIdx[term]) _invertedIdx[term] = []
      _invertedIdx[term].push({ id, tf: count })
    })
  })
}

// ─── BM25 scorer ─────────────────────────────────────────────────────────────

function bm25(queryTokens) {
  const N      = _docs.length
  const scores = new Float32Array(N)

  queryTokens.forEach(term => {
    const postings = _invertedIdx[term]
    if (!postings) return
    const df_t = _df[term] || 0
    const idf  = Math.log((N - df_t + 0.5) / (df_t + 0.5) + 1)

    postings.forEach(({ id, tf }) => {
      const dl      = _docs[id].tokens.length
      const tf_norm = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * dl / _avgdl))
      scores[id]   += idf * tf_norm
    })
  })

  return scores
}

// ─── Phase 1: module namespace pre-filter ────────────────────────────────────

function getModuleCandidates(module) {
  const prefixes = MODULE_NAMESPACES[module] || []
  if (!prefixes.length) return new Set()

  const ids = new Set()
  _docs.forEach((doc, id) => {
    if (prefixes.some(p => doc.nameLower.startsWith(p) || doc.nameLower.includes(p))) {
      ids.add(id)
    }
  })
  return ids
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieval em 2 fases: module pre-filter + BM25 global.
 * Garante BAdIs do módulo mesmo com descrição vazia.
 *
 * @param {string} query      - Descrição da necessidade (texto livre)
 * @param {string} module     - Módulo SAP (MM, WM, FI, etc.)
 * @param {number} [topK=50]  - Máximo de resultados no contexto final
 * @returns {{ name, point, desc, score }[]}
 */
export function searchBadis(query, module = '', topK = 50) {
  buildIndex()

  // Monta query expandida com sinônimos do módulo
  const moduleAliases = (MODULE_ALIASES[module] || [module.toLowerCase()]).join(' ')
  const queryText     = `${query} ${module} ${moduleAliases}`
  const queryTokens   = [...new Set(tokenize(queryText))]

  if (queryTokens.length === 0) return []

  const scores = bm25(queryTokens)

  // ── Fase 2: top BM25 global ───────────────────────────────────────────────
  const globalCandidates = []
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > 0) globalCandidates.push({ i, score: scores[i] })
  }
  globalCandidates.sort((a, b) => b.score - a.score)
  const globalTop = globalCandidates.slice(0, 35)

  // ── Fase 1: top BM25 dentro do namespace do módulo ───────────────────────
  const moduleIds       = getModuleCandidates(module)
  const moduleCandidates = []
  moduleIds.forEach(id => {
    moduleCandidates.push({ i: id, score: scores[id] || 0 })
  })
  moduleCandidates.sort((a, b) => b.score - a.score)
  const moduleTop = moduleCandidates.slice(0, 20)

  // ── Merge: módulo primeiro, depois global (sem duplicatas) ────────────────
  const seen    = new Set()
  const merged  = []

  for (const { i, score } of [...moduleTop, ...globalTop]) {
    if (!seen.has(i)) {
      seen.add(i)
      merged.push({ i, score })
    }
    if (merged.length >= topK) break
  }

  return merged.map(({ i, score }) => ({
    name:  _docs[i].name,
    point: _docs[i].point,
    desc:  _docs[i].desc,
    score
  }))
}

/**
 * Formata os resultados como bloco compacto para injetar no prompt.
 */
export function formatBadisForPrompt(results) {
  if (!results.length) return ''

  const rows = results
    .map(r => `${r.name};${r.point};${r.desc || ''}`)
    .join('\n')

  return (
    `## BAdIs disponíveis no sistema (base real S/4HANA — ${results.length} encontrados)\n\n` +
    `Nome;Enhancement Point;Descrição\n` +
    rows +
    `\n\nIMPORTANTE: Ao recomendar BAdIs, utilize APENAS nomes presentes nesta lista. ` +
    `Não invente nomes de BAdI. Se nenhum for adequado, use User Exit ou Enhancement Point.`
  )
}
