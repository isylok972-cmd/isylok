const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

function createIcoFromPngs(pngBuffers) {
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

async function createEmblemIcon(emblemBuffer, targetCanvasSize, paddingPercent = 0.12) {
  const innerSize = Math.round(targetCanvasSize * (1 - paddingPercent * 2))
  
  // Redimensionner l'emblème en conservant son ratio d'aspect
  const resized = await sharp(emblemBuffer)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3
    })
    .toBuffer({ resolveWithObject: true })

  const top = Math.floor((targetCanvasSize - resized.info.height) / 2)
  const bottom = targetCanvasSize - resized.info.height - top
  const left = Math.floor((targetCanvasSize - resized.info.width) / 2)
  const right = targetCanvasSize - resized.info.width - left

  // Étendre sur un canevas carré avec un fond 100% transparent
  return sharp(resized.data)
    .extend({
      top,
      bottom,
      left,
      right,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  const sourcePath = path.join(__dirname, '../public/logo-transparent.png')
  console.log('Extraction depuis logo source transparent :', sourcePath)

  // 1. Extraire UNIQUEMENT l'emblème rouge et or (sans le texte ISY LOK qui se trouve sous Y=240)
  // Bounding box exacte de l'emblème : minX: 262, minY: 83, width: 153, height: 147
  const emblemBuffer = await sharp(sourcePath)
    .extract({ left: 262, top: 83, width: 153, height: 147 })
    .png()
    .toBuffer()

  console.log('✅ Emblème rouge et or extrait (153x147 sans texte ISY LOK)')

  // 2. Générer icon-512.png (512x512 avec ~12% de padding respirant, 100% transparent)
  const icon512 = await createEmblemIcon(emblemBuffer, 512, 0.12)

  // 3. Générer icon.png (192x192 avec ~12% de padding respirant, 100% transparent)
  const icon192 = await createEmblemIcon(emblemBuffer, 192, 0.12)

  // 4. Générer les formats pour favicon.ico (16, 32, 48px)
  const icon48 = await createEmblemIcon(emblemBuffer, 48, 0.10)
  const icon32 = await createEmblemIcon(emblemBuffer, 32, 0.08)
  const icon16 = await createEmblemIcon(emblemBuffer, 16, 0.05)

  const icoBuffer = createIcoFromPngs([
    { width: 48, height: 48, buffer: icon48 },
    { width: 32, height: 32, buffer: icon32 },
    { width: 16, height: 16, buffer: icon16 }
  ])

  // 5. Écrire tous les fichiers cibles demandés
  // public/icon.png (192x192)
  fs.writeFileSync(path.join(__dirname, '../public/icon.png'), icon192)
  console.log('✅ public/icon.png (192x192 transparent)')

  // public/icon-512.png (512x512)
  fs.writeFileSync(path.join(__dirname, '../public/icon-512.png'), icon512)
  console.log('✅ public/icon-512.png (512x512 transparent)')

  // src/app/icon.png (192x192)
  fs.writeFileSync(path.join(__dirname, '../src/app/icon.png'), icon192)
  console.log('✅ src/app/icon.png (192x192 transparent)')

  // src/app/apple-icon.png (192x192)
  fs.writeFileSync(path.join(__dirname, '../src/app/apple-icon.png'), icon192)
  console.log('✅ src/app/apple-icon.png (192x192 transparent)')

  // public/icones/icone-192.png & icone-512.png
  fs.writeFileSync(path.join(__dirname, '../public/icones/icone-192.png'), icon192)
  fs.writeFileSync(path.join(__dirname, '../public/icones/icone-512.png'), icon512)
  console.log('✅ public/icones/icone-192.png et icone-512.png mis à jour')

  // public/favicon.ico & src/app/favicon.ico
  fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), icoBuffer)
  fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), icoBuffer)
  console.log('✅ public/favicon.ico et src/app/favicon.ico générés (format multi-résolution 16/32/48)')

  // 6. Vérification de la transparence des coins
  const test512 = await sharp(icon512).raw().toBuffer({ resolveWithObject: true })
  const cornerAlpha = test512.data[3] // Pixel (0,0) canal alpha
  const centerIdx = (256 * 512 + 256) * test512.info.channels
  const centerAlpha = test512.data[centerIdx + 3]
  console.log(`Vérification : Coin Alpha = ${cornerAlpha} (attendu: 0 transparent), Centre Alpha = ${centerAlpha} (attendu: > 200 plein)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
