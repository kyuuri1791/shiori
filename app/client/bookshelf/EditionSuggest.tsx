import { useEffect, useState, type ReactNode } from "react"
import { searchEditions } from "./api"
import { editionSummary } from "./text"
import Cover from "./Cover"
import type { Edition } from "./types"

export type EditionSearchState = { editions: Edition[]; loading: boolean; error: string | null; searched: string }

export const IDLE_SEARCH: EditionSearchState = { editions: [], loading: false, error: null, searched: "" }

export type Searcher = (query: string, signal: AbortSignal, author: string) => Promise<Edition[]>

export function useEditionSearch(query: string, enabled: boolean, author = "", searcher: Searcher = searchEditions): EditionSearchState {
  const [state, setState] = useState<EditionSearchState>(IDLE_SEARCH)

  useEffect(() => {
    const q = query.trim()
    if (!enabled || q.length < 2) { setState(IDLE_SEARCH); return }
    const controller = new AbortController()
    setState(s => ({ ...s, loading: true, error: null }))
    const timer = setTimeout(() => {
      searcher(q, controller.signal, author.trim())
        .then(editions => setState({ editions, loading: false, error: null, searched: q }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setState({ editions: [], loading: false, error: error instanceof Error ? error.message : "検索に失敗しました", searched: q })
        })
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, enabled, author])

  return state
}

type Props = {
  search: EditionSearchState
  activeIndex?: number
  floating?: boolean
  emptyText: string
  header?: ReactNode
  footer?: ReactNode
  onPick: (edition: Edition) => void
  onHover?: (index: number) => void
}

export default function EditionSuggest({ search, activeIndex = -1, floating = false, emptyText, header, footer, onPick, onHover }: Props) {
  let status: string | null = null
  if (search.loading && !search.editions.length) status = "候補を探しています…"
  else if (search.error) status = search.error
  else if (search.searched && !search.editions.length) status = emptyText

  if (!status && !search.editions.length && !header) return null

  return (
    <ul className={`suggest${floating ? " suggest--floating" : ""}`} role="listbox">
      {header && <li className="suggest__header">{header}</li>}
      {status && <li className="suggest__status">{status}</li>}
      {search.editions.map((edition, i) => (
        <li
          key={edition.id}
          role="option"
          aria-selected={i === activeIndex}
          className={`suggest__item${i === activeIndex ? " suggest__item--active" : ""}`}
          onMouseDown={e => { e.preventDefault(); onPick(edition) }}
          onMouseEnter={() => onHover?.(i)}
        >
          <Cover edition={edition} title={edition.title} />
          <div className="suggest__body">
            <div className="suggest__title">{edition.title}</div>
            <div className="suggest__meta">{editionSummary(edition)}</div>
          </div>
          {edition.owned && <span className="suggest__badge">登録済み</span>}
        </li>
      ))}
      {footer && <li className="suggest__footer">{footer}</li>}
    </ul>
  )
}
