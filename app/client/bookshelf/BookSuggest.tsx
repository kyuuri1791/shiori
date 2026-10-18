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
    <ul className={`max-h-[360px] overflow-y-auto rounded-[10px] border border-line bg-card p-1 shadow-float ${floating ? "absolute inset-x-0 top-[calc(100%+4px)] z-15" : ""}`} role="listbox">
      {header && <li className="mb-1 flex items-center gap-2 border-b border-dashed border-line px-2.5 pt-2 pb-1.5 text-xs text-accent">{header}</li>}
      {status && <li className="px-2.5 py-2 text-[13px] text-muted">{status}</li>}
      {search.books.map((book, i) => (
        <li
          key={book.id}
          role="option"
          aria-selected={i === activeIndex}
          className={`grid cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-2 py-1.5 ${i === activeIndex ? "bg-accent-soft" : ""}`}
          onMouseDown={e => { e.preventDefault(); onPick(book) }}
          onMouseEnter={() => onHover?.(i)}
        >
          <Cover book={book} title={book.title} />
          <div className="min-w-0">
            <div className="font-display font-bold wrap-anywhere">{book.title}</div>
            <div className="text-xs text-muted wrap-anywhere">{bookSummary(book)}</div>
          </div>
          {book.owned && <span className="rounded border border-line px-1 text-[11px] whitespace-nowrap text-muted">登録済み</span>}
        </li>
      ))}
      {footer && <li className="mt-1 border-t border-dashed border-line px-2.5 pt-2 pb-1">{footer}</li>}
    </ul>
  )
}
