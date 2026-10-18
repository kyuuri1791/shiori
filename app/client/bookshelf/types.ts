export type Status = "reading" | "read" | "want"

export type Note = { t: number; text: string }

export type Edition = {
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

export type Book = {
  id: number
  edition_id: number | null
  isbn13: string | null
  title: string
  author: string
  status: Status
  rating: number
  tags: string[]
  review: string
  notes: Note[]
  reading_dates: string[]
  edition: Edition | null
  discarded: boolean
  created_at: number
}

export type BookAttributes = Partial<Pick<Book, "title" | "author" | "status" | "rating" | "tags" | "review" | "notes" | "reading_dates" | "edition_id" | "isbn13">>

export type BatchOp =
  | { op: "create"; attributes: BookAttributes }
  | { op: "update"; id: number; attributes: BookAttributes }
  | { op: "destroy"; id: number }

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
  books: Book[]
  page: PageInfo
  facets: Facets
  filters: Filters
}

export type AiTarget = "latest" | "first" | "volume" | "any"

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
  editions: Edition[]
  error: string | null
}

export type EditionMatch = { isbn13: string | null; candidates: Edition[] }

export type IsbnLookup = {
  edition: Edition | null
  owned_book: { id: number; title: string } | null
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

export type UpdateBook = (id: number, attributes: BookAttributes, label: string) => unknown
export type SaveBook = (id: number, attributes: BookAttributes) => Promise<Book[] | null>

export type ViewerMode = "owner" | "readonly" | "guest"

export type Viewer = { mode: ViewerMode; owner_id: number | null; signed_in: boolean; is_owner: boolean }

export type BookshelfPage = ShelfPage & { viewer: Viewer }
