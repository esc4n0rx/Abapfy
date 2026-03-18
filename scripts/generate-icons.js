/**
 * Gera resources/icon.ico a partir de resources/icon.png
 * Executado como passo pre-build pelo GitHub Actions e localmente.
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.join(__dirname, '..')
const src  = path.join(root, 'resources', 'icon.png')

if (!fs.existsSync(src)) {
  console.error('[generate-icons] resources/icon.png não encontrado.')
  process.exit(1)
}

// Instala png-to-ico sob demanda se necessário
try {
  require.resolve('png-to-ico')
} catch {
  console.log('[generate-icons] Instalando png-to-ico...')
  execSync('npm install --no-save png-to-ico', { cwd: root, stdio: 'inherit' })
}

const pngToIco = require('png-to-ico')

pngToIco(src)
  .then((buf) => {
    const dest = path.join(root, 'resources', 'icon.ico')
    fs.writeFileSync(dest, buf)
    console.log(`[generate-icons] icon.ico gerado em ${dest}`)
  })
  .catch((err) => {
    console.error('[generate-icons] Erro:', err.message)
    process.exit(1)
  })
