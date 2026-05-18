import { app, BrowserWindow, ipcMain, shell, Notification, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as nodePath from 'path'
import * as os from 'os'
import PizZip from 'pizzip'
import { autoUpdater } from 'electron-updater'

// ─── Configuração do autoUpdater ─────────────────────────────────────────────
autoUpdater.autoDownload = false         // Usuário decide quando baixar
autoUpdater.autoInstallOnAppQuit = true  // Instala automaticamente ao fechar
autoUpdater.allowPrerelease = false

// Repositório privado — injeta token para acessar releases (injetado via define no build)
const releasesToken = (typeof __RELEASES_TOKEN__ !== 'undefined' ? __RELEASES_TOKEN__ : '')
if (releasesToken) {
  autoUpdater.requestHeaders = { 'Authorization': `token ${releasesToken}` }
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    roundedCorners: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── Helper: Runs Codex CLI and returns the final agent message ───────────────
function runCodexIntegration(fullPrompt) {
  return new Promise((resolve, reject) => {
    const tmpOutput = nodePath.join(os.tmpdir(), `codex_out_${Date.now()}.txt`)

    const args = [
      'codex', 'exec',
      '--json',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-o', tmpOutput,
      '-'
    ]

    const proc = spawn('codex', args.slice(1), {
      shell: true,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    proc.stdin.write(fullPrompt + '\n')
    proc.stdin.end()

    let stderrBuf = ''
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString()
      console.warn('[CODEX-STDERR]', chunk.toString().trim())
    })

    let stdoutBuf = ''
    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString()
      console.log('[CODEX-STDOUT]', chunk.toString().trim().slice(0, 200))
    })

    proc.on('close', (code) => {
      console.log(`[CODEX] proc closed | code=${code} | stderr length=${stderrBuf.length}`)
      try {
        const content = fs.readFileSync(tmpOutput, 'utf-8').trim()
        fs.unlinkSync(tmpOutput)
        resolve(content || '(sem resposta)')
      } catch (readErr) {
        console.warn('[CODEX] Falha ao ler tmpOutput:', readErr.message)
        if (code !== 0) {
          const detail = stderrBuf.trim() ? `\nStderr: ${stderrBuf.trim().slice(0, 300)}` : ''
          reject(new Error(`Codex encerrou com código ${code}.${detail}`))
        } else {
          resolve('(sem resposta)')
        }
      }
    })

    proc.on('error', (err) => {
      console.error('[CODEX] proc error:', err.message)
      reject(new Error(`Erro ao iniciar Codex: ${err.message}. Verifique se o Codex CLI está instalado.`))
    })
  })
}

// ─── Helper: Salva arquivos ABAP em disco ────────────────────────────────────
function saveAbapFiles(rawContent, outputDir) {
  let text = rawContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()

  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) text = codeBlock[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!parsed?.files?.length) return null

  fs.mkdirSync(outputDir, { recursive: true })
  for (const file of parsed.files) {
    const fileName = `${file.name}.abap`
    fs.writeFileSync(nodePath.join(outputDir, fileName), file.content || '', 'utf-8')
  }
  return outputDir
}

// ─── Helper: Escapa caracteres especiais XML ─────────────────────────────────
function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ─── Helper: Normaliza runs adjacentes num parágrafo (une texto dividido) ────
function normalizeDocxRuns(xml) {
  // Remove divisões artificiais entre runs sem formatação especial
  // Padrão: </w:t></w:r><w:r><w:t ...>  →  (une os textos)
  return xml.replace(/<\/w:t><\/w:r>(\s*)<w:r>(\s*)<w:t(?:\s+xml:space="preserve")?>/g, '')
}

// ─── Helper: Substitui placeholder multiline criando múltiplos parágrafos ────
function replaceMultilinePlaceholder(xml, placeholder, value) {
  const pRegex = /(<w:p[ >][\s\S]*?<\/w:p>)/g
  return xml.replace(pRegex, (paragraph) => {
    if (!paragraph.includes(placeholder)) return paragraph

    const rPropsMatch = paragraph.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
    const rProps = rPropsMatch ? rPropsMatch[0] : ''
    const pPropsMatch = paragraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
    const pProps = pPropsMatch ? pPropsMatch[0] : ''

    const paragraphs = value.split('\n\n').filter((p) => p.trim())

    if (!paragraphs.length) return paragraph

    return paragraphs
      .map((para) => {
        const lines = para.split('\n')
        const runs = lines
          .map((line, lIdx) => {
            const br = lIdx < lines.length - 1 ? '<w:br/>' : ''
            return `<w:r>${rProps}<w:t xml:space="preserve">${xmlEscape(line)}${br}</w:t></w:r>`
          })
          .join('')
        return `<w:p>${pProps}${runs}</w:p>`
      })
      .join('')
  })
}

// ─── Helper: Substitui placeholders no buffer DOCX, retorna novo buffer ──────
function replaceDocxText(buffer, replacements) {
  const zip = new PizZip(buffer)
  const xmlFile = zip.file('word/document.xml')
  if (!xmlFile) throw new Error('Arquivo DOCX inválido: word/document.xml não encontrado')

  let xml = xmlFile.asText()

  // Normaliza runs adjacentes para garantir que placeholders não fiquem divididos
  xml = normalizeDocxRuns(xml)

  for (const [placeholder, rawValue] of Object.entries(replacements)) {
    const value = String(rawValue || '')

    if (value.includes('\n')) {
      xml = replaceMultilinePlaceholder(xml, placeholder, value)
    } else {
      // Substituição simples com escape XML no valor
      xml = xml.split(placeholder).join(xmlEscape(value))
    }
  }

  zip.file('word/document.xml', xml)
  return zip.generate({ type: 'nodebuffer' })
}

// ─── DTec: Geração de DOCX programática (sem template) ──────────────────────

function dtecRun(text, opts = {}) {
  let rPr = ''
  if (opts.bold)   rPr += '<w:b/>'
  if (opts.italic) rPr += '<w:i/>'
  if (opts.mono)   rPr += '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>'
  if (opts.color)  rPr += `<w:color w:val="${opts.color}"/>`
  if (opts.sz)     rPr += `<w:sz w:val="${opts.sz}"/><w:szCs w:val="${opts.sz}"/>`
  const rPrXml = rPr ? `<w:rPr>${rPr}</w:rPr>` : ''
  return `<w:r>${rPrXml}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`
}

function dtecPara(runs, styleId = 'Normal', pPrExtra = '') {
  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/>${pPrExtra}</w:pPr>${runs}</w:p>`
}

function dtecListItem(text, level = 0) {
  const indent = 360 + level * 360
  const pPrExtra = `<w:ind w:left="${indent}" w:hanging="240"/>`
  return `<w:p><w:pPr><w:pStyle w:val="Normal"/>${pPrExtra}</w:pPr>${dtecRun('• ')}${mdInlineToRuns(text)}</w:p>`
}

function mdInlineToRuns(line) {
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  const runs = []
  let lastIdx = 0
  let match
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIdx) runs.push(dtecRun(line.slice(lastIdx, match.index)))
    if (match[2])      runs.push(dtecRun(match[2], { bold: true }))
    else if (match[3]) runs.push(dtecRun(match[3], { italic: true }))
    else if (match[4]) runs.push(dtecRun(match[4], { mono: true, color: '0050B3' }))
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < line.length) runs.push(dtecRun(line.slice(lastIdx)))
  return runs.join('')
}

function buildDtecWordTable(tableLines) {
  const rows = tableLines.filter(line => !/^\|[\s|:-]+\|$/.test(line.trim()))
  const tableRows = rows.map((row, rowIdx) => {
    const cells = row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
    const isHeader = rowIdx === 0
    const cellXmls = cells.map(cell => {
      const shd = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="0070F2"/>' : '<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>'
      const borders = '<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/></w:tcBorders>'
      const tcProps = `<w:tcPr>${shd}${borders}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>`
      const cellRuns = isHeader
        ? `<w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${xmlEscape(cell)}</w:t></w:r>`
        : mdInlineToRuns(cell)
      return `<w:tc>${tcProps}<w:p>${cellRuns}</w:p></w:tc>`
    })
    return `<w:tr>${cellXmls.join('')}</w:tr>`
  })
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/></w:tblBorders></w:tblPr>${tableRows.join('')}</w:tbl><w:p/>`
}

function parseMdToDtecXml(markdown) {
  const lines = (markdown || '').split('\n')
  const parts = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (trimmed.startsWith('#### ')) {
      parts.push(dtecPara(mdInlineToRuns(trimmed.slice(5)), 'DTecH3')); i++; continue
    }
    if (trimmed.startsWith('### ')) {
      parts.push(dtecPara(mdInlineToRuns(trimmed.slice(4)), 'DTecH3')); i++; continue
    }
    if (trimmed.startsWith('## ')) {
      parts.push(dtecPara(mdInlineToRuns(trimmed.slice(3)), 'DTecH2')); i++; continue
    }
    if (trimmed.startsWith('# ')) {
      parts.push(dtecPara(mdInlineToRuns(trimmed.slice(2)), 'DTecH1')); i++; continue
    }
    if (/^[-*_]{3,}$/.test(trimmed)) { i++; continue }

    if (trimmed.startsWith('```')) {
      i++
      const codeLines = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]); i++
      }
      i++
      for (const cl of codeLines) {
        parts.push(dtecPara(dtecRun(cl || ' ', { mono: true }), 'DTecCode'))
      }
      continue
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]); i++
      }
      parts.push(buildDtecWordTable(tableLines))
      continue
    }

    if (trimmed.startsWith('> ')) {
      parts.push(dtecPara(mdInlineToRuns(trimmed.slice(2)), 'DTecQuote')); i++; continue
    }
    if (/^[-*+] /.test(trimmed)) {
      const level = Math.floor((raw.length - raw.trimStart().length) / 2)
      parts.push(dtecListItem(trimmed.slice(2), level)); i++; continue
    }
    if (/^\d+\. /.test(trimmed)) {
      const text = trimmed.replace(/^\d+\. /, '')
      parts.push(dtecListItem(text)); i++; continue
    }
    if (!trimmed) { i++; continue }

    parts.push(dtecPara(mdInlineToRuns(trimmed), 'Normal')); i++
  }
  return parts.join('')
}

function buildDtecJsonXml(content, objectName) {
  const parts = []
  const title = content.object_name || objectName || 'Documentação Técnica'
  parts.push(dtecPara(dtecRun(title), 'DTecTitle'))
  if (content.object_type || content.sap_module) {
    const sub = [content.object_type, content.sap_module].filter(Boolean).join('  |  ')
    parts.push(dtecPara(dtecRun(sub), 'DTecSubtitle'))
  }
  const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  parts.push(dtecPara(dtecRun(`Gerado em: ${now}`), 'DTecMeta'))
  parts.push('<w:p/>')

  const textSections = [
    { key: 'objective',         label: '1. Objetivo' },
    { key: 'structure',         label: '2. Estrutura Técnica' },
    { key: 'parameters',        label: '4. Parâmetros e Interface' },
    { key: 'processing_logic',  label: '5. Lógica de Processamento' },
    { key: 'error_handling',    label: '6. Tratamento de Erros' },
    { key: 'performance_notes', label: '8. Considerações de Performance' },
  ]
  for (const { key, label } of textSections) {
    if (!content[key]) continue
    parts.push(dtecPara(dtecRun(label), 'DTecH1'))
    parts.push(parseMdToDtecXml(String(content[key])))
    parts.push('<w:p/>')
  }

  if (content.tables?.length > 0) {
    parts.push(dtecPara(dtecRun('3. Tabelas e Estruturas SAP'), 'DTecH1'))
    const rows = [
      '| Tabela | Descrição | Uso |',
      '|--------|-----------|-----|',
      ...content.tables.map(t => `| ${t.name || ''} | ${t.description || ''} | ${t.usage || ''} |`)
    ]
    parts.push(buildDtecWordTable(rows))
  }

  if (content.dependencies?.length > 0) {
    parts.push(dtecPara(dtecRun('7. Dependências'), 'DTecH1'))
    const rows = [
      '| Tipo | Nome | Descrição |',
      '|------|------|-----------|',
      ...content.dependencies.map(d => `| ${d.type || ''} | ${d.name || ''} | ${d.description || ''} |`)
    ]
    parts.push(buildDtecWordTable(rows))
  }

  if (content.change_log_template) {
    parts.push(dtecPara(dtecRun('9. Template — Histórico de Alterações'), 'DTecH1'))
    for (const line of String(content.change_log_template).split('\n')) {
      parts.push(dtecPara(dtecRun(line || ' ', { mono: true }), 'DTecCode'))
    }
    parts.push('<w:p/>')
  }

  return parts.join('')
}

function buildDtecDocxStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecTitle">
    <w:name w:val="DTecTitle"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="200"/><w:shd w:val="clear" w:color="auto" w:fill="0070F2"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="38"/><w:szCs w:val="38"/><w:color w:val="FFFFFF"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecSubtitle">
    <w:name w:val="DTecSubtitle"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/><w:shd w:val="clear" w:color="auto" w:fill="E8F3FF"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="0050B3"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecMeta">
    <w:name w:val="DTecMeta"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="280"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:i/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="6A6D70"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecH1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="320" w:after="100"/><w:shd w:val="clear" w:color="auto" w:fill="E8F1FB"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="4" w:color="0070F2"/></w:pBdr><w:ind w:left="180"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="0050B3"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecH2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="240" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="0070F2"/></w:pBdr></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0070F2"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecH3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="354A5E"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecCode">
    <w:name w:val="DTecCode"/>
    <w:pPr><w:spacing w:before="40" w:after="40"/><w:shd w:val="clear" w:color="auto" w:fill="F4F6F9"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="4" w:color="AAAAAA"/></w:pBdr><w:ind w:left="360"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="333333"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="DTecQuote">
    <w:name w:val="DTecQuote"/>
    <w:pPr><w:spacing w:before="80" w:after="80"/><w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="4" w:color="0070F2"/></w:pBdr><w:ind w:left="360"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="354A5E"/></w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
  </w:style>
</w:styles>`
}

function buildDtecDocx(content, objectName) {
  const zip = new PizZip()
  const isMarkdown = !!content._markdown

  let titleForDoc = content.object_name || objectName || 'Documentação Técnica'
  let bodyXml
  if (isMarkdown) {
    bodyXml = dtecPara(dtecRun(titleForDoc), 'DTecTitle')
    const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    bodyXml += dtecPara(dtecRun(`Gerado em: ${now}`), 'DTecMeta')
    bodyXml += '<w:p/>'
    bodyXml += parseMdToDtecXml(content._markdown)
  } else {
    bodyXml = buildDtecJsonXml(content, objectName)
  }

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`)

  zip.file('word/settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="708"/></w:settings>`)

  zip.file('word/styles.xml', buildDtecDocxStyles())

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${bodyXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1417" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`)

  return zip.generate({ type: 'nodebuffer' })
}

// ─── Helper: Extrai parágrafos de texto + rIds de imagem de um XML DOCX ───────
// Retorna array de { text: string, rIds: string[] }
function extractDocxParagraphs(xml) {
  const paragraphs = []
  const parts = xml.split('</w:p>')
  for (const part of parts) {
    const idx = part.lastIndexOf('<w:p')
    if (idx === -1) continue
    const paraPart = part.slice(idx)

    // Extrai texto
    const textRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
    let m
    let text = ''
    while ((m = textRe.exec(paraPart)) !== null) text += m[1]

    // Extrai rIds de imagens embarcadas neste parágrafo
    const rIdRe = /r:embed="([^"]+)"/g
    const rIds = []
    let rm
    while ((rm = rIdRe.exec(paraPart)) !== null) rIds.push(rm[1])

    paragraphs.push({ text: text.trim(), rIds })
  }
  return paragraphs
}

// ─── Helper: Lê o mapa rId → nome do arquivo de word/_rels/document.xml.rels ──
function buildDocxRelMap(zip) {
  const relMap = {}
  const relsFile = zip.file('word/_rels/document.xml.rels')
  if (!relsFile) return relMap
  const relsXml = relsFile.asText()
  // Itera em cada tag <Relationship .../>
  const tagRe = /<Relationship\s([^>]+)>/gi
  let tm
  while ((tm = tagRe.exec(relsXml)) !== null) {
    const attrs = tm[1]
    const idM    = attrs.match(/Id="([^"]+)"/)
    const typeM  = attrs.match(/Type="([^"]+)"/)
    const targetM = attrs.match(/Target="([^"]+)"/)
    if (idM && typeM && targetM && typeM[1].endsWith('/image')) {
      // Target pode ser "media/image1.png" ou "../media/image1.png"
      relMap[idM[1]] = targetM[1].split('/').pop()
    }
  }
  return relMap
}

// ─── Helper: Detecta formato da EF (classic = seções numeradas / delta = por nome) ──
function detectEfFormat(paragraphs) {
  const texts = paragraphs.map(p => p.text.toLowerCase())
  const hasDelta = texts.some(t =>
    t.includes('descritivo do delta') ||
    t.includes('componentes requeridos por tipo')
  )
  return hasDelta ? 'delta' : 'classic'
}

// ─── Helper: Parseia EF no formato Delta (ex: ZTMM145) ───────────────────────
// Formato utilizado em EFs de alteração/delta, com seções nomeadas em vez de numeradas.
function parseDeltaEfSections(paragraphs) {
  const result = {
    projectName: '',
    empresa: '',
    titulo: '',
    descricaoResumida: '',
    visaoGeral: '',
    especificacaoFuncional: '',
    efImageRIds: [],   // todas as imagens do documento
    formato: 'delta'
  }

  const texts = paragraphs.map(p => p.text.trim())

  // ── Extrai metadados da tabela de Identificação ──
  for (let i = 0; i < texts.length; i++) {
    const low = texts[i].toLowerCase()
    const next = texts[i + 1] || ''

    if (low === 'cenário empresarial' || low === 'cenario empresarial') {
      if (next && !next.match(/^(processo|identificação|identifica)/i)) {
        result.projectName = next
        result.titulo = next
      }
    } else if (low === 'processo') {
      if (next && !next.match(/^(identifica)/i)) {
        result.descricaoResumida = next.slice(0, 300)
      }
    }

    // Encerra busca de metadados ao chegar em Responsáveis
    if (low === 'responsáveis' || low === 'responsaveis') break
  }

  // ── Define seções por heading nomeado ──
  const SECTION_HEADINGS = {
    'descritivo do delta':                           'delta',
    'fluxo do processo':                             'fluxo',
    'racional de configuração':                      'racional',
    'racional de configuracao':                      'racional',
    'componentes requeridos por tipo de desenvolvimento': 'componentes',
    'impactos no desenvolvimento':                   'impactos',
    'tabelas z':                                     'tabelas_z',
    'volume de dados':                               'volume',
    'frequência de execução':                        'frequencia',
    'autorizações':                                  'autorizacoes',
    'autorizacoes':                                  'autorizacoes',
    'tratamento de erros':                           'erros',
    'especificação técnica':                         'spec_tec',
    'especificacao tecnica':                         'spec_tec',
  }

  // Seções que marcam fim do conteúdo funcional útil
  const STOP_HEADINGS = new Set([
    'sessão 1', 'sessao 1', 'sessão a', 'sessao a', 'sessão b', 'sessao b',
    'checklist de segurança', 'checklist de seguranca',
    'code inspector', 'aprovação', 'aprovacao'
  ])

  const sections = {}      // key → string[]
  const sectionRIds = {}   // key → string[]
  let currentKey = null

  for (let i = 0; i < paragraphs.length; i++) {
    const { text: p, rIds } = paragraphs[i]
    const low = p.trim().toLowerCase()

    if (STOP_HEADINGS.has(low)) break

    const sectionKey = SECTION_HEADINGS[low]
    if (sectionKey !== undefined) {
      currentKey = sectionKey
      if (!sections[currentKey]) { sections[currentKey] = []; sectionRIds[currentKey] = [] }
      continue
    }

    if (currentKey) {
      if (p.trim()) sections[currentKey].push(p.trim())
      if (rIds.length) sectionRIds[currentKey].push(...rIds)
    }
  }

  // ── Monta campos canônicos ──
  const deltaLines = [
    ...(sections.delta        || []),
    ...(sections.fluxo        || []),
    ...(sections.racional     || []),
  ]
  if (deltaLines.length) result.visaoGeral = deltaLines.join('\n')

  const specLines = [
    ...(sections.componentes  || []),
    ...(sections.impactos     || []),
    ...(sections.tabelas_z    || []),
  ]
  if (specLines.length) result.especificacaoFuncional = specLines.join('\n')

  if (!result.descricaoResumida && deltaLines.length) {
    result.descricaoResumida = deltaLines.slice(0, 4).join(' ').slice(0, 300)
  }

  // ── Coleta todos os rIds de imagem do documento ──
  const seen = new Set()
  for (const { rIds } of paragraphs) {
    for (const rId of rIds) {
      if (!seen.has(rId)) { seen.add(rId); result.efImageRIds.push(rId) }
    }
  }

  return result
}

// ─── Helper: Analisa seções da EF a partir dos parágrafos ─────────────────────
// paragraphs: array de { text: string, rIds: string[] }
// Retorna dados estruturados + efImageRIds (rIds das imagens de 3.1 e 3.2)
function parseEfSections(paragraphs) {
  const result = {
    projectName: '',
    empresa: '',
    titulo: '',
    descricaoResumida: '',
    visaoGeral: '',
    especificacaoFuncional: '',
    efImageRIds: []   // rIds de imagens encontradas em 3.1 e 3.2
  }

  const sections = {}      // secNum → string[]
  const sectionRIds = {}   // secNum → string[]
  let currentSection = null

  for (let i = 0; i < paragraphs.length; i++) {
    const { text: p, rIds } = paragraphs[i]
    const pUpper = p.toUpperCase().replace(/[^A-ZÁÉÍÓÚÃÕÇÀÂÊÎÔÛ\s]/g, '').trim()

    // Título principal da EF → próximo parágrafo não-numérico é o nome do projeto
    if (!result.projectName && (pUpper === 'ESPECIFICACAO FUNCIONAL' || pUpper === 'ESPECIFICAÇÃO FUNCIONAL')) {
      if (i + 1 < paragraphs.length && !paragraphs[i + 1].text.match(/^\d/)) {
        result.projectName = paragraphs[i + 1].text
      }
      continue
    }

    // Detecta marcadores de subseção tipo "1.1", "3.1", "3.2"
    const secMatch = p.match(/^(\d+\.\d+)[\s\t\.]/)
    if (secMatch) {
      currentSection = secMatch[1]
      if (!sections[currentSection]) { sections[currentSection] = []; sectionRIds[currentSection] = [] }
      continue
    }

    // Marcadores de seção de nível superior encerram a subseção atual
    if (p.match(/^\d+[\s\t\.]/) && currentSection) {
      currentSection = null
    }

    if (currentSection) {
      if (!sections[currentSection]) { sections[currentSection] = []; sectionRIds[currentSection] = [] }
      if (p) sections[currentSection].push(p)
      if (rIds.length) sectionRIds[currentSection].push(...rIds)
    }
  }

  // Seção 1.1 — Pedido Funcional
  if (sections['1.1']) {
    const block = sections['1.1'].join('\n')
    const empresaM = block.match(/empresa[:\s]+([^\n]+)/i)
    const tituloM  = block.match(/t[íi]tulo[:\s]+([^\n]+)/i)
    const descM    = block.match(/descri[çc][ãa]o[^:\n]*:[^\n]*(.*)/i)
    result.empresa = empresaM ? empresaM[1].trim() : ''
    result.titulo  = tituloM  ? tituloM[1].trim()  : ''
    result.descricaoResumida = descM ? descM[1].trim() : sections['1.1'].slice(0, 4).join(' ').slice(0, 300)
    if (!result.empresa) {
      for (let i = 0; i < sections['1.1'].length - 1; i++) {
        const lbl = sections['1.1'][i].toLowerCase()
        const val = sections['1.1'][i + 1]
        if (lbl.includes('empresa'))                              result.empresa = val
        else if (lbl.includes('título') || lbl.includes('titulo')) result.titulo = val
        else if (lbl.includes('descrição') || lbl.includes('descricao')) result.descricaoResumida = val
      }
    }
  }

  if (sections['3.1']) result.visaoGeral = sections['3.1'].join('\n')
  if (sections['3.2']) result.especificacaoFuncional = sections['3.2'].join('\n')

  // Coleta rIds únicos das seções visuais (3.1 + 3.2)
  const seen = new Set()
  for (const rId of [...(sectionRIds['3.1'] || []), ...(sectionRIds['3.2'] || [])]) {
    if (!seen.has(rId)) { seen.add(rId); result.efImageRIds.push(rId) }
  }

  return result
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.abapfy.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Window Controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window-close', () => mainWindow?.close())
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)

  // AI provider connectivity test (runs in main process — no CORS)
  ipcMain.handle('ai-test', async (_, { provider, apiKey, model }) => {
    try {
      if (provider === 'groq' || provider === 'openai') {
        const baseUrl = provider === 'groq'
          ? 'https://api.groq.com/openai/v1'
          : 'https://api.openai.com/v1'
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 })
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
        return { success: true }
      }
      if (provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] })
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
        return { success: true }
      }
      if (provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }] }) }
        )
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
        return { success: true }
      }
      throw new Error('Provider desconhecido')
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // AI code generation — full chat completion, strips thinking blocks
  ipcMain.handle('ai-generate', async (_, { provider, apiKey, model, systemPrompt, userMessage }) => {
    try {
      let raw = ''

      if (provider === 'groq' || provider === 'openai') {
        const baseUrl = provider === 'groq'
          ? 'https://api.groq.com/openai/v1'
          : 'https://api.openai.com/v1'
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userMessage }
            ],
            max_tokens: 8192,
            temperature: 0.2
          })
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
        const d = await res.json()
        raw = d.choices?.[0]?.message?.content || ''
      }

      else if (provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            max_tokens: 8192,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
          })
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
        const d = await res.json()
        raw = d.content?.[0]?.text || ''
      }

      else if (provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userMessage }] }],
              generationConfig: { maxOutputTokens: 8192, temperature: 0.2 }
            })
          }
        )
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`) }
        const d = await res.json()
        raw = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
      }

      else { throw new Error('Provider não suportado') }

      // Strip thinking blocks (Claude, Qwen, DeepSeek, etc.)
      raw = raw
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .trim()

      return { success: true, content: raw }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ─── Integration: Claude Code (agent SDK) or Codex CLI ─────────────────────
  ipcMain.handle('ai-generate-integration', async (_, { integrationType, systemPrompt, userMessage, programName, images: _images }) => {
    const safeName = (programName || 'ABAP_PROGRAM').replace(/[^a-zA-Z0-9_-]/g, '_')
    const outputDir = nodePath.join(app.getPath('documents'), 'Abapfy', safeName)

    console.log(`[AI-INTEGRATION] ► START | type=${integrationType} | program=${safeName}`)
    console.log(`[AI-INTEGRATION] outputDir=${outputDir}`)
    console.log(`[AI-INTEGRATION] userMessage (primeiros 200 chars): ${userMessage?.slice(0, 200)}`)

    // ── IMAGENS DESABILITADAS TEMPORARIAMENTE ─────────────────────────────────
    // TODO: reativar quando confirmar suporte do SDK a content arrays multimodais
    // const tempImagePaths = []
    // if (images?.length) { ... salvar em temp e referenciar no prompt ... }

    console.log(`[AI-INTEGRATION] ► START | type=${integrationType} | program=${safeName}`)
    console.log(`[AI-INTEGRATION] outputDir=${outputDir}`)
    console.log(`[AI-INTEGRATION] userMessage (primeiros 200 chars): ${userMessage?.slice(0, 200)}`)

    try {
      let rawContent = ''

      if (integrationType === 'agent') {
        // Claude Code via @anthropic-ai/claude-agent-sdk
        console.log('[AI-INTEGRATION] Importando @anthropic-ai/claude-agent-sdk...')
        let queryFn
        try {
          const sdk = await import('@anthropic-ai/claude-agent-sdk')
          queryFn = sdk.query
          console.log('[AI-INTEGRATION] SDK importado com sucesso. queryFn:', typeof queryFn)
        } catch (importErr) {
          console.error('[AI-INTEGRATION] ERRO ao importar SDK:', importErr.message)
          throw new Error('Claude Code SDK não encontrado. Execute: npm install -g @anthropic-ai/claude-code')
        }

        console.log('[AI-INTEGRATION] Iniciando query()...')
        let msgCount = 0

        for await (const message of queryFn({
          prompt: userMessage,
          options: {
            systemPrompt,
            allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
            permissionMode: 'acceptEdits'
          }
        })) {
          msgCount++
          console.log(`[AI-INTEGRATION] Mensagem #${msgCount} | type=${message?.type} | keys=${Object.keys(message || {}).join(',')}`)
          if (message && 'result' in message) {
            console.log('[AI-INTEGRATION] ✔ ResultMessage recebido')
            rawContent = message.result || ''
          }
          // Captura content/text para variações do SDK
          if (!rawContent && message?.content) {
            const content = Array.isArray(message.content)
              ? message.content.filter(b => b.type === 'text').map(b => b.text).join('')
              : String(message.content)
            if (content.trim()) rawContent = content
          }
        }
        console.log(`[AI-INTEGRATION] Claude finalizado. rawContent length=${rawContent.length}`)

      } else if (integrationType === 'codex') {
        // Codex CLI via subprocess
        console.log('[AI-INTEGRATION] Iniciando Codex CLI...')
        const fullPrompt = `${systemPrompt}\n\n${userMessage}`
        rawContent = await runCodexIntegration(fullPrompt)
        console.log(`[AI-INTEGRATION] Codex finalizado. rawContent length=${rawContent.length}`)

      } else {
        throw new Error(`Tipo de integração desconhecido: ${integrationType}`)
      }

      // Strip thinking blocks
      rawContent = rawContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
      console.log(`[AI-INTEGRATION] rawContent após strip (primeiros 300): ${rawContent.slice(0, 300)}`)

      // Salva arquivos ABAP em disco
      let savedTo = null
      try {
        savedTo = saveAbapFiles(rawContent, outputDir)
        console.log(`[AI-INTEGRATION] Arquivos salvos em: ${savedTo}`)
      } catch (saveErr) {
        console.warn('[AI-INTEGRATION] Falha ao salvar arquivos (não crítico):', saveErr.message)
      }

      console.log('[AI-INTEGRATION] ► SUCESSO')
      return { success: true, content: rawContent, savedTo }
    } catch (err) {
      console.error('[AI-INTEGRATION] ► ERRO:', err.message)
      console.error(err.stack)
      return { success: false, error: err.message }
    }
  })

  // ─── ABAP Validate: monta programa completo e valida sintaxe via SE38 ───────
  ipcMain.handle('abap-validate', async (_, { files, programName }) => {
    const scriptPath = is.dev
      ? nodePath.join(app.getAppPath(), 'src/renderer/src/scripts/sap_tester.py')
      : nodePath.join(process.resourcesPath, 'sap_tester.py')

    if (!fs.existsSync(scriptPath)) {
      return { success: false, error: `Script não encontrado: ${scriptPath}` }
    }

    const tmpFile = nodePath.join(os.tmpdir(), `abap_validate_${Date.now()}.json`)
    try {
      fs.writeFileSync(tmpFile, JSON.stringify({ files, programName }), 'utf-8')

      return await new Promise((resolve) => {
        // Usa shell: true com caminhos entre aspas para suportar espaços no path (Windows)
        const cmd = `python "${scriptPath}" --json "${tmpFile}"`
        const proc = spawn(cmd, [], {
          shell: true,
          env: { ...process.env }
        })

        let stdout = ''
        let stderr = ''
        proc.stdout.on('data', (d) => { stdout += d.toString() })
        proc.stderr.on('data', (d) => { stderr += d.toString() })

        proc.on('close', () => {
          try { fs.unlinkSync(tmpFile) } catch (_) {}
          try {
            const result = JSON.parse(stdout.trim())
            resolve({ success: true, result })
          } catch (e) {
            resolve({ success: false, error: stderr.trim() || stdout.trim() || 'Sem saída do script' })
          }
        })

        proc.on('error', (err) => {
          try { fs.unlinkSync(tmpFile) } catch (_) {}
          resolve({ success: false, error: `Falha ao iniciar Python: ${err.message}` })
        })
      })
    } catch (err) {
      try { fs.unlinkSync(tmpFile) } catch (_) {}
      return { success: false, error: err.message }
    }
  })

  // ─── Code Review: salva arquivos em disco para uso pelo CLI ────────────────
  ipcMain.handle('code-review-save-files', async (_, { sessionId, files }) => {
    try {
      const dir = nodePath.join(app.getPath('documents'), 'Abapfy', 'CodeReview', sessionId)
      fs.mkdirSync(dir, { recursive: true })
      for (const file of files) {
        fs.writeFileSync(nodePath.join(dir, file.name), file.content || '', 'utf-8')
      }
      console.log(`[CODE-REVIEW] Arquivos salvos em: ${dir}`)
      return { success: true, dir }
    } catch (err) {
      console.error('[CODE-REVIEW] Erro ao salvar arquivos:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ─── Code Review: retorna o diretório CLI de uma sessão ─────────────────────
  ipcMain.handle('code-review-get-dir', (_, { sessionId }) => {
    const dir = nodePath.join(app.getPath('documents'), 'Abapfy', 'CodeReview', sessionId)
    return { dir, exists: fs.existsSync(dir) }
  })

  // ─── Streaming AI para chat (Code Review e afins) ───────────────────────────
  // Usa ipcMain.on (não handle) para poder enviar múltiplos chunks de volta
  ipcMain.on('ai-stream-start', async (event, { provider, apiKey, model, systemPrompt, messages, maxTokens }) => {
    const send = (ch, data) => {
      if (!event.sender.isDestroyed()) event.sender.send(ch, data)
    }

    console.log(`[AI-STREAM] START | provider=${provider} | msgs=${messages?.length}`)

    try {
      if (provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: model || 'claude-sonnet-4-6',
            max_tokens: maxTokens || 8192,
            system: systemPrompt,
            messages,
            stream: true
          })
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e?.error?.message || `HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data) continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const text = parsed.delta.text || ''
                fullText += text
                send('ai-stream-chunk', { text })
              }
            } catch { /* ignore parse errors */ }
          }
        }
        console.log(`[AI-STREAM] DONE claude | length=${fullText.length}`)
        send('ai-stream-done', { fullText })

      } else if (provider === 'openai' || provider === 'groq') {
        const baseUrl = provider === 'groq'
          ? 'https://api.groq.com/openai/v1'
          : 'https://api.openai.com/v1'

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            max_tokens: maxTokens || 8192,
            temperature: 0.2,
            stream: true
          })
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e?.error?.message || `HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const text = parsed.choices?.[0]?.delta?.content || ''
              if (text) { fullText += text; send('ai-stream-chunk', { text }) }
            } catch { /* ignore */ }
          }
        }
        console.log(`[AI-STREAM] DONE ${provider} | length=${fullText.length}`)
        send('ai-stream-done', { fullText })

      } else if (provider === 'gemini') {
        const modelName = model || 'gemini-2.0-flash'
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              })),
              generationConfig: { maxOutputTokens: maxTokens || 8192, temperature: 0.2 }
            })
          }
        )
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e?.error?.message || `HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            try {
              const parsed = JSON.parse(data)
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
              if (text) { fullText += text; send('ai-stream-chunk', { text }) }
            } catch { /* ignore */ }
          }
        }
        console.log(`[AI-STREAM] DONE gemini | length=${fullText.length}`)
        send('ai-stream-done', { fullText })

      } else {
        throw new Error(`Provider "${provider}" não suportado para streaming`)
      }
    } catch (err) {
      console.error('[AI-STREAM] ERRO:', err.message)
      send('ai-stream-error', { error: err.message })
    }
  })

  // ─── Check if CLI tool is installed ────────────────────────────────────────
  ipcMain.handle('ai-check-cli', async (_, { tool }) => {
    return new Promise((resolve) => {
      const isAgent = tool === 'agent'
      const cmd  = isAgent ? 'claude' : 'codex'
      const args = ['--version']

      const proc = spawn(cmd, args, { shell: true, stdio: 'ignore' })
      proc.on('close', (code) => resolve({ installed: code === 0 }))
      proc.on('error', () => resolve({ installed: false }))
    })
  })

  // ─── Notificações nativas do SO ─────────────────────────────────────────────
  ipcMain.handle('show-notification', (_, { title, body, silent = false }) => {
    try {
      if (!Notification.isSupported()) return { success: false, error: 'Não suportado' }
      const n = new Notification({ title, body, silent })
      n.show()
      return { success: true }
    } catch (err) {
      console.warn('[NOTIFY]', err.message)
      return { success: false, error: err.message }
    }
  })

  // ─── EF: Gera documento DOCX a partir do template com substituição ──────────
  ipcMain.handle('ef-generate-doc', async (_, { replacements, projectName }) => {
    try {
      const templatePath = is.dev
        ? nodePath.join(process.cwd(), 'src/renderer/src/docs/MODELO BASE EF.docx')
        : nodePath.join(process.resourcesPath, 'MODELO BASE EF.docx')

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template não encontrado: ${templatePath}`)
      }

      const templateBuffer = fs.readFileSync(templatePath)
      const outputBuffer = replaceDocxText(templateBuffer, replacements)

      const safeName = (projectName || 'EF_SPEC')
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 60)

      const outputDir = nodePath.join(app.getPath('documents'), 'Abapfy', 'EspecificacoesFuncionais')
      fs.mkdirSync(outputDir, { recursive: true })

      const filename = `EF_${safeName}_${Date.now()}.docx`
      const outputPath = nodePath.join(outputDir, filename)
      fs.writeFileSync(outputPath, outputBuffer)

      console.log(`[EF-GENERATE] Documento gerado: ${outputPath}`)
      return { success: true, path: outputPath }
    } catch (err) {
      console.error('[EF-GENERATE] Erro:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ─── DTec: Gera DOCX estruturado sem template ───────────────────────────────
  ipcMain.handle('dtec-generate-doc', async (_, { content, objectName }) => {
    try {
      const buffer = buildDtecDocx(content, objectName)
      const safeName = (content.object_name || objectName || 'DTec')
        .replace(/[^a-zA-Z0-9À-ɏ\s_-]/g, '')
        .trim().replace(/\s+/g, '_').slice(0, 60)
      const outputDir = nodePath.join(app.getPath('documents'), 'Abapfy', 'DTec')
      fs.mkdirSync(outputDir, { recursive: true })
      const filename = `DTec_${safeName}_${Date.now()}.docx`
      const outputPath = nodePath.join(outputDir, filename)
      fs.writeFileSync(outputPath, buffer)
      console.log(`[DTEC-GENERATE] Documento gerado: ${outputPath}`)
      return { success: true, path: outputPath }
    } catch (err) {
      console.error('[DTEC-GENERATE] Erro:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ─── EF: Abre arquivo com o programa padrão do sistema ──────────────────────
  ipcMain.handle('ef-open-file', async (_, { path: filePath }) => {
    try {
      const result = await shell.openPath(filePath)
      if (result) throw new Error(result)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ─── EF: Abre diálogo, lê e parseia arquivo .docx/.doc de Especificação Funcional ─
  ipcMain.handle('ef-read-docx', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecionar Especificação Funcional',
        filters: [
          { name: 'Word Document', extensions: ['docx', 'doc'] }
        ],
        properties: ['openFile']
      })
      if (canceled || !filePaths.length) return { success: false, canceled: true }

      const filePath = filePaths[0]
      const ext = nodePath.extname(filePath).toLowerCase()

      // Formato .doc legado — não suportado para leitura direta
      if (ext === '.doc') {
        return {
          success: false,
          docLegacy: true,
          error: 'Arquivo .doc detectado. Abra no Word, vá em "Salvar como" e escolha o formato .docx, depois carregue o arquivo novamente.'
        }
      }

      const buffer = fs.readFileSync(filePath)
      const zip = new PizZip(buffer)
      const xmlFile = zip.file('word/document.xml')
      if (!xmlFile) throw new Error('Arquivo DOCX inválido: word/document.xml não encontrado')

      const xml = xmlFile.asText()
      const paragraphs = extractDocxParagraphs(xml)

      // Detecta formato e escolhe o parser correto
      const formato = detectEfFormat(paragraphs)
      const parsed = formato === 'delta'
        ? parseDeltaEfSections(paragraphs)
        : parseEfSections(paragraphs)

      // Mapeia rId → nome do arquivo via word/_rels/document.xml.rels
      const relMap = buildDocxRelMap(zip)

      // Para formato classic: apenas imagens de 3.1 e 3.2 (máx 10)
      // Para formato delta: todas as imagens do documento (máx 10)
      const images = []
      const SUPPORTED_EXT = new Set(['.png', '.jpg', '.jpeg'])
      const MAX_IMAGES = 10

      for (const rId of parsed.efImageRIds) {
        if (images.length >= MAX_IMAGES) break
        const fileName = relMap[rId]
        if (!fileName) continue
        const imgExt = nodePath.extname(fileName).toLowerCase()
        if (!SUPPORTED_EXT.has(imgExt)) continue
        const mediaFile = zip.file(`word/media/${fileName}`)
        if (!mediaFile) continue
        try {
          const base64 = mediaFile.asNodeBuffer().toString('base64')
          const mimeType = imgExt === '.png' ? 'image/png' : 'image/jpeg'
          images.push({ name: fileName, base64, mimeType })
        } catch (_) { /* ignora arquivo corrompido */ }
      }

      console.log(`[EF-READ-DOCX] formato=${formato}, ${paragraphs.length} parágrafos, ${images.length} imagem(ns)`)

      return {
        success: true,
        fileName: nodePath.basename(filePath),
        formato,
        data: parsed,
        rawText: paragraphs.map(p => p.text).filter(Boolean).join('\n'),
        images
      }
    } catch (err) {
      console.error('[EF-READ-DOCX] Erro:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ─── EF: Abre diálogo para selecionar programas ABAP existentes (.abap/.txt) ─
  ipcMain.handle('ef-pick-abap-files', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecionar Programas ABAP (contexto)',
        filters: [
          { name: 'ABAP / Text', extensions: ['abap', 'txt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      })
      if (canceled || !filePaths.length) return { success: false, canceled: true }

      const files = filePaths.map(fp => ({
        name: nodePath.basename(fp),
        content: fs.readFileSync(fp, 'utf-8')
      }))
      return { success: true, files }
    } catch (err) {
      console.error('[EF-PICK-ABAP] Erro:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ─── Versão do app ───────────────────────────────────────────────────────────
  ipcMain.handle('get-app-version', () => app.getVersion())

  // ─── Auto-updater: eventos → renderer ────────────────────────────────────────
  const sendUpdate = (channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendUpdate('update-checking', {})
  })
  autoUpdater.on('update-available', (info) => {
    sendUpdate('update-available', info)
    notify('⬆ Atualização disponível', `Abapfy v${info.version} está disponível`)
  })
  autoUpdater.on('update-not-available', (info) => {
    sendUpdate('update-not-available', info)
  })
  autoUpdater.on('download-progress', (progress) => {
    sendUpdate('update-download-progress', progress)
  })
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdate('update-downloaded', info)
    notify('✓ Atualização pronta', 'Reinicie o app para instalar a v' + info.version)
  })
  autoUpdater.on('error', (err) => {
    sendUpdate('update-error', { message: err.message })
  })

  // ─── Auto-updater: IPC handlers ───────────────────────────────────────────────
  ipcMain.handle('update-check', async () => {
    if (is.dev) return { success: false, dev: true, error: 'Auto-update desativado em modo desenvolvimento' }
    try {
      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('update-download', async () => {
    if (is.dev) return { success: false, dev: true }
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('update-install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  createWindow()

  // Verifica atualizações 4s após o app abrir (somente em produção)
  if (!is.dev) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
