import { Suspense, lazy, useEffect, useRef, useState } from "react"
import * as api from "./api"
import { NEXT_STATUS, STATUS, normalizeIsbn } from "./text"
import ShelfControls from "./ShelfControls"
import useShelf from "./useShelf"
import UserShelfItemDetail from "./UserShelfItemDetail"
import type { AddResult, UserShelfItem, UserShelfItemAttributes, BookshelfPage, Book, Filters, ParsedLine, ShelfPage, Status, ToastState } from "./types"
import AddBar from "./AddBar"
import UserShelfItemList from "./UserShelfItemList"
import BulkImportMenu from "./BulkImportMenu"
import { GUEST_SAMPLE_USER_SHELF_ITEM } from "./guestSample"
import Drawer from "./Drawer"
import Pager from "./Pager"
import Toast, { UNDO_WINDOW_MS } from "./Toast"

const Scanner = lazy(() => import("./Scanner"))

const year = new Date().getFullYear()
const SAMPLE_BOOKS: UserShelfItemAttributes[] = [
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

type EditableKey = keyof UserShelfItemAttributes
type UndoEntry = { label: string; revert: () => Promise<UserShelfItem | null> } | { label: string; pendingDelete: number }
type PendingDelete = { id: number; timer: ReturnType<typeof setTimeout> }

const pick = (userShelfItem: UserShelfItem, keys: EditableKey[]): UserShelfItemAttributes =>
  Object.fromEntries(keys.map(k => [k, userShelfItem[k]])) as UserShelfItemAttributes
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
  const canUseAi = canEdit && viewer.approved
  const { shelf, setShelf, shelfRef, filtersRef, filters, changeFilters, query, setQuery, loading, error, setError, load } =
    useShelf(initial, shelfFetcher(initial))
  const [openUserShelfItem, setOpenUserShelfItem] = useState<UserShelfItem | null>(null)
  const [addStatus, setAddStatus] = useState<Status>(loadAddStatus)
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const openUserShelfItemRef = useRef(openUserShelfItem)
  const undoStack = useRef<UndoEntry[]>([])
  const pendingDeletes = useRef(new Map<number, PendingDelete>())
  const nextDeleteToken = useRef(1)
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => new Set())
  const shelfTop = useRef<HTMLElement>(null)
  openUserShelfItemRef.current = openUserShelfItem

  useEffect(() => {
    try { localStorage.setItem("dokusho-card-add-status", addStatus) } catch {}
  }, [addStatus])

  function findUserShelfItem(id: number): UserShelfItem | undefined {
    if (openUserShelfItemRef.current?.id === id) return openUserShelfItemRef.current
    return shelfRef.current.userShelfItems.find(b => b.id === id)
  }

  function showSaved(userShelfItem: UserShelfItem): void {
    setShelf(s => ({ ...s, userShelfItems: userShelfItem.discarded ? s.userShelfItems.filter(b => b.id !== userShelfItem.id) : s.userShelfItems.map(b => (b.id === userShelfItem.id ? userShelfItem : b)) }))
    setOpenUserShelfItem(current => (current?.id === userShelfItem.id ? (userShelfItem.discarded ? null : userShelfItem) : current))
  }

  const notify = (message: string, undoable = false) => setToast({ message, undoable, key: Date.now() })

  function pushUndo(entry: UndoEntry): void {
    undoStack.current.push(entry)
    if (undoStack.current.length > 50) undoStack.current.shift()
    notify(entry.label, true)
  }

  async function save(request: () => Promise<UserShelfItem>, { reload = true }: { reload?: boolean } = {}): Promise<UserShelfItem | null> {
    try {
      const userShelfItem = await request()
      showSaved(userShelfItem)
      setError(null)
      if (reload) load()
      return userShelfItem
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

  function deleteUserShelfItem(id: number, label: string): void {
    const token = nextDeleteToken.current++
    setHiddenIds(prev => new Set([...prev, id]))
    setOpenUserShelfItem(current => (current?.id === id ? null : current))
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
      api.destroyUserShelfItem(pending.id, { keepalive }).catch(() => {})
      return
    }
    await save(() => api.destroyUserShelfItem(pending.id))
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

  async function createUserShelfItem(attributes: UserShelfItemAttributes, label: string): Promise<UserShelfItem | null> {
    const userShelfItem = await save(() => api.createUserShelfItem(attributes))
    if (!userShelfItem) return null
    pushUndo({ label, revert: () => save(() => api.destroyUserShelfItem(userShelfItem.id)) })
    showCreated()
    return userShelfItem
  }

  async function createUserShelfItemsInBulk(items: UserShelfItemAttributes[], label: string): Promise<boolean> {
    try {
      await api.createUserShelfItemsInBulk(items)
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

  async function updateUserShelfItem(id: number, attributes: UserShelfItemAttributes, label: string): Promise<UserShelfItem | null> {
    const before = findUserShelfItem(id)
    const keys = Object.keys(attributes) as EditableKey[]
    if (!before || keys.every(k => sameValue(before[k], attributes[k]))) return null
    const userShelfItem = await save(() => api.updateUserShelfItem(id, attributes))
    if (!userShelfItem) return null
    if (keys.includes("status") && !keys.includes("reading_dates")) keys.push("reading_dates")
    const previous = pick(before, keys)
    pushUndo({ label, revert: () => save(() => api.updateUserShelfItem(id, previous)) })
    return userShelfItem
  }

  const setStatus = (userShelfItem: UserShelfItem, status: Status) =>
    updateUserShelfItem(userShelfItem.id, { status }, `『${userShelfItem.title}』を「${STATUS[status]}」にしました`)

  async function addBook(book: Book, tags: string[] = []): Promise<AddResult> {
    if (book.owned) {
      notify(`『${book.title}』はもう本棚にあります`)
      return { state: "owned", title: book.title }
    }
    const userShelfItem = await createUserShelfItem({ book_id: book.id, status: addStatus, tags }, `『${book.title}』を登録しました`)
    return { state: userShelfItem ? "added" : "failed", title: book.title }
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
    if (found.owned_user_shelf_item) {
      notify(`『${found.owned_user_shelf_item.title}』はもう本棚にあります`)
      return { state: "owned", title: found.owned_user_shelf_item.title }
    }
    if (found.book) return addBook({ ...found.book, owned: false }, tags)
    const userShelfItem = await createUserShelfItem({ isbn13, status: addStatus, tags }, "本のマスタにないISBNなので、ISBNだけで登録しました")
    return { state: userShelfItem ? "unmatched" : "failed", title: userShelfItem?.title ?? "" }
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
      if (openUserShelfItem) setOpenUserShelfItem(null)
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
  const userShelfItems = hiddenIds.size ? shelf.userShelfItems.filter(b => !hiddenIds.has(b.id)) : shelf.userShelfItems
  const registerNotice = !viewer.signed_in
    ? <><a className="link" href="/registration/new">ユーザー登録</a>か<a className="link" href="/session/new">ログイン</a>をすると、本を登録できます</>
    : canEdit
      ? <>AI の機能は、管理者の承認を受けると使えます。それまでは「キーワード」で探して登録できます</>
      : <>この本棚には登録できません。<a className="link" href="/">自分の本棚</a>で登録できます</>

  return (
    <>
      <div className="page">
        <header className="pageHeader">
          <h1 className="pageHeader__title"><a className="pageHeader__home" href="/">読書カード帳</a></h1>
          <div className="pageHeader__tally">
            {viewer.mode !== "guest" && (
              <>
                <span>本棚 <b className="pageHeader__count">{facets.counts.all}</b> 冊</span>
              </>
            )}
            {canUseAi && <button className="button button--link" type="button" onClick={() => setImporting(true)}>まとめて登録</button>}
            <a className="button button--link" href="/users">みんなの本棚</a>
            {viewer.mode === "readonly" && viewer.signed_in && <a className="button button--link" href="/">自分の本棚</a>}
            {viewer.signed_in ? (
              <form className="pageHeader__logout" method="post" action="/session">
                <input type="hidden" name="_method" value="delete" />
                <input type="hidden" name="authenticity_token" value={csrfToken()} />
                <button className="button button--link" type="submit">ログアウト</button>
              </form>
            ) : (
              <>
                <a className="button button--link" href="/registration/new">ユーザー登録</a>
                <a className="button button--link" href="/session/new">ログイン</a>
              </>
            )}
          </div>
        </header>
        {viewer.mode === "readonly" && viewer.is_owner && <div className="banner banner--info">あなたの本棚の公開ページです。ログインしていない人にも、このように見えます。</div>}
        {error && <div className="banner" role="alert">{error}</div>}

        <AddBar
          canRegister={canEdit}
          canUseAi={canUseAi}
          notice={registerNotice}
          searcher={viewer.signed_in ? api.searchBooks : (q, signal) => api.searchPublicBooks(q, signal)}
          addStatus={addStatus}
          onAddStatus={setAddStatus}
          onAddText={async (item: ParsedLine) => !!(await createUserShelfItem({ ...item, status: addStatus }, `『${item.title}』を登録しました`))}
          onAddBook={async (book, tags) => (await addBook(book, tags)).state !== "failed"}
          onAddIsbn={async isbn => (await addIsbn(isbn)).state !== "failed"}
          onScan={() => setScanning(true)}
        />

        {viewer.mode === "guest" ? (
          <section className="shelf" aria-label="本棚">
            <p className="shelf__sampleNote">見本の本棚です。本をクリックすると、読書カード（感想・メモ・読了日）を開けます。</p>
            <UserShelfItemList
              readOnly
              userShelfItems={[GUEST_SAMPLE_USER_SHELF_ITEM]}
              total={1}
              loading={false}
              openId={openUserShelfItem?.id}
              onOpen={() => setOpenUserShelfItem(GUEST_SAMPLE_USER_SHELF_ITEM)}
              onCycle={() => {}}
              onSeed={() => {}}
            />
            <div className="userShelfItemList">
              <div className="userShelfItemList__empty">
                <h2 className="userShelfItemList__emptyTitle">ログインすると、自分の本棚を作れます</h2>
                <div>上の欄で、本のマスタ（約194万冊）からタイトルで本を探せます。</div>
                <a className="button button--primary" href="/session/new">ログイン</a>
              </div>
            </div>
          </section>
        ) : (
          <section className="shelf" aria-label="本棚" ref={shelfTop}>
            <ShelfControls facets={facets} filters={filters} query={query} onQuery={setQuery} onChange={changeFilters} showUnmatched={canEdit} />
            <Pager page={page} onPage={goToPage} />
            <UserShelfItemList
              readOnly={!canEdit}
              emptyText={canEdit ? undefined : "まだ本がありません。"}
              userShelfItems={userShelfItems}
              total={facets.counts.all}
              loading={loading}
              openId={openUserShelfItem?.id}
              onOpen={id => setOpenUserShelfItem(userShelfItems.find(b => b.id === id) || null)}
              onCycle={b => setStatus(b, NEXT_STATUS[b.status])}
              onSeed={() => createUserShelfItemsInBulk(SAMPLE_BOOKS, "見本の本を5冊入れました")}
            />
            <Pager page={page} onPage={goToPage} />
          </section>
        )}
      </div>

      {canEdit ? (
        <Drawer
          userShelfItem={openUserShelfItem}
          onClose={() => setOpenUserShelfItem(null)}
          onUpdate={(id, attributes, label) => updateUserShelfItem(id, attributes, label)}
          onSave={(id, attributes) => save(() => api.updateUserShelfItem(id, attributes), { reload: false })}
          onStatus={(id, s) => { const userShelfItem = findUserShelfItem(id); if (userShelfItem) setStatus(userShelfItem, s) }}
          onDelete={b => deleteUserShelfItem(b.id, `『${b.title}』を削除しました`)}
        />
      ) : <UserShelfItemDetail userShelfItem={openUserShelfItem} onClose={() => setOpenUserShelfItem(null)} />}

      {canUseAi && importing && <BulkImportMenu onClose={() => setImporting(false)} />}

      {canEdit && scanning && (
        <Suspense fallback={null}>
          <Scanner onIsbn={addIsbn} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      <Toast toast={toast} onUndo={undo} onDone={() => setToast(null)} />
    </>
  )
}
