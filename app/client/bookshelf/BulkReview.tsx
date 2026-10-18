import { useEffect, useRef, useState } from "react"
import * as api from "./api"
import { STATUS, STATUS_KEYS, editionSummary } from "./text"
import type { BookAttributes, EditionMatch, ParsedLine, Status } from "./types"

export const MAX_BULK_LINES = 100
const MATCH_CHUNK = 10

type Choice = number | "free" | "skip"
type Row = { line: ParsedLine; match: EditionMatch | null; state: "pending" | "done" | "failed"; choice: Choice }

function defaultChoice(match: EditionMatch): Choice {
  const index = match.candidates.findIndex(c => c.close)
  if (index < 0) return "free"
  return match.candidates[index]?.owned ? "skip" : index
}

function includedChoice(match: EditionMatch): Choice {
  const choice = defaultChoice(match)
  if (choice !== "skip") return choice
  const index = match.candidates.findIndex(c => !c.owned)
  return index >= 0 ? index : "free"
}

function attributesOf(row: Row, status: Status): BookAttributes | null {
  const { line, match, choice } = row
  if (choice === "skip" || !match) return null
  if (typeof choice === "number") {
    const edition = match.candidates[choice]
    return edition ? { edition_id: edition.id, status, tags: line.tags } : null
  }
  if (match.isbn13) return { isbn13: match.isbn13, status, tags: line.tags }
  return { title: line.title, author: line.author, status, tags: line.tags }
}

function uniqueAttributes(rows: Row[], status: Status): BookAttributes[] {
  const seen = new Set<string>()
  return rows.flatMap(row => {
    const attributes = attributesOf(row, status)
    if (!attributes) return []
    const key = attributes.edition_id ? `e${attributes.edition_id}` : attributes.isbn13 ? `i${attributes.isbn13}` : null
    if (key && seen.has(key)) return []
    if (key) seen.add(key)
    return [attributes]
  })
}

type Props = {
  lines: ParsedLine[]
  truncated: number
  initialStatus: Status
  onRegister: (items: BookAttributes[]) => Promise<boolean>
  onClose: () => void
}

export default function BulkReview({ lines, truncated, initialStatus, onRegister, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [rows, setRows] = useState<Row[]>(() => lines.map(line => ({ line, match: null, state: "pending", choice: "skip" })))
  const [status, setStatus] = useState<Status>(initialStatus)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
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
  }, [lines])

  const setChoice = (index: number, choice: Choice) =>
    setRows(current => current.map((row, i) => (i === index ? { ...row, choice } : row)))

  const pending = rows.filter(r => r.state === "pending").length
  const items = uniqueAttributes(rows, status)

  async function register() {
    setBusy(true)
    try {
      if (await onRegister(items)) dialogRef.current?.close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal modal--wide" onClose={onClose}>
      <h2 className="modal__title">まとめて登録</h2>
      <p className="modal__lead">
        本のマスタと照合しました。違う版は選び直せます。本棚にある本は外し、マスタで見つからない本は書名だけで登録します。
        {truncated > 0 && `（一度に確認できるのは${MAX_BULK_LINES}冊までなので、残りの${truncated}冊は含めていません）`}
      </p>
      <ul className="bulk-review">
        {rows.map((row, index) => (
          <li key={index} className={`bulk-review__item${row.choice === "skip" ? " bulk-review__item--skipped" : ""}`}>
            <input
              type="checkbox" className="bulk-review__check" aria-label={`${row.line.title}を登録する`}
              checked={row.choice !== "skip"} disabled={row.state === "pending"}
              onChange={e => {
                if (!e.target.checked) setChoice(index, "skip")
                else if (row.match) setChoice(index, includedChoice(row.match))
              }}
            />
            <div className="bulk-review__body">
              <div className="bulk-review__source">{row.line.title}{row.line.volume ? ` ${row.line.volume}巻` : ""}{row.line.author && ` / ${row.line.author}`}</div>
              {row.state === "pending" ? (
                <span className="bulk-review__note"><span className="spinner" aria-hidden="true" /> 照合しています…</span>
              ) : (
                <select
                  className="bulk-review__select" aria-label={`${row.line.title}の登録内容`}
                  value={row.choice === "skip" ? "" : String(row.choice)}
                  onChange={e => setChoice(index, e.target.value === "free" ? "free" : e.target.value === "" ? "skip" : Number(e.target.value))}
                >
                  {row.choice === "skip" && <option value="">登録しない</option>}
                  {row.match?.candidates.map((edition, i) => (
                    <option key={edition.id} value={i} disabled={edition.owned}>
                      {edition.title}（{editionSummary(edition)}）{edition.owned ? " — 本棚にあります" : ""}
                    </option>
                  ))}
                  <option value="free">{row.match?.isbn13 ? `ISBN ${row.match.isbn13} だけで登録（マスタになし）` : `「${row.line.title}」として登録（マスタに紐付けない）`}</option>
                </select>
              )}
              {row.state === "failed" && <span className="bulk-review__note bulk-review__note--error">照合できませんでした</span>}
              {row.choice === "skip" && row.match?.candidates.find(c => c.close)?.owned && <span className="bulk-review__note">もう本棚にあります</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="modal__actions bulk-review__actions">
        <div className="segmented" role="group" aria-label="登録時の状態">
          {STATUS_KEYS.map(key => (
            <button
              key={key} type="button" aria-pressed={status === key}
              className={`segmented__option${status === key ? " segmented__option--active" : ""}`}
              onClick={() => setStatus(key)}
            >{STATUS[key]}</button>
          ))}
        </div>
        <button className="button" type="button" onClick={() => dialogRef.current?.close()}>やめる</button>
        <button className="button button--primary" type="button" disabled={busy || pending > 0 || !items.length} onClick={register}>
          {pending > 0 ? `照合中（残り${pending}冊）` : `${items.length}冊を登録`}
        </button>
      </div>
    </dialog>
  )
}
