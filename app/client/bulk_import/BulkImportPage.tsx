import { useEffect, useState } from "react"
import { AI_QUERY_MAX_LENGTH } from "../bookshelf/AddBar"
import useAiSearch from "../bookshelf/useAiSearch"
import useShelfPhotoScan from "../bookshelf/useShelfPhotoScan"
import BulkSelectList from "./BulkSelectList"
import useBulkRows, { MAX_BULK_BOOKS, type BulkSource, type Selected } from "./useBulkRows"

export type BulkImportKind = "photo" | "series"

const TITLES: Record<BulkImportKind, string> = { photo: "本棚の写真から", series: "シリーズを探す" }
const CONFIRM_PATHS: Record<BulkImportKind, string> = { photo: "/bulk_imports/photos/confirm", series: "/bulk_imports/series/confirm" }
const STEPS = ["読み取って選ぶ", "確認する", "登録完了"]

const csrfToken = (): string => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""

function postToConfirmation(kind: BulkImportKind, selected: Selected[]): void {
  const form = document.createElement("form")
  form.method = "post"
  form.action = CONFIRM_PATHS[kind]
  const add = (name: string, value: string) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = name
    input.value = value
    form.append(input)
  }
  add("authenticity_token", csrfToken())
  selected.forEach(({ attributes }, index) => {
    if (attributes.book_id) add(`user_shelf_items[${index}][book_id]`, String(attributes.book_id))
    if (attributes.isbn13) add(`user_shelf_items[${index}][isbn13]`, attributes.isbn13)
    if (attributes.title) add(`user_shelf_items[${index}][title]`, attributes.title)
    if (attributes.author) add(`user_shelf_items[${index}][author]`, attributes.author)
    attributes.tags?.forEach(tag => add(`user_shelf_items[${index}][tags][]`, tag))
  })
  document.body.append(form)
  form.submit()
}

export default function BulkImportPage({ kind }: { kind: BulkImportKind }) {
  const [source, setSource] = useState<BulkSource | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [query, setQuery] = useState("")
  const bulk = useBulkRows(source)
  const series = useAiSearch()
  const photo = useShelfPhotoScan(lines => setSource({ kind: "lines", lines: lines.slice(0, MAX_BULK_BOOKS) }))

  useEffect(() => { if (photo.state.error) setError(photo.state.error) }, [photo.state.error])

  useEffect(() => {
    const { status, books, error: searchError } = series.state
    if (status === "succeeded" && books.length) setSource({ kind: "books", books: books.slice(0, MAX_BULK_BOOKS) })
    else if (status === "succeeded") setError("シリーズの本が見つかりませんでした。書名を変えて試してください")
    else if (status === "failed") setError(searchError ?? "シリーズを探せませんでした")
    if (status === "succeeded" || status === "failed") series.reset()
  }, [series.state.status])

  const working = photo.state.status === "reading" || series.state.status === "pending"

  function read() {
    setError(null)
    if (kind === "photo" && file) photo.start(file)
    else if (kind === "series" && query.trim()) series.start(query.trim())
  }

  function cancel() {
    photo.cancel()
    series.reset()
  }

  return (
    <section className="grid gap-3.5" aria-labelledby="bulk-import-title">
      <h2 className="m-0 font-display text-[22px]" id="bulk-import-title">{TITLES[kind]}</h2>
      <ol className="bulk-steps">
        {STEPS.map((label, index) => (
          <li key={label} className={`bulk-step ${index === 0 ? "bulk-step-current" : ""}`} aria-current={index === 0 ? "step" : undefined}>{label}</li>
        ))}
      </ol>
      {error && <div className="banner" role="alert">{error}</div>}

      <form className="bulk-panel" onSubmit={e => { e.preventDefault(); read() }}>
        {kind === "photo" ? (
          <>
            <p className="bulk-lead">背表紙が写った本棚の写真を選んで「読み取る」を押してください。写真は読み取りが終わるとすぐに消します。</p>
            <input type="file" accept="image/*" className="w-full min-w-0" aria-label="本棚の写真" disabled={working} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </>
        ) : (
          <>
            <p className="bulk-lead">「とあるシリーズ一通り」「ハリポタ全巻」のように書いて「探す」を押してください。AI がシリーズの本を本のマスタから探します。</p>
            <input
              type="text" className="input-box px-3 py-2.5" value={query} maxLength={AI_QUERY_MAX_LENGTH} spellCheck={false} autoFocus disabled={working}
              placeholder="とあるシリーズ一通り" aria-label="探したいシリーズ" onChange={e => setQuery(e.target.value)}
            />
          </>
        )}
        {working ? (
          <div className="bulk-actions">
            <span className="mr-auto text-[13px] text-muted" role="status">
              <span className="spinner" aria-hidden="true" /> {kind === "photo" ? "背表紙から書名を読み取っています。30秒ほどかかることがあります" : "シリーズを探しています。10秒ほどかかることがあります"}
            </span>
            <button className="btn" type="button" onClick={cancel}>やめる</button>
          </div>
        ) : (
          <div className="bulk-actions">
            <a className="btn-link" href="/">本棚へ戻る</a>
            <button className={source ? "btn" : "btn-primary"} type="submit" disabled={kind === "photo" ? !file : !query.trim()}>
              {kind === "photo" ? (source ? "読み取り直す" : "読み取る") : (source ? "探し直す" : "探す")}
            </button>
          </div>
        )}
      </form>

      {source && (
        <div className="grid gap-3.5">
          <p className="bulk-lead">登録する本にチェックを付けてください。本棚にある本は外してあります。{kind === "photo" && "違う版は選び直せます。"}</p>
          <div className="flex gap-2">
            <button className="btn btn-small" type="button" disabled={bulk.pending > 0} onClick={() => bulk.setAll(true)}>全部選ぶ</button>
            <button className="btn btn-small" type="button" disabled={bulk.pending > 0} onClick={() => bulk.setAll(false)}>全部外す</button>
          </div>
          <BulkSelectList rows={bulk.rows} onChoice={bulk.setChoice} />
          <div className="bulk-actions">
            <button className="btn-primary" type="button" disabled={bulk.pending > 0 || !bulk.selected.length} onClick={() => postToConfirmation(kind, bulk.selected)}>
              {bulk.pending > 0 ? `照合中（残り${bulk.pending}冊）` : `確認へ（${bulk.selected.length}冊）`}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
