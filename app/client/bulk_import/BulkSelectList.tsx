import { bookSummary } from "../bookshelf/text"
import { includedChoice, type Choice, type Row } from "./useBulkRows"

type Props = { rows: Row[]; onChoice: (index: number, choice: Choice) => void }

export default function BulkSelectList({ rows, onChoice }: Props) {
  return (
    <ul className="bulk-review">
      {rows.map((row, index) => (
        <li key={index} className={`bulk-review-item ${row.choice === "skip" ? "bg-paper text-muted" : ""}`}>
          <input
            type="checkbox" className="mt-1" aria-label={`${row.line.title}を登録する`}
            checked={row.choice !== "skip"} disabled={row.state === "pending"}
            onChange={e => {
              if (!e.target.checked) onChoice(index, "skip")
              else if (row.match) onChoice(index, includedChoice(row.match))
            }}
          />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className={`wrap-anywhere ${row.fixed ? "text-[15px] text-ink" : "text-[13px] text-muted"}`}>
              {row.line.title}{row.line.volume ? ` ${row.line.volume}巻` : ""}{!row.fixed && row.line.author && ` / ${row.line.author}`}
            </div>
            {row.fixed && row.match?.candidates[0] ? (
              <span className="text-[13px] text-muted">{bookSummary(row.match.candidates[0])}</span>
            ) : row.state === "pending" ? (
              <span className="text-[13px] text-muted"><span className="spinner" aria-hidden="true" /> 照合しています…</span>
            ) : (
              <select
                className="w-full min-w-0 rounded-md border border-line bg-card px-2 py-1.5" aria-label={`${row.line.title}の登録内容`}
                value={row.choice === "skip" ? "" : String(row.choice)}
                onChange={e => onChoice(index, e.target.value === "free" ? "free" : e.target.value === "" ? "skip" : Number(e.target.value))}
              >
                {row.choice === "skip" && <option value="">登録しない</option>}
                {row.match?.candidates.map((book, i) => (
                  <option key={book.id} value={i} disabled={book.owned}>
                    {book.title}（{bookSummary(book)}）{book.owned ? " — 本棚にあります" : ""}
                  </option>
                ))}
                <option value="free">{row.match?.isbn13 ? `ISBN ${row.match.isbn13} だけで登録（マスタになし）` : `「${row.line.title}」として登録（マスタに紐付けない）`}</option>
              </select>
            )}
            {row.state === "failed" && <span className="text-[13px] text-stamp">照合できませんでした</span>}
            {row.choice === "skip" && row.match?.candidates.find(c => c.close)?.owned && <span className="text-[13px] text-muted">もう本棚にあります</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
