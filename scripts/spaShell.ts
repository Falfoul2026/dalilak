// dist/404.html: an empty client-rendered shell. Cloudflare Pages serves it (with
// status 404) for any URL without a pre-rendered file, e.g. a business approved
// after the last build: the app then loads that page from Supabase in the browser.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function toSpaShell(html: string): string {
  const start = html.indexOf('<div id="root" data-server-rendered="true">')
  if (start < 0) throw new Error('[404] root element not found')
  // Layout: <div id="root" …>APP<script>window.__staticRouterHydrationData…</script></div>
  const hydStart = html.indexOf('<script>window.__staticRouterHydrationData', start)
  const hydEnd = html.indexOf('</script>', hydStart) + '</script>'.length
  const rootClose = html.indexOf('</div>', hydEnd)
  if (hydStart < 0 || rootClose < 0 || html.slice(hydEnd, rootClose).trim() !== '') {
    throw new Error('[404] unexpected HTML layout')
  }
  return html.slice(0, start) + '<div id="root"></div>' + html.slice(rootClose + '</div>'.length)
}

export async function writeSpaShell(dir: string) {
  const html = await readFile(join(dir, 'index.html'), 'utf8')
  await writeFile(join(dir, '404.html'), toSpaShell(html))
}
