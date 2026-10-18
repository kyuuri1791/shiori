import type { AiSearch, Book, BookAttributes, Edition, EditionMatch, Filters, IsbnLookup, ParsedLine, ShelfPage, ShelfPhotoScan } from "./types"

const csrfToken = (): string => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""

async function request<T>(url: string, { headers, ...options }: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "X-CSRF-Token": csrfToken(), ...headers },
  })
  const body: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : null
    throw new Error(message ?? `通信に失敗しました（${res.status}）`)
  }
  return body as T
}

const jsonPost = (payload: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})

export async function createBook(attributes: BookAttributes): Promise<Book> {
  const body = await request<{ book: Book }>("/api/books", jsonPost({ book: attributes }))
  return body.book
}

export async function updateBook(id: number, attributes: BookAttributes): Promise<Book> {
  const body = await request<{ book: Book }>(`/api/books/${id}`, { ...jsonPost({ book: attributes }), method: "PATCH" })
  return body.book
}

export async function destroyBook(id: number, { keepalive = false }: { keepalive?: boolean } = {}): Promise<Book> {
  const body = await request<{ book: Book }>(`/api/books/${id}`, { method: "DELETE", keepalive })
  return body.book
}

export async function createBooksInBulk(books: BookAttributes[]): Promise<Book[]> {
  const body = await request<{ books: Book[] }>("/api/books_bulk", jsonPost({ books }))
  return body.books
}

export async function searchEditions(query: string, signal?: AbortSignal, author = ""): Promise<Edition[]> {
  const params = new URLSearchParams({ q: query })
  if (author) params.set("author", author)
  const body = await request<{ editions: Edition[] }>(`/api/editions/search?${params}`, { signal })
  return body.editions
}

export async function matchEditions(lines: ParsedLine[], signal?: AbortSignal): Promise<EditionMatch[]> {
  const items = lines.map(({ title, author, volume }) => ({ title, author, volume: volume ?? null }))
  const body = await request<{ matches: EditionMatch[] }>("/api/edition_matches", { ...jsonPost({ items }), signal })
  return body.matches
}

export function lookupIsbn(isbn: string): Promise<IsbnLookup> {
  return request<IsbnLookup>(`/api/editions/lookup?isbn=${encodeURIComponent(isbn)}`)
}

function shelfParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.unmatched) params.set("unmatched", "1")
  if (filters.q) params.set("q", filters.q)
  if (filters.sort !== "added") params.set("sort", filters.sort)
  if (filters.page > 1) params.set("page", String(filters.page))
  return params
}

export function fetchShelf(filters: Filters, signal?: AbortSignal): Promise<ShelfPage> {
  return request<ShelfPage>(`/api/books?${shelfParams(filters)}`, { signal })
}

export function fetchPublicShelf(ownerId: number, filters: Filters, signal?: AbortSignal): Promise<ShelfPage> {
  return request<ShelfPage>(`/api/public/users/${ownerId}/books?${shelfParams(filters)}`, { signal })
}

export async function searchPublicEditions(query: string, signal?: AbortSignal): Promise<Edition[]> {
  const body = await request<{ editions: Edition[] }>(`/api/public/editions/search?${new URLSearchParams({ q: query })}`, { signal })
  return body.editions
}

export function startAiSearch(q: string): Promise<AiSearch> {
  return request<AiSearch>("/api/ai_searches", jsonPost({ q }))
}

export function getAiSearch(id: number, signal?: AbortSignal): Promise<AiSearch> {
  return request<AiSearch>(`/api/ai_searches/${id}`, { signal })
}

export function startShelfPhotoScan(image: Blob, signal?: AbortSignal): Promise<ShelfPhotoScan> {
  const body = new FormData()
  body.append("image", image, "shelf.jpg")
  return request<ShelfPhotoScan>("/api/shelf_photo_scans", { method: "POST", body, signal })
}

export function getShelfPhotoScan(id: number, signal?: AbortSignal): Promise<ShelfPhotoScan> {
  return request<ShelfPhotoScan>(`/api/shelf_photo_scans/${id}`, { signal })
}
