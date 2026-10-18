import type { UserShelfItem, Book, Status } from "./types"

export const STATUS: Record<Status, string> = { reading: "読んでる", read: "読んだ", want: "読みたい" }
export const STATUS_KEYS = Object.keys(STATUS) as Status[]
export const NEXT_STATUS: Record<Status, Status> = { want: "reading", reading: "read", read: "want" }

export const today = (): string => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const lastReadOn = (userShelfItem: UserShelfItem): string | null => userShelfItem.reading_dates.at(-1) ?? null

export const authorLine = (authors: string[]): string =>
  [authors.slice(0, 2).join("、"), authors.length > 2 ? "ほか" : null].filter(Boolean).join(" ")

export const bookSummary = (book: Book): string =>
  [authorLine(book.authors), book.publisher, book.published_on?.slice(0, 4)].filter(Boolean).join(" · ")

export function normalizeIsbn(text: string): string | null {
  const digits = text.replace(/[^\dXx]/g, "").toUpperCase()
  if (/^97[89]\d{10}$/.test(digits)) return digits
  if (!/^\d{9}[\dX]$/.test(digits)) return null
  const base = `978${digits.slice(0, 9)}`
  const sum = [...base].reduce((n, c, i) => n + Number(c) * (i % 2 ? 3 : 1), 0)
  return `${base}${(10 - (sum % 10)) % 10}`
}

export function looksLikeIsbn(text: string): boolean {
  const t = text.trim()
  if (!/^[\d\-\sXx]+$/.test(t)) return false
  return [10, 13].includes(t.replace(/[^\dXx]/g, "").length)
}

export type ExternalTarget = { isbn13: string | null; title: string; author: string }

export const externalTargetOfUserShelfItem = (userShelfItem: UserShelfItem): ExternalTarget =>
  ({ isbn13: userShelfItem.book?.isbn13 ?? userShelfItem.isbn13, title: userShelfItem.title, author: userShelfItem.author })

export const externalTargetOfBook = (book: Book): ExternalTarget =>
  ({ isbn13: book.isbn13, title: book.title, author: authorLine(book.authors) })

export function googleBooksUrl({ isbn13, title, author }: ExternalTarget): string {
  if (isbn13) return `https://books.google.co.jp/books?vid=ISBN${encodeURIComponent(isbn13)}`
  const query = [title, author].filter(Boolean).join(" ")
  return `https://www.google.co.jp/search?tbm=bks&q=${encodeURIComponent(query)}`
}
