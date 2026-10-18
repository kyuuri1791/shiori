import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { lookupIsbn } from "./api"
import { STATUS, STATUS_KEYS, authorLine, editionSummary, externalTargetOfBook, looksLikeIsbn, today } from "./text"
import ExternalLink from "./ExternalLink"
import Cover from "./Cover"
import EditionSuggest, { IDLE_SEARCH, useEditionSearch, type EditionSearchState } from "./EditionSuggest"
import useCloseOnOutsideClick from "./useCloseOnOutsideClick"
import type { Book, Edition, SaveBook, Status, UpdateBook } from "./types"

type DraftBind = { onFocus: () => void; onBlurCapture: () => void }

function useDraft<T>(value: T): [T, Dispatch<SetStateAction<T>>, DraftBind] {
  const [draft, setDraft] = useState(value)
  const editing = useRef(false)
  useEffect(() => { if (!editing.current) setDraft(value) }, [value])
  const bind = {
    onFocus: () => { editing.current = true },
    onBlurCapture: () => { editing.current = false },
  }
  return [draft, setDraft, bind]
}

type Handlers = {
  onClose: () => void
  onUpdate: UpdateBook
  onSave: SaveBook
  onStatus: (id: number, status: Status) => void
  onDelete: (book: Book) => void
}

export default function Drawer({ book, ...props }: Handlers & { book: Book | null }) {
  const last = useRef(book)
  if (book) last.current = book
  const shown = book || last.current
  const ref = useCloseOnOutsideClick<HTMLElement>(!!book, props.onClose)
  return (
    <aside ref={ref} className={`drawer${book ? " drawer--open" : ""}`} aria-label="本の詳細" inert={!book}>
      {shown && <DrawerBody key={shown.id} book={shown} active={!!book} {...props} />}
    </aside>
  )
}

function EditionPanel({ book, onUpdate }: { book: Book; onUpdate: UpdateBook }) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState(book.title)
  const [isbnResult, setIsbnResult] = useState<EditionSearchState | null>(null)
  const isbnMode = looksLikeIsbn(query)
  const search = useEditionSearch(query, searching && !isbnMode)
  const edition = book.edition

  const link = (picked: Edition) => {
    setSearching(false)
    onUpdate(book.id, { edition_id: picked.id, title: picked.title, author: authorLine(picked.authors) }, "本のマスタに紐付けました")
  }

  async function findByIsbn() {
    setIsbnResult({ editions: [], loading: true, error: null, searched: query })
    try {
      const { edition: found } = await lookupIsbn(query)
      setIsbnResult({ editions: found ? [found] : [], loading: false, error: null, searched: query })
    } catch (error) {
      setIsbnResult({ editions: [], loading: false, error: error instanceof Error ? error.message : "検索に失敗しました", searched: query })
    }
  }

  if (edition) {
    return (
      <div className="edition-card">
        <Cover edition={edition} title={edition.title} large />
        <div className="edition-card__body">
          <strong>{edition.title}</strong>
          <span>{editionSummary(edition)}</span>
          {edition.isbn13 && <span className="edition-card__isbn">ISBN {edition.isbn13}</span>}
          <ExternalLink target={externalTargetOfBook(book)} />
          <div className="edition-card__actions">
            <button className="button button--small" type="button" onClick={() => onUpdate(book.id, { edition_id: null }, "本のマスタとの紐付けを外しました")}>紐付けを外す</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="edition-card edition-card--unmatched">
      <div className="edition-card__body">
        <span className="edition-card__note">本のマスタに紐付いていません。紐付けると書誌情報と書影が付き、同じ本の重複に気づけるようになります。</span>
        {book.isbn13 && <span className="edition-card__isbn">読み取ったISBN {book.isbn13}（本のマスタに未登録）</span>}
        <ExternalLink target={externalTargetOfBook(book)} />
        {!searching && (
          <div className="edition-card__actions">
            <button className="button button--small" type="button" onClick={() => setSearching(true)}>マスタから探す</button>
          </div>
        )}
        {searching && (
          <div className="edition-card__search">
            <input
              type="text" className="field__input" aria-label="タイトルかISBNで探す" value={query} autoFocus
              onChange={e => { setQuery(e.target.value); setIsbnResult(null) }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && isbnMode) { e.preventDefault(); findByIsbn() }
              }}
            />
            {isbnMode && !isbnResult && <span className="edition-card__note">ISBNで探すにはEnterを押してください</span>}
            <EditionSuggest
              search={isbnMode ? (isbnResult ?? IDLE_SEARCH) : search}
              emptyText="候補が見つかりません。タイトルを短くするか、ISBNで探してください"
              onPick={link}
            />
            <div className="edition-card__actions">
              <button className="button button--small" type="button" onClick={() => setSearching(false)}>やめる</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReadingList({ book, onUpdate }: { book: Book; onUpdate: UpdateBook }) {
  const dates = book.reading_dates

  function save(next: string[], label: string) {
    const attributes: { reading_dates: string[]; status?: Status } = { reading_dates: [...next].sort() }
    if (next.length && book.status !== "read") attributes.status = "read"
    onUpdate(book.id, attributes, label)
  }

  return (
    <div className="field">
      <span className="field__label">読了日</span>
      {dates.length > 0 && (
        <ul className="reading-list">
          {dates.map((date, i) => (
            <li key={`${i}-${date}`} className="reading-list__item">
              <span className="reading-list__nth">{i + 1}回目</span>
              <input
                type="date" className="field__input" aria-label={`${i + 1}回目の読了日`} value={date}
                onChange={e => e.target.value && save(dates.map((d, j) => (j === i ? e.target.value : d)), "読了日を変更しました")}
              />
              <button className="reading-list__delete" type="button" onClick={() => save(dates.filter((_, j) => j !== i), "読了日を消しました")}>消す</button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <button className="button button--small" type="button" onClick={() => save([...dates, today()], dates.length ? "再読を記録しました" : "読了日を記録しました")}>
          {dates.length ? "もう一度読んだ（今日）" : "読み終えた（今日）"}
        </button>
      </div>
    </div>
  )
}

function DrawerBody({ book, active, onClose, onUpdate, onSave, onStatus, onDelete }: Handlers & { book: Book; active: boolean }) {
  const [title, setTitle, titleBind] = useDraft(book.title)
  const [author, setAuthor, authorBind] = useDraft(book.author)
  const [tags, setTags, tagsBind] = useDraft(book.tags.join(" "))
  const [review, setReview, reviewBind] = useDraft(book.review)
  const [note, setNote] = useState("")
  const [saveState, setSaveState] = useState("")
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingReview = useRef<string | null>(null)

  function flushReview() {
    if (reviewTimer.current) clearTimeout(reviewTimer.current)
    reviewTimer.current = null
    if (pendingReview.current == null) return
    const value = pendingReview.current
    pendingReview.current = null
    onSave(book.id, { review: value }).then(rs => setSaveState(rs ? "保存しました" : "保存できませんでした"))
  }
  const flushRef = useRef(flushReview)
  flushRef.current = flushReview
  useEffect(() => () => flushRef.current(), [])
  useEffect(() => { if (!active) flushRef.current() }, [active])

  function commitText(key: "title" | "author", value: string, label: string) {
    if (key === "title" && !value) { setTitle(book.title); return }
    onUpdate(book.id, { [key]: value }, label)
  }

  return (
    <>
      <div className="drawer__head">
        <span>読書カード</span>
        <button className="button button--small" type="button" onClick={onClose}>閉じる</button>
      </div>
      <div className="drawer__body">
        <input
          className="drawer__title" type="text" aria-label="タイトル" value={title} {...titleBind}
          onChange={e => setTitle(e.target.value)}
          onBlur={e => commitText("title", e.target.value.trim(), "タイトルを変更しました")}
        />
        <div className="field">
          <label className="field__label" htmlFor="drawerAuthor">著者</label>
          <input
            type="text" id="drawerAuthor" className="field__input" value={author} {...authorBind}
            onChange={e => setAuthor(e.target.value)}
            onBlur={e => commitText("author", e.target.value.trim(), "著者を変更しました")}
          />
        </div>
        <EditionPanel book={book} onUpdate={onUpdate} />
        <div className="drawer__pair">
          <div className="field">
            <span className="field__label">状態</span>
            <div className="segmented" role="group" aria-label="状態">
              {STATUS_KEYS.map(key => (
                <button
                  key={key} type="button" aria-pressed={book.status === key}
                  className={`segmented__option${book.status === key ? " segmented__option--active" : ""}`}
                  onClick={() => onStatus(book.id, key)}
                >{STATUS[key]}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field__label">評価</span>
            <div className="rating">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n} type="button" aria-label={`${n}点`}
                  className={`rating__star${n <= book.rating ? " rating__star--on" : ""}`}
                  onClick={() => onUpdate(book.id, { rating: book.rating === n ? 0 : n }, "評価を変更しました")}
                >★</button>
              ))}
            </div>
          </div>
        </div>
        <ReadingList book={book} onUpdate={onUpdate} />
        <div className="field">
          <label className="field__label" htmlFor="drawerTags">タグ（スペース区切り）</label>
          <input
            type="text" id="drawerTags" className="field__input" placeholder="小説 SF 再読したい" value={tags} {...tagsBind}
            onChange={e => setTags(e.target.value)}
            onBlur={e => {
              const next = [...new Set(e.target.value.split(/[\s,、]+/).map(t => t.replace(/^[#＃]/, "")).filter(Boolean))]
              onUpdate(book.id, { tags: next }, "タグを変更しました")
            }}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="drawerReview">感想</label>
          <textarea
            id="drawerReview" className="field__textarea" value={review} {...reviewBind}
            placeholder="文字数の制限はありません。書いたそばから自動で保存されます。"
            onChange={e => {
              setReview(e.target.value)
              setSaveState("入力中…")
              pendingReview.current = e.target.value
              if (reviewTimer.current) clearTimeout(reviewTimer.current)
              reviewTimer.current = setTimeout(flushReview, 700)
            }}
            onBlur={flushReview}
          />
          <div className="field__meta"><span>{review.length}文字</span><span>{saveState}</span></div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="drawerNote">読みながらメモ</label>
          <input
            type="text" id="drawerNote" className="field__input" placeholder="気になった一文、ページ数など。Enterで追加" value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return
              const text = note.trim()
              if (!text) return
              setNote("")
              onSave(book.id, { notes: [...book.notes, { t: Date.now(), text }] })
            }}
          />
          <ul className="note-list">
            {[...book.notes].reverse().map(n => (
              <li className="note-list__item" key={n.t}>
                <span className="note-list__date">{new Date(n.t).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
                <p className="note-list__text">{n.text}</p>
                <button className="note-list__delete" type="button" onClick={() => onUpdate(book.id, { notes: book.notes.filter(x => x.t !== n.t) }, "メモを消しました")}>消す</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="drawer__foot">
        <button className="button button--danger" type="button" onClick={() => onDelete(book)}>この本を削除</button>
        <span className="drawer__created">登録 {new Date(book.created_at).toLocaleDateString("ja-JP")}</span>
      </div>
    </>
  )
}
