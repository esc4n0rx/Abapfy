import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // ─── Window ────────────────────────────────────────────────────────────────
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // ─── AI (request-response) ─────────────────────────────────────────────────
  testAI: (payload) => ipcRenderer.invoke('ai-test', payload),
  generateAI: (payload) => ipcRenderer.invoke('ai-generate', payload),
  generateIntegration: (payload) => ipcRenderer.invoke('ai-generate-integration', payload),
  checkCli: (payload) => ipcRenderer.invoke('ai-check-cli', payload),

  // ─── AI Streaming (for Code Review chat) ──────────────────────────────────
  streamStart: (payload) => ipcRenderer.send('ai-stream-start', payload),
  onStreamChunk: (cb) => ipcRenderer.on('ai-stream-chunk', (_, data) => cb(data)),
  onStreamDone: (cb) => ipcRenderer.on('ai-stream-done', (_, data) => cb(data)),
  onStreamError: (cb) => ipcRenderer.on('ai-stream-error', (_, data) => cb(data)),
  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('ai-stream-chunk')
    ipcRenderer.removeAllListeners('ai-stream-done')
    ipcRenderer.removeAllListeners('ai-stream-error')
  },

  // ─── ABAP Validate via SAP GUI Scripting ───────────────────────────────────
  validateAbap: (payload) => ipcRenderer.invoke('abap-validate', payload),

  // ─── Code Review file helpers ──────────────────────────────────────────────
  saveReviewFiles: (payload) => ipcRenderer.invoke('code-review-save-files', payload),
  getReviewDir: (payload) => ipcRenderer.invoke('code-review-get-dir', payload),

  // ─── Especificações Funcionais ──────────────────────────────────────────────
  generateEfDoc: (payload) => ipcRenderer.invoke('ef-generate-doc', payload),
  openEfFile: (payload) => ipcRenderer.invoke('ef-open-file', payload),
  readEfDocx: () => ipcRenderer.invoke('ef-read-docx'),
  pickAbapFiles: () => ipcRenderer.invoke('ef-pick-abap-files'),

  // ─── Notificações nativas ───────────────────────────────────────────────────
  notify: (payload) => ipcRenderer.invoke('show-notification', payload),

  // ─── Auto-updater ───────────────────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdate: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: () => ipcRenderer.invoke('update-download'),
  installUpdate: () => ipcRenderer.invoke('update-install'),
  onUpdateChecking:     (cb) => ipcRenderer.on('update-checking',          (_, d) => cb(d)),
  onUpdateAvailable:    (cb) => ipcRenderer.on('update-available',         (_, d) => cb(d)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available',     (_, d) => cb(d)),
  onUpdateProgress:     (cb) => ipcRenderer.on('update-download-progress', (_, d) => cb(d)),
  onUpdateDownloaded:   (cb) => ipcRenderer.on('update-downloaded',        (_, d) => cb(d)),
  onUpdateError:        (cb) => ipcRenderer.on('update-error',             (_, d) => cb(d)),
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-checking')
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-not-available')
    ipcRenderer.removeAllListeners('update-download-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
    ipcRenderer.removeAllListeners('update-error')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.api = api
}
