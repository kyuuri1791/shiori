export type Status = "reading" | "read" | "want"

export type Note = { t: number; text: string }

export type Book = {
  id: number
  isbn13: string | null
  title: string
  authors: string[]
  publisher: string | null
  published_on: string | null
  cover_url: string | null
  owned?: boolean
  close?: boolean
}

export type UserShelfItem = {
  id: number
  book_id: number | null
  isbn13: string | null
  title: string
  author: string
  status: Status
  rating: number
  tags: string[]
  review: string
  notes: Note[]
  reading_dates: string[]
  book: Book | null
  discarded: boolean
  created_at: number
}

export type UserShelfItemAttributes = Partial<Pick<UserShelfItem, "title" | "author" | "status" | "rating" | "tags" | "review" | "notes" | "reading_dates" | "book_id" | "isbn13">>

export type PageSeriesItem = number | string

export type PageInfo = {
  count: number
  page: number
  last: number
  previous?: number
  next?: number
  from: number
  to: number
  series: PageSeriesItem[]
}

export type Facets = {
  counts: Record<"all" | Status, number>
  tags: { tag: string; count: number }[]
  unmatched: number
}

export type StatusFilter = "all" | Status

export type SortKey = "added" | "read_on" | "title" | "author" | "rating"

export type Filters = {
  status: StatusFilter
  tag: string | null
  unmatched: boolean
  q: string
  sort: SortKey
  page: number
}

export type ShelfPage = {
  user_shelf_items: UserShelfItem[]
  page: PageInfo
  facets: Facets
  filters: Filters
}

export type AiTarget = "latest" | "first" | "volume" | "all" | "any"

export type AiGuess = { title: string; author: string | null }

export type AiInterpretation = {
  titles: string[]
  author: string | null
  target: AiTarget
  volume: number | null
  guesses?: AiGuess[]
}

export type AiSearchStatus = "pending" | "succeeded" | "failed"

export type AiSearch = {
  id: number
  status: AiSearchStatus
  query: string
  interpretation: AiInterpretation | null
  books: Book[]
  error: string | null
}

export type BookMatch = { isbn13: string | null; candidates: Book[] }

export type IsbnLookup = {
  book: Book | null
  owned_user_shelf_item: { id: number; title: string } | null
}

export type ParsedLine = { title: string; author: string; tags: string[]; volume?: number | null }

export type ShelfPhotoBook = { title: string; author: string | null; volume: number | null }

export type ShelfPhotoScan = {
  id: number
  status: "pending" | "succeeded" | "failed"
  books: ShelfPhotoBook[]
  error: string | null
}

export type AddResult = { state: "added" | "unmatched" | "owned" | "failed"; title: string }

export type ToastState = { message: string; undoable: boolean; key: number }

export type UpdateUserShelfItem = (id: number, attributes: UserShelfItemAttributes, label: string) => unknown
export type SaveUserShelfItem = (id: number, attributes: UserShelfItemAttributes) => Promise<UserShelfItem | null>

export type ViewerMode = "owner" | "readonly" | "guest"

export type Viewer = { mode: ViewerMode; owner_id: number | null; signed_in: boolean; is_owner: boolean }

export type BookshelfPage = ShelfPage & { viewer: Viewer }
