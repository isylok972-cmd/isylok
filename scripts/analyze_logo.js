const sharp = require('sharp')

async function main() {
  const { data, info } = await sharp('public/logo.png').raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const rowStats = []
  for (let y = 0; y < height; y++) {
    let nonTrans = 0
    let rSum = 0, gSum = 0, bSum = 0
    let minX = width, maxX = 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels
      const a = data[idx + 3]
      if (a > 20) {
        nonTrans++
        rSum += data[idx]
        gSum += data[idx + 1]
        bSum += data[idx + 2]
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    if (nonTrans > 0) {
      rowStats.push({
        y,
        count: nonTrans,
        minX,
        maxX,
        width: maxX - minX,
        rAvg: Math.round(rSum / nonTrans),
        gAvg: Math.round(gSum / nonTrans),
        bAvg: Math.round(bSum / nonTrans)
      })
    }
  }

  console.log('Total active rows:', rowStats.length)
  console.log('First row y:', rowStats[0]?.y, 'Last row y:', rowStats[rowStats.length - 1]?.y)

  // Chercher des variations nettes de largeur ou de couleur ou des gaps
  for (let i = 0; i < rowStats.length - 1; i++) {
    const diff = rowStats[i + 1].y - rowStats[i].y
    if (diff > 2) {
      console.log('Vertical gap at y =', rowStats[i].y, 'to', rowStats[i + 1].y, 'gap =', diff)
    }
  }

  // Regarder le profil de largeur
  console.log('\nProfil par tranche de 50 lignes :')
  for (let i = 0; i < rowStats.length; i += 30) {
    const s = rowStats[i]
    console.log(`y=${s.y} width=${s.width} [${s.minX} -> ${s.maxX}] count=${s.count} rgb=(${s.rAvg},${s.gAvg},${s.bAvg})`)
  }
}

main().catch(console.error)
