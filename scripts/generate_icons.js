const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

function createIcoFromPngs(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type 1 = ICO
  header.writeUInt16LE(count, 4) // Number of images

  let offset = 6 + count * 16
  const dirEntries = []
  for (const img of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0)
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1)
    entry.writeUInt8(0, 2) // Color palette
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Color planes
    entry.writeUInt16LE(32, 6) // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8) // Size of image data
    entry.writeUInt32LE(offset, 12) // Offset of image data
    dirEntries.push(entry)
    offset += img.buffer.length
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(b => b.buffer)])
}

async function main() {
  const sourceImage = path.join(__dirname, '../public/logo.png')
  console.log('Source du logo :', sourceImage)

  // 1. Extraire et rogner l'emblème rouge et or pour supprimer le surplus transparent
  const emblemPipeline = sharp(sourceImage).trim()

  // 2. Générer icon-512.png (512x512 avec padding de 10% pour l'harmonie PWA)
  const icon512 = await emblemPipeline
    .clone()
    .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 36,
      bottom: 36,
      left: 36,
      right: 36,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()

  // 3. Générer icon.png (192x192)
  const icon192 = await emblemPipeline
    .clone()
    .resize(164, 164, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 14,
      bottom: 14,
      left: 14,
      right: 14,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()

  // 4. Générer les formats 48x48 et 32x32 pour le favicon multi-résolution
  const icon48 = await emblemPipeline
    .clone()
    .resize(44, 44, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const icon32 = await emblemPipeline
    .clone()
    .resize(30, 30, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 1, bottom: 1, left: 1, right: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const icon16 = await emblemPipeline
    .clone()
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const icoBuffer = createIcoFromPngs([
    { width: 48, height: 48, buffer: icon48 },
    { width: 32, height: 32, buffer: icon32 },
    { width: 16, height: 16, buffer: icon16 }
  ])

  // 5. Sauvegarder dans tous les chemins cibles requis
  // public/icon.png
  fs.writeFileSync(path.join(__dirname, '../public/icon.png'), icon192)
  console.log('✅ public/icon.png généré (192x192)')

  // public/icon-512.png
  fs.writeFileSync(path.join(__dirname, '../public/icon-512.png'), icon512)
  console.log('✅ public/icon-512.png généré (512x512)')

  // src/app/icon.png
  fs.writeFileSync(path.join(__dirname, '../src/app/icon.png'), icon192)
  console.log('✅ src/app/icon.png généré (192x192)')

  // src/app/apple-icon.png
  fs.writeFileSync(path.join(__dirname, '../src/app/apple-icon.png'), icon192)
  console.log('✅ src/app/apple-icon.png généré (192x192)')

  // public/icones/icone-192.png & 512.png
  fs.writeFileSync(path.join(__dirname, '../public/icones/icone-192.png'), icon192)
  fs.writeFileSync(path.join(__dirname, '../public/icones/icone-512.png'), icon512)
  console.log('✅ public/icones/icone-192.png & 512.png mis à jour')

  // src/app/favicon.ico & public/favicon.ico
  fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), icoBuffer)
  fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), icoBuffer)
  console.log('✅ src/app/favicon.ico & public/favicon.ico générés au format multi-résolution (16, 32, 48px)')
}

main().catch(err => {
  console.error('Erreur génération icônes:', err)
  process.exit(1)
})
