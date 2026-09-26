import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

const TABLES = [
  'customers',
  'invoices',
  'response_packages',
  'subscriptions',
  'survey_responses',
]

// Lokaler WASM-Modus: nur BigInt → Number nötig (Arrow liefert native JS-Typen)
function normalizeWasm(row) {
  const out = {}
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === 'bigint' ? Number(value) : value
  }
  return out
}

// MotherDuck-Modus: BigInt + spezielle DuckDB-Objekte (DATE, DECIMAL) konvertieren
function normalizeMD(row) {
  const out = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'bigint') {
      out[key] = Number(value)
    } else if (value !== null && value !== undefined && typeof value === 'object' && !(value instanceof Date)) {
      const str = String(value)
      const num = Number(str)
      out[key] = Number.isNaN(num) ? str : num
    } else {
      out[key] = value
    }
  }
  return out
}

export async function rows(conn, sql) {
  if (typeof conn.evaluateQuery === 'function') {
    // MotherDuck: Tabellen liegen in pulscheck.main.*, queries.js referenziert pulscheck.*
    const result = await conn.evaluateQuery(sql.replace(/\bpulscheck\./g, 'main.'))
    return result.data.toRows().map(normalizeMD)
  }
  const result = await conn.query(sql)
  return result.toArray().map((row) => normalizeWasm(row.toJSON()))
}

export async function initDuckDB(onProgress) {
  const token = window.MOTHERDUCK_TOKEN

  if (token) {
    const { MDConnection } = await import('@motherduck/wasm-client')
    onProgress?.('Verbinde mit MotherDuck …')
    const conn = MDConnection.create({ mdToken: token })
    await conn.isInitialized()
    await conn.evaluateQuery('USE pulscheck')
    return { db: null, conn }
  }

  // Lokaler WASM-Modus (npm run dev)
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: duckdb_wasm, mainWorker: mvp_worker },
    eh: { mainModule: duckdb_wasm_eh, mainWorker: eh_worker },
  })
  const worker = new Worker(bundle.mainWorker)
  const db = new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING),
    worker,
  )
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  const conn = await db.connect()
  await conn.query('create schema pulscheck')
  for (const t of TABLES) {
    onProgress?.(`Lade ${t}.parquet …`)
    const res = await fetch(`data/${t}.parquet`)
    if (!res.ok) throw new Error(`Fetch fehlgeschlagen: data/${t}.parquet (${res.status})`)
    await db.registerFileBuffer(t + '.parquet', new Uint8Array(await res.arrayBuffer()))
    await conn.query(`create view pulscheck.${t} as select * from read_parquet('${t}.parquet')`)
  }
  return { db, conn }
}
