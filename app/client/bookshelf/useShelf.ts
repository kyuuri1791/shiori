import { useEffect, useRef, useState } from "react"
import type { Book, Facets, Filters, PageInfo, ShelfPage } from "./types"

export type Shelf = { books: Book[]; page: PageInfo; facets: Facets }
export type FetchShelf = (filters: Filters, signal: AbortSignal) => Promise<ShelfPage>

const SEARCH_DELAY_MS = 300

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError"
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "エラーが起きました")

function syncUrl(filters: Filters): void {
  const params = new URLSearchParams()
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.unmatched) params.set("unmatched", "1")
  if (filters.q) params.set("q", filters.q)
  if (filters.sort !== "added") params.set("sort", filters.sort)
  if (filters.page > 1) params.set("page", String(filters.page))
  const search = params.toString()
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname)
}

export default function useShelf(initial: ShelfPage, fetchShelf: FetchShelf) {
  const [shelf, setShelf] = useState<Shelf>({ books: initial.books, page: initial.page, facets: initial.facets })
  const [filters, setFilters] = useState<Filters>(initial.filters)
  const [query, setQuery] = useState(initial.filters.q)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shelfRef = useRef(shelf)
  const filtersRef = useRef(filters)
  const loadController = useRef<AbortController | null>(null)
  const firstRender = useRef(true)
  shelfRef.current = shelf
  filtersRef.current = filters

  async function load(next: Filters = filtersRef.current): Promise<void> {
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller
    setLoading(true)
    try {
      const data = await fetchShelf(next, controller.signal)
      if (data.page.count > 0 && data.page.page > data.page.last) {
        setFilters(f => ({ ...f, page: data.page.last }))
        return
      }
      setShelf({ books: data.books, page: data.page, facets: data.facets })
      setError(null)
    } catch (e) {
      if (!isAbort(e)) setError(messageOf(e))
    } finally {
      if (loadController.current === controller) setLoading(false)
    }
  }

  useEffect(() => {
    syncUrl(filters)
    if (firstRender.current) { firstRender.current = false; return }
    load(filters)
  }, [filters])

  useEffect(() => {
    const q = query.trim()
    if (q === filtersRef.current.q) return
    const timer = setTimeout(() => setFilters(f => ({ ...f, q, page: 1 })), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query])

  const changeFilters = (patch: Partial<Filters>) => setFilters(f => ({ ...f, ...patch, page: patch.page ?? 1 }))

  return { shelf, setShelf, shelfRef, filters, filtersRef, changeFilters, query, setQuery, loading, error, setError, load }
}
