// npm run import                 -> upsert into the database at DATABASE_URL
// npm run import -- --sql FILE   -> only write the SQL (to paste in the Supabase SQL editor)
// npm run import -- --data PATH  -> use another data file (default data/dalilak-data.json)
import { readFileSync, writeFileSync } from 'node:fs'
import { buildImportSql, mapAll, type RawEntry } from './lib/mapData.ts'

const args = process.argv.slice(2)
const opt = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const dataPath = opt('--data') ?? 'data/dalilak-data.json'
const sqlOut = opt('--sql')

const rows = mapAll(JSON.parse(readFileSync(dataPath, 'utf8')) as RawEntry[])
const sql = buildImportSql(rows)
const unverified = rows.filter((r) => !r.language_verified).length

if (sqlOut) {
  writeFileSync(sqlOut, sql)
  console.log(`wrote ${sqlOut}: ${rows.length} listings (${unverified} with Arabic not confirmed)`)
} else {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set. Put it in .env or use: npm run import -- --sql import.sql')
    process.exit(1)
  }
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(sql)
    const { rows: [c] } = await client.query('select count(*)::int as n from public.listings')
    console.log(`imported ${rows.length} listings (${unverified} with Arabic not confirmed); table now has ${c.n}`)
  } finally {
    await client.end()
  }
}
