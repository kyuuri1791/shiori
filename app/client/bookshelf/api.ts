import type { AiSearch, UserShelfItem, UserShelfItemAttributes, Book, BookMatch, Filters, IsbnLookup, ParsedLine, ShelfPage, ShelfPhotoScan } from "./types"

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

export async function createUserShelfItem(attributes: UserShelfItemAttributes): Promise<UserShelfItem> {
  const body = await request<{ user_shelf_item: UserShelfItem }>("/api/user_shelf_items", jsonPost({ user_shelf_item: attributes }))
  return body.user_shelf_item
}

export async function updateUserShelfItem(id: number, attributes: UserShelfItemAttributes): Promise<UserShelfItem> {
  const body = await request<{ user_shelf_item: UserShelfItem }>(`/api/user_shelf_items/${id}`, { ...jsonPost({ user_shelf_item: attributes }), method: "PATCH" })
  return body.user_shelf_item
}

export async function destroyUserShelfItem(id: number, { keepalive = false }: { keepalive?: boolean } = {}): Promise<UserShelfItem> {
  const body = await request<{ user_shelf_item: UserShelfItem }>(`/api/user_shelf_items/${id}`, { method: "DELETE", keepalive })
  return body.user_shelf_item
}

export async function createUserShelfItemsInBulk(userShelfItems: UserShelfItemAttributes[]): Promise<UserShelfItem[]> {
  const body = await request<{ user_shelf_items: UserShelfItem[] }>("/api/user_shelf_items_bulk", jsonPost({ user_shelf_items: userShelfItems }))
  return body.user_shelf_items
}

export async function searchBooks(query: string, signal?: AbortSignal, author = ""): Promise<Book[]> {
  const params = new URLSearchParams({ q: query })
  if (author) params.set("author", author)
  const body = await request<{ books: Book[] }>(`/api/books/search?${params}`, { signal })
  return body.books
}

export async function matchBooks(lines: ParsedLine[], signal?: AbortSignal): Promise<BookMatch[]> {
  const items = lines.map(({ title, author, volume }) => ({ title, author, volume: volume ?? null }))
  const body = await request<{ matches: BookMatch[] }>("/api/book_matches", { ...jsonPost({ items }), signal })
  return body.matches
}

export function lookupIsbn(isbn: string): Promise<IsbnLookup> {
  return request<IsbnLookup>(`/api/books/lookup?isbn=${encodeURIComponent(isbn)}`)
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
  return request<ShelfPage>(`/api/user_shelf_items?${shelfParams(filters)}`, { signal })
}

export function fetchPublicShelf(ownerId: number, filters: Filters, signal?: AbortSignal): Promise<ShelfPage> {
  return request<ShelfPage>(`/api/public/users/${ownerId}/user_shelf_items?${shelfParams(filters)}`, { signal })
}

export async function searchPublicBooks(query: string, signal?: AbortSignal): Promise<Book[]> {
  const body = await request<{ books: Book[] }>(`/api/public/books/search?${new URLSearchParams({ q: query })}`, { signal })
  return body.books
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
