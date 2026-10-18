import { Suspense, lazy, useEffect, useRef, useState } from "react"
import * as api from "./api"
import { NEXT_STATUS, STATUS, normalizeIsbn } from "./text"
import ShelfControls from "./ShelfControls"
import useShelf from "./useShelf"
import BookDetail from "./BookDetail"
import type { AddResult, Book, BookAttributes, BookshelfPage, Edition, Filters, ParsedLine, ShelfPage, Status, ToastState } from "./types"
import AddBar from "./AddBar"
import BookList from "./BookList"
import BulkImportMenu from "./BulkImportMenu"
import { GUEST_SAMPLE_BOOK } from "./guestSample"
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
type UndoEntry = { label: string; revert: () => Promise<Book | null> } | { label: string; pendingDelete: number }
type PendingDelete = { id: number; timer: ReturnType<typeof setTimeout> }

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
  const { shelf, setShelf, shelfRef, filtersRef, filters, changeFilters, query, setQuery, loading, error, setError, load } =
    useShelf(initial, shelfFetcher(initial))
  const [openBook, setOpenBook] = useState<Book | null>(null)
  const [addStatus, setAddStatus] = useState<Status>(loadAddStatus)
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const openBookRef = useRef(openBook)
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

  function showSaved(book: Book): void {
    setShelf(s => ({ ...s, books: book.discarded ? s.books.filter(b => b.id !== book.id) : s.books.map(b => (b.id === book.id ? book : b)) }))
    setOpenBook(current => (current?.id === book.id ? (book.discarded ? null : book) : current))
  }

  const notify = (message: string, undoable = false) => setToast({ message, undoable, key: Date.now() })

  function pushUndo(entry: UndoEntry): void {
    undoStack.current.push(entry)
    if (undoStack.current.length > 50) undoStack.current.shift()
    notify(entry.label, true)
  }

  async function save(request: () => Promise<Book>, { reload = true }: { reload?: boolean } = {}): Promise<Book | null> {
    try {
      const book = await request()
      showSaved(book)
      setError(null)
      if (reload) load()
      return book
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
      unhide(pending.id)
      notify(`「${entry.label}」を取り消しました`)
      return
    }
    if (await entry.revert()) notify(`「${entry.label}」を取り消しました`)
  }

  function unhide(id: number): void {
    setHiddenIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function deleteBook(id: number, label: string): void {
    const token = nextDeleteToken.current++
    setHiddenIds(prev => new Set([...prev, id]))
    setOpenBook(current => (current?.id === id ? null : current))
    pendingDeletes.current.set(token, { id, timer: setTimeout(() => commitDeleteRef.current(token), UNDO_WINDOW_MS) })
    pushUndo({ label, pendingDelete: token })
  }

  async function commitDelete(token: number, { keepalive = false }: { keepalive?: boolean } = {}): Promise<void> {
    const pending = pendingDeletes.current.get(token)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeletes.current.delete(token)
    undoStack.current = undoStack.current.filter(entry => !("pendingDelete" in entry && entry.pendingDelete === token))
    if (keepalive) {
      api.destroyBook(pending.id, { keepalive }).catch(() => {})
      return
    }
    await save(() => api.destroyBook(pending.id))
    unhide(pending.id)
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

  async function createBook(attributes: BookAttributes, label: string): Promise<Book | null> {
    const book = await save(() => api.createBook(attributes))
    if (!book) return null
    pushUndo({ label, revert: () => save(() => api.destroyBook(book.id)) })
    showCreated()
    return book
  }

  async function createBooksInBulk(items: BookAttributes[], label: string): Promise<boolean> {
    try {
      await api.createBooksInBulk(items)
    } catch (e) {
      setError(messageOf(e))
      return false
    }
    setError(null)
    notify(label)
    showCreated()
    load()
    return true
  }

  async function updateBook(id: number, attributes: BookAttributes, label: string): Promise<Book | null> {
    const before = findBook(id)
    const keys = Object.keys(attributes) as EditableKey[]
    if (!before || keys.every(k => sameValue(before[k], attributes[k]))) return null
    const book = await save(() => api.updateBook(id, attributes))
    if (!book) return null
    if (keys.includes("status") && !keys.includes("reading_dates")) keys.push("reading_dates")
    const previous = pick(before, keys)
    pushUndo({ label, revert: () => save(() => api.updateBook(id, previous)) })
    return book
  }

  const setStatus = (book: Book, status: Status) =>
    updateBook(book.id, { status }, `『${book.title}』を「${STATUS[status]}」にしました`)

  async function addEdition(edition: Edition, tags: string[] = []): Promise<AddResult> {
    if (edition.owned) {
      notify(`『${edition.title}』はもう本棚にあります`)
      return { state: "owned", title: edition.title }
    }
    const book = await createBook({ edition_id: edition.id, status: addStatus, tags }, `『${edition.title}』を登録しました`)
    return { state: book ? "added" : "failed", title: edition.title }
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
    const book = await createBook({ isbn13, status: addStatus, tags }, "本のマスタにないISBNなので、ISBNだけで登録しました")
    return { state: book ? "unmatched" : "failed", title: book?.title ?? "" }
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
          onAddText={async (item: ParsedLine) => !!(await createBook({ ...item, status: addStatus }, `『${item.title}』を登録しました`))}
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
              openId={openBook?.id}
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
              openId={openBook?.id}
              onOpen={id => setOpenBook(books.find(b => b.id === id) || null)}
              onCycle={b => setStatus(b, NEXT_STATUS[b.status])}
              onSeed={() => createBooksInBulk(SAMPLE_BOOKS, "見本の本を5冊入れました")}
            />
            <Pager page={page} onPage={goToPage} />
          </section>
        )}
      </div>

      {canEdit ? (
        <Drawer
          book={openBook}
          onClose={() => setOpenBook(null)}
          onUpdate={(id, attributes, label) => updateBook(id, attributes, label)}
          onSave={(id, attributes) => save(() => api.updateBook(id, attributes), { reload: false })}
          onStatus={(id, s) => { const book = findBook(id); if (book) setStatus(book, s) }}
          onDelete={b => deleteBook(b.id, `『${b.title}』を削除しました`)}
        />
      ) : <BookDetail book={openBook} onClose={() => setOpenBook(null)} />}

      {canEdit && importing && <BulkImportMenu onClose={() => setImporting(false)} />}

      {canEdit && scanning && (
        <Suspense fallback={null}>
          <Scanner onIsbn={addIsbn} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      <Toast toast={toast} onUndo={undo} onDone={() => setToast(null)} />
    </>
  )
}
