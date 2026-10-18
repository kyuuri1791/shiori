import { useEffect, useState, type ReactNode } from "react"
import { searchBooks } from "./api"
import { bookSummary } from "./text"
import Cover from "./Cover"
import type { Book } from "./types"

export type BookSearchState = { books: Book[]; loading: boolean; error: string | null; searched: string }

export const IDLE_SEARCH: BookSearchState = { books: [], loading: false, error: null, searched: "" }

export type Searcher = (query: string, signal: AbortSignal, author: string) => Promise<Book[]>

export function useBookSearch(query: string, enabled: boolean, author = "", searcher: Searcher = searchBooks): BookSearchState {
  const [state, setState] = useState<BookSearchState>(IDLE_SEARCH)

  useEffect(() => {
    const q = query.trim()
    if (!enabled || q.length < 2) { setState(IDLE_SEARCH); return }
    const controller = new AbortController()
    setState(s => ({ ...s, loading: true, error: null }))
    const timer = setTimeout(() => {
      searcher(q, controller.signal, author.trim())
        .then(books => setState({ books, loading: false, error: null, searched: q }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setState({ books: [], loading: false, error: error instanceof Error ? error.message : "検索に失敗しました", searched: q })
        })
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, enabled, author])

  return state
}

type Props = {
  search: BookSearchState
  activeIndex?: number
  floating?: boolean
  emptyText: string
  header?: ReactNode
  footer?: ReactNode
  onPick: (book: Book) => void
  onHover?: (index: number) => void
}

export default function BookSuggest({ search, activeIndex = -1, floating = false, emptyText, header, footer, onPick, onHover }: Props) {
  let status: string | null = null
  if (search.loading && !search.books.length) status = "候補を探しています…"
  else if (search.error) status = search.error
  else if (search.searched && !search.books.length) status = emptyText

  if (!status && !search.books.length && !header) return null

  return (
    <ul className={`suggest${floating ? " suggest--floating" : ""}`} role="listbox">
      {header && <li className="suggest__header">{header}</li>}
      {status && <li className="suggest__status">{status}</li>}
      {search.books.map((book, i) => (
        <li
          key={book.id}
          role="option"
          aria-selected={i === activeIndex}
          className={`suggest__item${i === activeIndex ? " suggest__item--active" : ""}`}
          onMouseDown={e => { e.preventDefault(); onPick(book) }}
          onMouseEnter={() => onHover?.(i)}
        >
          <Cover book={book} title={book.title} />
          <div className="suggest__body">
            <div className="suggest__title">{book.title}</div>
            <div className="suggest__meta">{bookSummary(book)}</div>
          </div>
          {book.owned && <span className="suggest__badge">登録済み</span>}
        </li>
      ))}
      {footer && <li className="suggest__footer">{footer}</li>}
    </ul>
  )
}
