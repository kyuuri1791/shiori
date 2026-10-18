import { Suspense, lazy, useEffect, useRef, useState } from "react"
import * as api from "./api"
import { NEXT_STATUS, STATUS, normalizeIsbn } from "./text"
import ShelfControls from "./ShelfControls"
import useShelf from "./useShelf"
import BookDetail from "./BookDetail"
import type { AddResult, BatchOp, Book, BookAttributes, BookshelfPage, Edition, Filters, ParsedLine, ShelfPage, Status, ToastState } from "./types"
import AddBar from "./AddBar"
import BookList from "./BookList"
import BulkImport from "./BulkImport"
import BulkReview, { MAX_BULK_LINES } from "./BulkReview"
import PhotoReading from "./PhotoReading"
import useShelfPhotoScan from "./useShelfPhotoScan"
import { GUEST_SAMPLE_BOOK } from "./guestSample"
import BulkBar from "./BulkBar"
import Drawer from "./Drawer"
import Pager from "./Pager"
import Toast, { UNDO_WINDOW_MS } from "./Toast"

const Scanner = lazy(() => import("./Scanner"))

const year = new Date().getFullYear()
const SAMPLE_BOOKS: BookAttributes[] = [
  { title: "火車", author: "宮部みゆき", status: "read", rating: 5, reading_dates: [`${year}-09-14`], tags: ["見本", "ミステリ"], review: "（見本）カード破産という題材がこんなに読ませるとは。" },
  { title: "三体", author: "劉慈欣", status: "reading", tags: ["見本", "SF", "翻訳"] },
  { title: "コンビニ人間", author: "村田沙耶香", status: "read", rating: 4, reading_dates: [`${year - 1}-03-20`, `${year}-08-02`], tags: ["見本", "小説"] },
  { title: "サピエンス全史 上", author: "ユヴァル・ノア・ハラリ", status: "want", tags: ["見本", "ノンフィクション"] },
  { title: "博士の愛した数式", author: "小川洋子", status: "want", tags: ["見本", "小説", "再読したい"] },
]

const isStatus = (value: string | null): value is Status => value === "reading" || value === "read" || value === "want"

function loadAddStatus(): Status {
  try {
    const stored = localStorage.getItem("dokusho-card-add-status")
    return isStatus(stored) ? stored : "read"
  } catch {
    return "read"
  }
}

type EditableKey = keyof BookAttributes
type UndoEntry = { label: string; ops: BatchOp[] } | { label: string; pendingDelete: number }
type PendingDelete = { ids: number[]; timer: ReturnType<typeof setTimeout> }
type Patch = { id: number; attributes: BookAttributes }
type ChangedPatch = Patch & { before: Book }

const pick = (book: Book, keys: EditableKey[]): BookAttributes =>
  Object.fromEntries(keys.map(k => [k, book[k]])) as BookAttributes
const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "エラーが起きました")

function shelfFetcher(initial: BookshelfPage): (filters: Filters, signal: AbortSignal) => Promise<ShelfPage> {
  const { mode, owner_id: ownerId } = initial.viewer
  if (mode === "owner") return (f, signal) => api.fetchShelf(f, signal)
  if (mode === "readonly" && ownerId) return (f, signal) => api.fetchPublicShelf(ownerId, f, signal)
  return () => Promise.resolve(initial)
}

const csrfToken = (): string => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""

export default function App({ initial }: { initial: BookshelfPage }) {
  const { viewer } = initial
  const canEdit = viewer.mode === "owner"
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const { shelf, setShelf, shelfRef, filtersRef, filters, changeFilters, query, setQuery, loading, error, setError, load } =
    useShelf(initial, shelfFetcher(initial), () => setSelected(new Set()))
  const [openBook, setOpenBook] = useState<Book | null>(null)
  const [addStatus, setAddStatus] = useState<Status>(loadAddStatus)
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [review, setReview] = useState<{ lines: ParsedLine[]; truncated: number } | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const openBookRef = useRef(openBook)
  const lastClicked = useRef<number | null>(null)
  const undoStack = useRef<UndoEntry[]>([])
  const pendingDeletes = useRef(new Map<number, PendingDelete>())
  const nextDeleteToken = useRef(1)
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => new Set())
  const shelfTop = useRef<HTMLElement>(null)
  openBookRef.current = openBook

  useEffect(() => {
    try { localStorage.setItem("dokusho-card-add-status", addStatus) } catch {}
  }, [addStatus])

  function findBook(id: number): Book | undefined {
    if (openBookRef.current?.id === id) return openBookRef.current
    return shelfRef.current.books.find(b => b.id === id)
  }

  function applyResults(results: Book[]): void {
    const byId = new Map(results.map(b => [b.id, b]))
    setShelf(s => ({
      ...s,
      books: s.books.flatMap(b => {
        const updated = byId.get(b.id)
        if (!updated) return [b]
        return updated.discarded ? [] : [updated]
      }),
    }))
    setOpenBook(current => {
      const updated = current && byId.get(current.id)
      if (!updated) return current
      return updated.discarded ? null : updated
    })
  }

  const notify = (message: string, undoable = false) => setToast({ message, undoable, key: Date.now() })

  function pushUndo(label: string, ops: BatchOp[]): void {
    undoStack.current.push({ label, ops })
    if (undoStack.current.length > 50) undoStack.current.shift()
    notify(label, true)
  }

  async function perform(
    label: string | null,
    ops: BatchOp[],
    undoOps: ((results: Book[]) => BatchOp[]) | null,
    { reload = true }: { reload?: boolean } = {},
  ): Promise<Book[] | null> {
    if (!ops.length) return null
    try {
      const results = await api.batch(ops)
      applyResults(results)
      setError(null)
      if (label && undoOps) pushUndo(label, undoOps(results))
      if (reload) load()
      return results
    } catch (e) {
      setError(messageOf(e))
      return null
    }
  }

  async function undo(): Promise<void> {
    const entry = undoStack.current.pop()
    if (!entry) { notify("取り消せる操作はありません"); return }
    if ("pendingDelete" in entry) {
      const pending = pendingDeletes.current.get(entry.pendingDelete)
      if (!pending) { notify("取り消せる操作はありません"); return }
      clearTimeout(pending.timer)
      pendingDeletes.current.delete(entry.pendingDelete)
      unhide(pending.ids)
      notify(`「${entry.label}」を取り消しました`)
      return
    }
    if (await perform(null, entry.ops, null)) notify(`「${entry.label}」を取り消しました`)
  }

  function unhide(ids: number[]): void {
    setHiddenIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }

  function destroyBooks(ids: number[], label: string): void {
    if (!ids.length) return
    const token = nextDeleteToken.current++
    setHiddenIds(prev => new Set([...prev, ...ids]))
    setOpenBook(current => (current && ids.includes(current.id) ? null : current))
    pendingDeletes.current.set(token, { ids, timer: setTimeout(() => commitDeleteRef.current(token), UNDO_WINDOW_MS) })
    undoStack.current.push({ label, pendingDelete: token })
    if (undoStack.current.length > 50) undoStack.current.shift()
    notify(label, true)
  }

  async function commitDelete(token: number, { keepalive = false }: { keepalive?: boolean } = {}): Promise<void> {
    const pending = pendingDeletes.current.get(token)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeletes.current.delete(token)
    undoStack.current = undoStack.current.filter(entry => !("pendingDelete" in entry && entry.pendingDelete === token))
    try {
      await api.batch(pending.ids.map((id): BatchOp => ({ op: "destroy", id })), { keepalive })
      if (keepalive) return
      setShelf(s => ({ ...s, books: s.books.filter(b => !pending.ids.includes(b.id)) }))
      load()
    } catch (e) {
      setError(messageOf(e))
    } finally {
      unhide(pending.ids)
    }
  }
  const commitDeleteRef = useRef(commitDelete)
  commitDeleteRef.current = commitDelete

  useEffect(() => {
    const flush = () => pendingDeletes.current.forEach((_, token) => { commitDeleteRef.current(token, { keepalive: true }) })
    window.addEventListener("pagehide", flush)
    return () => window.removeEventListener("pagehide", flush)
  }, [])

  function showCreated(): void {
    const f = filtersRef.current
    const status = f.status === "all" || f.status === addStatus ? f.status : "all"
    if (f.page !== 1 || status !== f.status) changeFilters({ status })
  }

  async function createBooks(items: BookAttributes[], label: string): Promise<Book[] | null> {
    const results = await perform(
      label,
      items.map((attributes): BatchOp => ({ op: "create", attributes })),
      rs => rs.map((b): BatchOp => ({ op: "destroy", id: b.id })),
    )
    if (results) showCreated()
    return results
  }

  function updateBooks(patches: Patch[], label: string | ((changed: ChangedPatch[]) => string)): Promise<Book[] | null> {
    const changed = patches.flatMap((p): ChangedPatch[] => {
      const before = findBook(p.id)
      if (!before) return []
      const differs = (Object.keys(p.attributes) as EditableKey[]).some(k => !sameValue(before[k], p.attributes[k]))
      return differs ? [{ ...p, before }] : []
    })
    const text = typeof label === "function" ? label(changed) : label
    return perform(text, changed.map((p): BatchOp => ({ op: "update", id: p.id, attributes: p.attributes })), () =>
      changed.map((p): BatchOp => {
        const keys = Object.keys(p.attributes) as EditableKey[]
        if (keys.includes("status") && !keys.includes("reading_dates")) keys.push("reading_dates")
        return { op: "update", id: p.id, attributes: pick(p.before, keys) }
      }))
  }

  const setStatus = (ids: number[], status: Status) =>
    updateBooks(ids.map(id => ({ id, attributes: { status } })), changed => {
      const first = changed[0]
      return changed.length === 1 && first ? `『${first.before.title}』を「${STATUS[status]}」にしました` : `${changed.length}冊を「${STATUS[status]}」にしました`
    })

  const openReview = (lines: ParsedLine[]) =>
    setReview({ lines: lines.slice(0, MAX_BULK_LINES), truncated: Math.max(0, lines.length - MAX_BULK_LINES) })

  const photo = useShelfPhotoScan(openReview)
  useEffect(() => { if (photo.state.error) setError(photo.state.error) }, [photo.state.error])

  async function addEdition(edition: Edition, tags: string[] = []): Promise<AddResult> {
    if (edition.owned) {
      notify(`『${edition.title}』はもう本棚にあります`)
      return { state: "owned", title: edition.title }
    }
    const rs = await createBooks([{ edition_id: edition.id, status: addStatus, tags }], `『${edition.title}』を登録しました`)
    return { state: rs ? "added" : "failed", title: edition.title }
  }

  async function addIsbn(rawIsbn: string, tags: string[] = []): Promise<AddResult> {
    const isbn13 = normalizeIsbn(rawIsbn)
    if (!isbn13) {
      setError("ISBNの形式が正しくありません")
      return { state: "failed", title: "" }
    }
    let found
    try {
      found = await api.lookupIsbn(isbn13)
    } catch (e) {
      setError(messageOf(e))
      return { state: "failed", title: "" }
    }
    if (found.owned_book) {
      notify(`『${found.owned_book.title}』はもう本棚にあります`)
      return { state: "owned", title: found.owned_book.title }
    }
    if (found.edition) return addEdition({ ...found.edition, owned: false }, tags)
    const rs = await createBooks([{ isbn13, status: addStatus, tags }], "本のマスタにないISBNなので、ISBNだけで登録しました")
    return { state: rs ? "unmatched" : "failed", title: rs?.[0]?.title || "" }
  }


  function toggleSelect(id: number, shift: boolean): void {
    setSelected(prev => {
      const next = new Set(prev)
      const anchor = lastClicked.current
      if (shift && anchor != null) {
        const ids = shelf.books.map(b => b.id)
        const [a = -1, z = -1] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y)
        if (a >= 0) ids.slice(a, z + 1).forEach(i => next.add(i))
      } else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    lastClicked.current = id
  }

  function goToPage(page: number): void {
    changeFilters({ page })
    shelfTop.current?.scrollIntoView({ block: "start" })
  }

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandler.current = e => {
    const target = e.target instanceof Element ? e.target : null
    if (e.defaultPrevented || target?.closest("dialog")) return
    if (e.key === "Escape") {
      if (openBook) setOpenBook(null)
      else if (selected.size) setSelected(new Set())
      return
    }
    if (target?.closest("input, textarea, select")) return
    if (canEdit && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo() }
    else if (e.key === "/") { e.preventDefault(); document.getElementById("search")?.focus() }
    else if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); document.getElementById("addInput")?.focus() }
  }
  useEffect(() => {
    const handle = (e: KeyboardEvent) => keyHandler.current(e)
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [])

  const { page, facets } = shelf
  const books = hiddenIds.size ? shelf.books.filter(b => !hiddenIds.has(b.id)) : shelf.books
  const selectedBooks = canEdit ? books.filter(b => selected.has(b.id)) : []
  const registerNotice = viewer.signed_in
    ? <>この本棚には登録できません。<a className="link" href="/">自分の本棚</a>で登録できます</>
    : <><a className="link" href="/session/new">ログイン</a>すると、本を登録したり AI で探したりできます</>

  return (
    <>
      <div className="page">
        <header className="page-header">
          <h1 className="page-header__title"><a className="page-header__home" href="/">読書カード帳</a></h1>
          <div className="page-header__tally">
            {viewer.mode !== "guest" && (
              <>
                <span>本棚 <b className="page-header__count">{facets.counts.all}</b> 冊</span>
              </>
            )}
            {canEdit && <button className="button button--link" type="button" onClick={() => setImporting(true)}>まとめて登録</button>}
            <a className="button button--link" href="/users">みんなの本棚</a>
            {viewer.mode === "readonly" && viewer.signed_in && <a className="button button--link" href="/">自分の本棚</a>}
            {viewer.signed_in ? (
              <form className="page-header__logout" method="post" action="/session">
                <input type="hidden" name="_method" value="delete" />
                <input type="hidden" name="authenticity_token" value={csrfToken()} />
                <button className="button button--link" type="submit">ログアウト</button>
              </form>
            ) : <a className="button button--link" href="/session/new">ログイン</a>}
          </div>
        </header>
        {viewer.mode === "readonly" && viewer.is_owner && <div className="banner banner--info">あなたの本棚の公開ページです。ログインしていない人にも、このように見えます。</div>}
        {error && <div className="banner" role="alert">{error}</div>}

        <AddBar
          canRegister={canEdit}
          canUseAi={canEdit}
          notice={registerNotice}
          searcher={viewer.signed_in ? api.searchEditions : (q, signal) => api.searchPublicEditions(q, signal)}
          addStatus={addStatus}
          onAddStatus={setAddStatus}
          onAddText={async (items: ParsedLine[]) => {
            const first = items[0]
            const label = items.length === 1 && first ? `『${first.title}』を登録しました` : `${items.length}冊を登録しました`
            return !!(await createBooks(items.map(p => ({ ...p, status: addStatus })), label))
          }}
          onAddEdition={async (edition, tags) => (await addEdition(edition, tags)).state !== "failed"}
          onAddIsbn={async isbn => (await addIsbn(isbn)).state !== "failed"}
          onScan={() => setScanning(true)}
        />

        {viewer.mode === "guest" ? (
          <section className="shelf" aria-label="本棚">
            <p className="shelf__sample-note">見本の本棚です。本をクリックすると、読書カード（感想・メモ・読了日）を開けます。</p>
            <BookList
              readOnly
              books={[GUEST_SAMPLE_BOOK]}
              total={1}
              loading={false}
              selected={new Set()}
              openId={openBook?.id}
              onToggle={() => {}}
              onOpen={() => setOpenBook(GUEST_SAMPLE_BOOK)}
              onCycle={() => {}}
              onSeed={() => {}}
            />
            <div className="book-list">
              <div className="book-list__empty">
                <h2 className="book-list__empty-title">ログインすると、自分の本棚を作れます</h2>
                <div>上の欄で、本のマスタ（約194万冊）からタイトルで本を探せます。</div>
                <a className="button button--primary" href="/session/new">ログイン</a>
              </div>
            </div>
          </section>
        ) : (
          <section className="shelf" aria-label="本棚" ref={shelfTop}>
            <ShelfControls facets={facets} filters={filters} query={query} onQuery={setQuery} onChange={changeFilters} showUnmatched={canEdit} />
            <Pager page={page} onPage={goToPage} />
            <BookList
              readOnly={!canEdit}
              emptyText={canEdit ? undefined : "まだ本がありません。"}
              books={books}
              total={facets.counts.all}
              loading={loading}
              selected={selected}
              openId={openBook?.id}
              onToggle={toggleSelect}
              onOpen={id => setOpenBook(books.find(b => b.id === id) || null)}
              onCycle={b => setStatus([b.id], NEXT_STATUS[b.status])}
              onSeed={() => createBooks(SAMPLE_BOOKS, "見本の本を5冊入れました")}
            />
            <Pager page={page} onPage={goToPage} />
          </section>
        )}
      </div>

      {selectedBooks.length > 0 && (
        <BulkBar
          count={selectedBooks.length}
          onStatus={s => setStatus(selectedBooks.map(b => b.id), s)}
          onTag={t => updateBooks(
            selectedBooks.filter(b => !b.tags.includes(t)).map(b => ({ id: b.id, attributes: { tags: [...b.tags, t] } })),
            changed => `${changed.length}冊に #${t} を付けました`)}
          onDelete={() => {
            const ids = selectedBooks.map(b => b.id)
            setSelected(new Set())
            destroyBooks(ids, `${ids.length}冊を削除しました`)
          }}
          onClear={() => setSelected(new Set())}
        />
      )}

      {canEdit ? (
        <Drawer
          book={openBook}
          onClose={() => setOpenBook(null)}
          onUpdate={(id, attributes, label) => updateBooks([{ id, attributes }], label)}
          onSave={(id, attributes) => perform(null, [{ op: "update", id, attributes }], null, { reload: false })}
          onStatus={(id, s) => setStatus([id], s)}
          onDelete={b => destroyBooks([b.id], `『${b.title}』を削除しました`)}
        />
      ) : <BookDetail book={openBook} onClose={() => setOpenBook(null)} />}

      {canEdit && importing && (
        <BulkImport onPhoto={file => { setError(null); photo.start(file) }} onClose={() => setImporting(false)} />
      )}

      {canEdit && photo.state.status === "reading" && <PhotoReading onCancel={photo.cancel} />}

      {canEdit && review && (
        <BulkReview
          lines={review.lines}
          truncated={review.truncated}
          initialStatus={addStatus}
          onRegister={async items => !!(await createBooks(items, `${items.length}冊を登録しました`))}
          onClose={() => setReview(null)}
        />
      )}

      {canEdit && scanning && (
        <Suspense fallback={null}>
          <Scanner onIsbn={addIsbn} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      <Toast toast={toast} onUndo={undo} onDone={() => setToast(null)} />
    </>
  )
}
