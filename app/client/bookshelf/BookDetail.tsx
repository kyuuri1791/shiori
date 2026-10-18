import { useRef } from "react"
import { STATUS, editionSummary, externalTargetOfBook } from "./text"
import Cover from "./Cover"
import ExternalLink from "./ExternalLink"
import useCloseOnOutsideClick from "./useCloseOnOutsideClick"
import type { Book } from "./types"

const stars = (n: number): string => "★".repeat(n) + "☆".repeat(5 - n)

type Props = { book: Book | null; onClose: () => void }

export default function BookDetail({ book, onClose }: Props) {
  const last = useRef(book)
  if (book) last.current = book
  const shown = book ?? last.current
  const ref = useCloseOnOutsideClick<HTMLElement>(!!book, onClose)
  return (
    <aside ref={ref} className={`drawer${book ? " drawer--open" : ""}`} aria-label="本の詳細" inert={!book}>
      {shown && (
        <>
          <div className="drawer__head">
            <span>読書カード</span>
            <button className="button button--small" type="button" onClick={onClose}>閉じる</button>
          </div>
          <div className="drawer__body">
            <h2 className="drawer__heading">{shown.title}</h2>
            {shown.author && (
              <div className="field">
                <span className="field__label">著者</span>
                <p className="field__text">{shown.author}</p>
              </div>
            )}
            <div className={`edition-card${shown.edition ? "" : " edition-card--unmatched"}`}>
              {shown.edition && <Cover edition={shown.edition} title={shown.edition.title} large />}
              <div className="edition-card__body">
                {shown.edition && (
                  <>
                    <strong>{shown.edition.title}</strong>
                    <span>{editionSummary(shown.edition)}</span>
                    {shown.edition.isbn13 && <span className="edition-card__isbn">ISBN {shown.edition.isbn13}</span>}
                  </>
                )}
                <ExternalLink target={externalTargetOfBook(shown)} />
              </div>
            </div>
            <div className="drawer__pair">
              <div className="field">
                <span className="field__label">状態</span>
                <span><span className={`status-pill status-pill--${shown.status}`}>{STATUS[shown.status]}</span></span>
              </div>
              {shown.rating > 0 && (
                <div className="field">
                  <span className="field__label">評価</span>
                  <span className="book-row__stars" aria-label={`評価${shown.rating}`}>{stars(shown.rating)}</span>
                </div>
              )}
            </div>
            {shown.reading_dates.length > 0 && (
              <div className="field">
                <span className="field__label">読了日</span>
                <p className="field__text">{shown.reading_dates.map((d, i) => `${i + 1}回目 ${d.replaceAll("-", ".")}`).join(" / ")}</p>
              </div>
            )}
            {shown.tags.length > 0 && (
              <div className="field">
                <span className="field__label">タグ</span>
                <p className="field__text">{shown.tags.map(t => `#${t}`).join(" ")}</p>
              </div>
            )}
            {shown.review && (
              <div className="field">
                <span className="field__label">感想</span>
                <p className="field__text">{shown.review}</p>
              </div>
            )}
            {shown.notes.length > 0 && (
              <div className="field">
                <span className="field__label">読みながらメモ</span>
                <ul className="note-list">
                  {[...shown.notes].reverse().map(n => (
                    <li className="note-list__item note-list__item--static" key={n.t}>
                      <span className="note-list__date">{new Date(n.t).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
                      <p className="note-list__text">{n.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
