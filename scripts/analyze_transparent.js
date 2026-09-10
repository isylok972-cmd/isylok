const sharp = require('sharp')

async function main() {
  const { data, info } = await sharp('public/logo-transparent.png').raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  // Pour chaque ligne Y, trouver minX, maxX et pixels actifs
  const rows = []
  for (let y = 0; y < height; y++) {
    let count = 0
    let minX = width, maxX = 0
    let rSum = 0, gSum = 0, bSum = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const a = data[idx + 3]
      if (a > 10) {
        count++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        rSum += data[idx]
        gSum += data[idx + 1]
        bSum += data[idx + 2]
      }
    }
    if (count > 0) {
      rows.push({
        y, count, minX, maxX, width: maxX - minX + 1,
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count)
      })
    }
  }

  console.log('Active rows in logo-transparent:', rows.length)
  console.log('Y range:', rows[0].y, '->', rows[rows.length - 1].y)

  // Chercher des discontinuités en Y
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i + 1].y - rows[i].y > 1) {
      console.log('Vertical gap from Y =', rows[i].y, 'to', rows[i + 1].y, 'gap =', rows[i + 1].y - rows[i].y)
    }
  }

  // Afficher des échantillons
  console.log('\nÉchantillons de lignes :')
  for (let i = 0; i < rows.length; i += 8) {
    const r = rows[i]
    console.log(`y=${r.y} w=${r.width} [${r.minX}..${r.maxX}] count=${r.count} rgb=(${r.r},${r.g},${r.b})`)
  }
}

main().catch(console.error)
