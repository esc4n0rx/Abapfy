/**
 * Gera resources/icon.ico a partir de resources/icon.png
 * Execute manualmente ao atualizar o ícone: npm run generate-icons
 * IMPORTANTE: resources/icon.png deve ser uma imagem QUADRADA (ex: 512x512).
 */
const path = require('path')
const fs = require('fs')

const root = path.join(__dirname, '..')
const src  = path.join(root, 'resources', 'icon.png')

if (!fs.existsSync(src)) {
  console.error('[generate-icons] resources/icon.png não encontrado.')
  process.exit(1)
}

const _mod = require('png-to-ico')
const pngToIco = typeof _mod === 'function' ? _mod : (_mod.default ?? _mod)

pngToIco(src)
  .then((buf) => {
    const dest = path.join(root, 'resources', 'icon.ico')
    fs.writeFileSync(dest, buf)
    console.log(`[generate-icons] icon.ico gerado: ${dest}`)
  })
  .catch((err) => {
    console.error('[generate-icons] Erro:', err.message)
    process.exit(1)
  })
