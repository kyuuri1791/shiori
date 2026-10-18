import { useEffect, useState } from "react"
import * as api from "../bookshelf/api"
import { authorLine, editionSummary } from "../bookshelf/text"
import type { BookAttributes, Edition, EditionMatch, ParsedLine } from "../bookshelf/types"

export const MAX_BULK_BOOKS = 100
const MATCH_CHUNK = 10

export type Choice = number | "free" | "skip"
export type Row = { line: ParsedLine; match: EditionMatch | null; state: "pending" | "done" | "failed"; choice: Choice; fixed: boolean }
export type BulkSource = { kind: "lines"; lines: ParsedLine[] } | { kind: "editions"; editions: Edition[] }
export type Selected = { key: string; title: string; detail: string; attributes: BookAttributes }

function defaultChoice(match: EditionMatch): Choice {
  const index = match.candidates.findIndex(c => c.close)
  if (index < 0) return "free"
  return match.candidates[index]?.owned ? "skip" : index
}

export function includedChoice(match: EditionMatch): Choice {
  const choice = defaultChoice(match)
  if (choice !== "skip") return choice
  const index = match.candidates.findIndex(c => !c.owned)
  return index >= 0 ? index : "free"
}

function initialRows(source: BulkSource): Row[] {
  if (source.kind === "lines") return source.lines.map(line => ({ line, match: null, state: "pending", choice: "skip", fixed: false }))
  return source.editions.map(edition => {
    const match = { isbn13: edition.isbn13, candidates: [{ ...edition, close: true }] }
    return { line: { title: edition.title, author: authorLine(edition.authors), tags: [] }, match, state: "done", choice: defaultChoice(match), fixed: true }
  })
}

function selectedOf(row: Row): Selected | null {
  const { line, match, choice } = row
  if (choice === "skip" || !match) return null
  if (typeof choice === "number") {
    const edition = match.candidates[choice]
    if (!edition) return null
    return { key: `e${edition.id}`, title: edition.title, detail: editionSummary(edition), attributes: { edition_id: edition.id, tags: line.tags } }
  }
  if (match.isbn13) return { key: `i${match.isbn13}`, title: `ISBN ${match.isbn13}`, detail: "本のマスタにないので ISBN だけで登録します", attributes: { isbn13: match.isbn13, tags: line.tags } }
  return { key: `t${line.title}/${line.author}`, title: line.title, detail: "本のマスタに紐付けずに登録します", attributes: { title: line.title, author: line.author, tags: line.tags } }
}

export default function useBulkRows(source: BulkSource | null) {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    setRows(source ? initialRows(source) : [])
    if (source?.kind !== "lines") return
    const { lines } = source
    const controller = new AbortController()
    async function matchAll() {
      for (let start = 0; start < lines.length; start += MATCH_CHUNK) {
        const chunk = lines.slice(start, start + MATCH_CHUNK)
        let matches: EditionMatch[] | null = null
        try {
          matches = await api.matchEditions(chunk, controller.signal)
        } catch {
          if (controller.signal.aborted) return
        }
        setRows(current => current.map((row, i) => {
          if (i < start || i >= start + chunk.length) return row
          const match = matches?.[i - start]
          if (!match) return { ...row, match: { isbn13: null, candidates: [] }, state: "failed", choice: "free" }
          return { ...row, match, state: "done", choice: defaultChoice(match) }
        }))
      }
    }
    matchAll()
    return () => controller.abort()
  }, [source])

  const setChoice = (index: number, choice: Choice) =>
    setRows(current => current.map((row, i) => (i === index ? { ...row, choice } : row)))
  const setAll = (included: boolean) =>
    setRows(current => current.map(row => (row.match ? { ...row, choice: included ? includedChoice(row.match) : "skip" } : row)))

  const seen = new Set<string>()
  const selected = rows.flatMap(row => {
    const item = selectedOf(row)
    if (!item || seen.has(item.key)) return []
    seen.add(item.key)
    return [item]
  })
  const pending = rows.filter(r => r.state === "pending").length

  return { rows, pending, selected, setChoice, setAll }
}
