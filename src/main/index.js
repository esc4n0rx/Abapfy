import { app, BrowserWindow, ipcMain, shell, Notification } from 'electron'
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

    const proc = spawn('npx', args, {
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
  ipcMain.handle('ai-generate-integration', async (_, { integrationType, systemPrompt, userMessage, programName }) => {
    const safeName = (programName || 'ABAP_PROGRAM').replace(/[^a-zA-Z0-9_-]/g, '_')
    const outputDir = nodePath.join(app.getPath('documents'), 'Abapfy', safeName)

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
  ipcMain.on('ai-stream-start', async (event, { provider, apiKey, model, systemPrompt, messages }) => {
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
            max_tokens: 8192,
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
            max_tokens: 8192,
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
              generationConfig: { maxOutputTokens: 8192, temperature: 0.2 }
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
      const cmd  = isAgent ? 'claude' : 'npx'
      const args = isAgent ? ['--version'] : ['codex', '--version']

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
