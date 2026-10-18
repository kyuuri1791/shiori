import { STATUS, lastReadOn } from "./text"
import Cover from "./Cover"
import type { Book } from "./types"

const stars = (n: number): string => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "")

type RowHandlers = {
  onOpen: (id: number) => void
  onCycle: (book: Book) => void
}

type RowProps = RowHandlers & { book: Book; open: boolean; readOnly: boolean }

function BookRow({ book, open, readOnly, onOpen, onCycle }: RowProps) {
  const last = lastReadOn(book)
  const readCount = book.reading_dates.length
  return (
    <div className={`book-row${open ? " book-row--open" : ""}`} data-keeps-drawer-open onClick={() => onOpen(book.id)}>
      <Cover edition={book.edition} title={book.title} />
      <div className="book-row__main">
        <div className="book-row__title">{book.title}</div>
        <div className="book-row__meta">
          {book.author && <span>{book.author}</span>}
          {book.tags.map(t => <span key={t} className="book-row__tag">#{t}</span>)}
          {!book.edition && <span className="book-row__unmatched" title="本のマスタに紐付いていません">未照合</span>}
        </div>
      </div>
      <div className="book-row__side">
        {book.rating > 0 && <span className="book-row__stars" aria-label={`評価${book.rating}`}>{stars(book.rating)}</span>}
        {last && <span className="book-row__date">{last.replaceAll("-", ".")}{readCount > 1 ? `（${readCount}回）` : ""}</span>}
        {readOnly ? <span className={`status-pill status-pill--${book.status}`}>{STATUS[book.status]}</span> : (
          <button
            type="button" className={`status-pill status-pill--${book.status}`} title="クリックで状態を切り替え"
            onClick={e => { e.stopPropagation(); onCycle(book) }}
          >{STATUS[book.status]}</button>
        )}
      </div>
    </div>
  )
}

type Props = RowHandlers & {
  readOnly?: boolean
  emptyText?: string
  books: Book[]
  total: number
  loading: boolean
  openId: number | undefined
  onSeed: () => void
}

export default function BookList({ readOnly = false, emptyText, books, total, loading, openId, onOpen, onCycle, onSeed }: Props) {
  const listClass = `book-list${loading ? " book-list--loading" : ""}`
  if (!total && emptyText) {
    return <div className="book-list"><div className="book-list__empty">{emptyText}</div></div>
  }
  if (!total) {
    return (
      <div className="book-list">
        <div className="book-list__empty">
          <h2 className="book-list__empty-title">まだ本がありません</h2>
          <div>上の欄にタイトルかISBNを入れてEnterで1冊目を登録できます。<br />まず触ってみたいときは、見本の本を入れて試せます（#見本 タグが付くので、あとで見分けられます）。</div>
          <button className="button" type="button" onClick={onSeed}>見本の本を5冊入れる</button>
        </div>
      </div>
    )
  }
  if (!books.length) {
    return <div className={listClass}><div className="book-list__empty">条件に合う本はありません。</div></div>
  }
  return (
    <div className={listClass} aria-busy={loading}>
      {books.map(book => (
        <BookRow
          key={book.id} book={book} open={openId === book.id} readOnly={readOnly}
          onOpen={onOpen} onCycle={onCycle}
        />
      ))}
    </div>
  )
}
