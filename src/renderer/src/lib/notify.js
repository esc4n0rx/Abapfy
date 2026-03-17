/**
 * Dispara uma notificação nativa do SO via Electron IPC.
 * Falha silenciosamente — nunca quebra o fluxo principal.
 *
 * @param {string} title  Título da notificação
 * @param {string} body   Corpo / descrição
 * @param {boolean} silent  Sem som (default: false)
 */
export async function notify(title, body = '', silent = false) {
  try {
    await window.api.notify({ title, body, silent })
  } catch {
    // ignora — notificação é best-effort
  }
}
