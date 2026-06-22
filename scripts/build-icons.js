const sharp = require('sharp')
const { default: pngToIco } = require('png-to-ico')
const path = require('path')
const fs = require('fs')
const os = require('os')

async function main() {
  const svgPath = path.join(__dirname, '../build/icon.svg')
  const buildDir = path.join(__dirname, '../build')

  // 512x512 PNG for electron-builder and display
  await sharp(svgPath).resize(512, 512).png().toFile(path.join(buildDir, 'icon.png'))
  console.log('  icon.png generated')

  // Multi-size ICO required by NSIS (16, 32, 48, 256)
  const tmpDir = os.tmpdir()
  const sizes = [16, 32, 48, 256]
  const pngPaths = []
  for (const size of sizes) {
    const p = path.join(tmpDir, `icon-${size}.png`)
    await sharp(svgPath).resize(size, size).png().toFile(p)
    pngPaths.push(p)
  }

  const icoBuffer = await pngToIco(pngPaths)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
  console.log('  icon.ico generated (16, 32, 48, 256px)')
}

main().catch(err => {
  console.error('Icon build failed:', err.message)
  process.exit(1)
})
