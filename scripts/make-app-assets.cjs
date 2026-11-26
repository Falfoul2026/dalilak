// Renders the Android icon/splash sources (assets/) and Play Store graphics (store/)
// with the pre-installed Chromium. Then: npx @capacitor/assets generate --android
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
// embedded as data URLs: a page set with setContent() may not load file:// fonts
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.resolve('node_modules/@fontsource/cairo/files', f)).toString('base64')
const css = `@font-face{font-family:Cairo;font-weight:700;src:url(${font('cairo-arabic-700-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF}
@font-face{font-family:Cairo;font-weight:700;src:url(${font('cairo-latin-700-normal.woff2')}) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Cairo,sans-serif}`
const pin = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><path d="M32 12c-8.3 0-15 6.5-15 14.6C17 38 32 52 32 52s15-14 15-25.4C47 18.5 40.3 12 32 12z" fill="#fff"/><circle cx="32" cy="26.5" r="6.5" fill="#e49b2d"/></svg>`
const TEAL = '#0b5d5b'
const jobs = [
  // full icon (legacy launchers): teal square, pin
  ['assets/icon-only.png', 1024, 1024, `<div style="width:1024px;height:1024px;background:${TEAL};display:grid;place-items:center">${pin(900)}</div>`, false],
  // adaptive icon: pin inside the 66% safe zone on transparent
  ['assets/icon-foreground.png', 1024, 1024, `<div style="width:1024px;height:1024px;display:grid;place-items:center">${pin(640)}</div>`, true],
  ['assets/icon-background.png', 1024, 1024, `<div style="width:1024px;height:1024px;background:${TEAL}"></div>`, false],
  // splash: teal, pin and name
  ...['assets/splash.png', 'assets/splash-dark.png'].map((f) => [f, 2732, 2732, `<div style="width:2732px;height:2732px;background:${TEAL};display:grid;place-items:center"><div style="display:grid;justify-items:center;gap:20px">${pin(520)}<div style="color:#fff;font-size:200px;font-weight:700;line-height:1">دليلك</div></div></div>`, false]),
  // Play Store
  ['store/play-icon-512.png', 512, 512, `<div style="width:512px;height:512px;background:${TEAL};display:grid;place-items:center">${pin(450)}</div>`, false],
  ['store/feature-graphic-1024x500.png', 1024, 500, `<div dir="rtl" style="width:1024px;height:500px;background:${TEAL};display:flex;align-items:center;justify-content:center;gap:48px;color:#fff">
     ${pin(260)}<div><div style="font-size:120px;font-weight:700;line-height:1.1">دليلك</div>
     <div style="font-size:40px;font-weight:700;color:#fbedd6">دليل الجالية العربية في بلجيكا</div>
     <div style="font-size:30px;margin-top:10px;opacity:.9">مطاعم · ملاحم حلال · أطباء · مساجد · بيع وشراء</div></div></div>`, false],
]
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ deviceScaleFactor: 1 })
  for (const [file, w, h, body, transparent] of jobs) {
    await p.setViewportSize({ width: w, height: h })
    await p.setContent(`<html><head><style>${css}html,body{background:${transparent ? 'transparent' : TEAL}}</style></head><body>${body}</body></html>`)
    await p.evaluate(async () => { await document.fonts.load('700 40px Cairo', 'دليلك'); await document.fonts.ready })
    await p.screenshot({ path: file, omitBackground: transparent })
    console.log(file)
  }
  await b.close()
})()
