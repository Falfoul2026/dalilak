// Renders the PWA / store icons from the logo SVG with the pre-installed Chromium.
const { chromium } = require('playwright')
;(async () => {
const mark = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${64 + 2 * pad} ${64 + 2 * pad}">
<rect x="${-pad}" y="${-pad}" width="${64 + 2 * pad}" height="${64 + 2 * pad}" fill="#0b5d5b"/>
<path d="M32 12c-8.3 0-15 6.5-15 14.6C17 38 32 52 32 52s15-14 15-25.4C47 18.5 40.3 12 32 12z" fill="#fff"/>
<circle cx="32" cy="26.5" r="6.5" fill="#e49b2d"/></svg>`
const out = [
  ['public/icons/icon-192.png', 192, 4],
  ['public/icons/icon-512.png', 512, 4],
  ['public/icons/maskable-512.png', 512, 16],
  ['public/icons/apple-touch-icon.png', 180, 6],
]
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const [file, size, pad] of out) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0">${mark(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: file, omitBackground: false })
  console.log(file)
}
await browser.close()
})()
