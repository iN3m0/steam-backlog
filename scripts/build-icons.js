const sharp = require('sharp')
const { default: pngToIco } = require('png-to-ico')
const path = require('path')
const fs = require('fs')

async function main() {
  const svgPath  = path.join(__dirname, '../build/icon.svg')
  const pngPath  = path.join(__dirname, '../build/icon.png')
  const icoPath  = path.join(__dirname, '../build/icon.ico')

  await sharp(svgPath).resize(512, 512).png().toFile(pngPath)
  console.log('  icon.png generated')

  const icoBuffer = await pngToIco([pngPath])
  fs.writeFileSync(icoPath, icoBuffer)
  console.log('  icon.ico generated')
}

main().catch(err => {
  console.error('Icon build failed:', err.message)
  process.exit(1)
})
