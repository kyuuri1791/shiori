import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { lookupIsbn } from "./api"
import { STATUS, STATUS_KEYS, authorLine, bookSummary, externalTargetOfUserShelfItem, looksLikeIsbn, today } from "./text"
import ExternalLink from "./ExternalLink"
import Cover from "./Cover"
import BookSuggest, { IDLE_SEARCH, useBookSearch, type BookSearchState } from "./BookSuggest"
import useCloseOnOutsideClick from "./useCloseOnOutsideClick"
import type { UserShelfItem, Book, SaveUserShelfItem, Status, UpdateUserShelfItem } from "./types"

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
  onUpdate: UpdateUserShelfItem
  onSave: SaveUserShelfItem
  onStatus: (id: number, status: Status) => void
  onDelete: (userShelfItem: UserShelfItem) => void
}

export default function Drawer({ userShelfItem, ...props }: Handlers & { userShelfItem: UserShelfItem | null }) {
  const last = useRef(userShelfItem)
  if (userShelfItem) last.current = userShelfItem
  const shown = userShelfItem || last.current
  const ref = useCloseOnOutsideClick<HTMLElement>(!!userShelfItem, props.onClose)
  return (
    <aside ref={ref} className={`drawer${userShelfItem ? " drawer--open" : ""}`} aria-label="本の詳細" inert={!userShelfItem}>
      {shown && <DrawerBody key={shown.id} userShelfItem={shown} active={!!userShelfItem} {...props} />}
    </aside>
  )
}

function BookPanel({ userShelfItem, onUpdate }: { userShelfItem: UserShelfItem; onUpdate: UpdateUserShelfItem }) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState(userShelfItem.title)
  const [isbnResult, setIsbnResult] = useState<BookSearchState | null>(null)
  const isbnMode = looksLikeIsbn(query)
  const search = useBookSearch(query, searching && !isbnMode)
  const book = userShelfItem.book

  const link = (picked: Book) => {
    setSearching(false)
    onUpdate(userShelfItem.id, { book_id: picked.id, title: picked.title, author: authorLine(picked.authors) }, "本のマスタに紐付けました")
  }

  async function findByIsbn() {
    setIsbnResult({ books: [], loading: true, error: null, searched: query })
    try {
      const { book: found } = await lookupIsbn(query)
      setIsbnResult({ books: found ? [found] : [], loading: false, error: null, searched: query })
    } catch (error) {
      setIsbnResult({ books: [], loading: false, error: error instanceof Error ? error.message : "検索に失敗しました", searched: query })
    }
  }

  if (book) {
    return (
      <div className="bookCard">
        <Cover book={book} title={book.title} large />
        <div className="bookCard__body">
          <strong>{book.title}</strong>
          <span>{bookSummary(book)}</span>
          {book.isbn13 && <span className="bookCard__isbn">ISBN {book.isbn13}</span>}
          <ExternalLink target={externalTargetOfUserShelfItem(userShelfItem)} />
          <div className="bookCard__actions">
            <button className="button button--small" type="button" onClick={() => onUpdate(userShelfItem.id, { book_id: null }, "本のマスタとの紐付けを外しました")}>紐付けを外す</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bookCard bookCard--unmatched">
      <div className="bookCard__body">
        <span className="bookCard__note">本のマスタに紐付いていません。紐付けると書誌情報と書影が付き、同じ本の重複に気づけるようになります。</span>
        {userShelfItem.isbn13 && <span className="bookCard__isbn">読み取ったISBN {userShelfItem.isbn13}（本のマスタに未登録）</span>}
        <ExternalLink target={externalTargetOfUserShelfItem(userShelfItem)} />
        {!searching && (
          <div className="bookCard__actions">
            <button className="button button--small" type="button" onClick={() => setSearching(true)}>マスタから探す</button>
          </div>
        )}
        {searching && (
          <div className="bookCard__search">
            <input
              type="text" className="field__input" aria-label="タイトルかISBNで探す" value={query} autoFocus
              onChange={e => { setQuery(e.target.value); setIsbnResult(null) }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && isbnMode) { e.preventDefault(); findByIsbn() }
              }}
            />
            {isbnMode && !isbnResult && <span className="bookCard__note">ISBNで探すにはEnterを押してください</span>}
            <BookSuggest
              search={isbnMode ? (isbnResult ?? IDLE_SEARCH) : search}
              emptyText="候補が見つかりません。タイトルを短くするか、ISBNで探してください"
              onPick={link}
            />
            <div className="bookCard__actions">
              <button className="button button--small" type="button" onClick={() => setSearching(false)}>やめる</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReadingList({ userShelfItem, onUpdate }: { userShelfItem: UserShelfItem; onUpdate: UpdateUserShelfItem }) {
  const dates = userShelfItem.reading_dates

  function save(next: string[], label: string) {
    const attributes: { reading_dates: string[]; status?: Status } = { reading_dates: [...next].sort() }
    if (next.length && userShelfItem.status !== "read") attributes.status = "read"
    onUpdate(userShelfItem.id, attributes, label)
  }

  return (
    <div className="field">
      <span className="field__label">読了日</span>
      {dates.length > 0 && (
        <ul className="readingList">
          {dates.map((date, i) => (
            <li key={`${i}-${date}`} className="readingList__item">
              <span className="readingList__nth">{i + 1}回目</span>
              <input
                type="date" className="field__input" aria-label={`${i + 1}回目の読了日`} value={date}
                onChange={e => e.target.value && save(dates.map((d, j) => (j === i ? e.target.value : d)), "読了日を変更しました")}
              />
              <button className="readingList__delete" type="button" onClick={() => save(dates.filter((_, j) => j !== i), "読了日を消しました")}>消す</button>
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

function DrawerBody({ userShelfItem, active, onClose, onUpdate, onSave, onStatus, onDelete }: Handlers & { userShelfItem: UserShelfItem; active: boolean }) {
  const [title, setTitle, titleBind] = useDraft(userShelfItem.title)
  const [author, setAuthor, authorBind] = useDraft(userShelfItem.author)
  const [tags, setTags, tagsBind] = useDraft(userShelfItem.tags.join(" "))
  const [review, setReview, reviewBind] = useDraft(userShelfItem.review)
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
    onSave(userShelfItem.id, { review: value }).then(rs => setSaveState(rs ? "保存しました" : "保存できませんでした"))
  }
  const flushRef = useRef(flushReview)
  flushRef.current = flushReview
  useEffect(() => () => flushRef.current(), [])
  useEffect(() => { if (!active) flushRef.current() }, [active])

  function commitText(key: "title" | "author", value: string, label: string) {
    if (key === "title" && !value) { setTitle(userShelfItem.title); return }
    onUpdate(userShelfItem.id, { [key]: value }, label)
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
        <BookPanel userShelfItem={userShelfItem} onUpdate={onUpdate} />
        <div className="drawer__pair">
          <div className="field">
            <span className="field__label">状態</span>
            <div className="segmented" role="group" aria-label="状態">
              {STATUS_KEYS.map(key => (
                <button
                  key={key} type="button" aria-pressed={userShelfItem.status === key}
                  className={`segmented__option${userShelfItem.status === key ? " segmented__option--active" : ""}`}
                  onClick={() => onStatus(userShelfItem.id, key)}
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
                  className={`rating__star${n <= userShelfItem.rating ? " rating__star--on" : ""}`}
                  onClick={() => onUpdate(userShelfItem.id, { rating: userShelfItem.rating === n ? 0 : n }, "評価を変更しました")}
                >★</button>
              ))}
            </div>
          </div>
        </div>
        <ReadingList userShelfItem={userShelfItem} onUpdate={onUpdate} />
        <div className="field">
          <label className="field__label" htmlFor="drawerTags">タグ（スペース区切り）</label>
          <input
            type="text" id="drawerTags" className="field__input" placeholder="小説 SF 再読したい" value={tags} {...tagsBind}
            onChange={e => setTags(e.target.value)}
            onBlur={e => {
              const next = [...new Set(e.target.value.split(/[\s,、]+/).map(t => t.replace(/^[#＃]/, "")).filter(Boolean))]
              onUpdate(userShelfItem.id, { tags: next }, "タグを変更しました")
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
              onSave(userShelfItem.id, { notes: [...userShelfItem.notes, { t: Date.now(), text }] })
            }}
          />
          <ul className="noteList">
            {[...userShelfItem.notes].reverse().map(n => (
              <li className="noteList__item" key={n.t}>
                <span className="noteList__date">{new Date(n.t).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
                <p className="noteList__text">{n.text}</p>
                <button className="noteList__delete" type="button" onClick={() => onUpdate(userShelfItem.id, { notes: userShelfItem.notes.filter(x => x.t !== n.t) }, "メモを消しました")}>消す</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="drawer__foot">
        <button className="button button--danger" type="button" onClick={() => onDelete(userShelfItem)}>この本を削除</button>
        <span className="drawer__created">登録 {new Date(userShelfItem.created_at).toLocaleDateString("ja-JP")}</span>
      </div>
    </>
  )
}
