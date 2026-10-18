import { bookSummary } from "../bookshelf/text"
import { includedChoice, type Choice, type Row } from "./useBulkRows"

type Props = { rows: Row[]; onChoice: (index: number, choice: Choice) => void }

export default function BulkSelectList({ rows, onChoice }: Props) {
  return (
    <ul className="bulkReview">
      {rows.map((row, index) => (
        <li key={index} className={`bulkReview__item${row.choice === "skip" ? " bulkReview__item--skipped" : ""}`}>
          <input
            type="checkbox" className="bulkReview__check" aria-label={`${row.line.title}を登録する`}
            checked={row.choice !== "skip"} disabled={row.state === "pending"}
            onChange={e => {
              if (!e.target.checked) onChoice(index, "skip")
              else if (row.match) onChoice(index, includedChoice(row.match))
            }}
          />
          <div className="bulkReview__body">
            <div className={`bulkReview__source${row.fixed ? " bulkReview__source--title" : ""}`}>
              {row.line.title}{row.line.volume ? ` ${row.line.volume}巻` : ""}{!row.fixed && row.line.author && ` / ${row.line.author}`}
            </div>
            {row.fixed && row.match?.candidates[0] ? (
              <span className="bulkReview__note">{bookSummary(row.match.candidates[0])}</span>
            ) : row.state === "pending" ? (
              <span className="bulkReview__note"><span className="spinner" aria-hidden="true" /> 照合しています…</span>
            ) : (
              <select
                className="bulkReview__select" aria-label={`${row.line.title}の登録内容`}
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
            {row.state === "failed" && <span className="bulkReview__note bulkReview__note--error">照合できませんでした</span>}
            {row.choice === "skip" && row.match?.candidates.find(c => c.close)?.owned && <span className="bulkReview__note">もう本棚にあります</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
