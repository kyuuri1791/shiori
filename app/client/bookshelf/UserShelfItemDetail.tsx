import { useRef } from "react"
import { STATUS, bookSummary, externalTargetOfUserShelfItem } from "./text"
import Cover from "./Cover"
import ExternalLink from "./ExternalLink"
import useCloseOnOutsideClick from "./useCloseOnOutsideClick"
import type { UserShelfItem } from "./types"

const stars = (n: number): string => "★".repeat(n) + "☆".repeat(5 - n)

type Props = { userShelfItem: UserShelfItem | null; onClose: () => void }

export default function UserShelfItemDetail({ userShelfItem, onClose }: Props) {
  const last = useRef(userShelfItem)
  if (userShelfItem) last.current = userShelfItem
  const shown = userShelfItem ?? last.current
  const ref = useCloseOnOutsideClick<HTMLElement>(!!userShelfItem, onClose)
  return (
    <aside ref={ref} className={`drawer${userShelfItem ? " drawer--open" : ""}`} aria-label="本の詳細" inert={!userShelfItem}>
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
            <div className={`bookCard${shown.book ? "" : " bookCard--unmatched"}`}>
              {shown.book && <Cover book={shown.book} title={shown.book.title} large />}
              <div className="bookCard__body">
                {shown.book && (
                  <>
                    <strong>{shown.book.title}</strong>
                    <span>{bookSummary(shown.book)}</span>
                    {shown.book.isbn13 && <span className="bookCard__isbn">ISBN {shown.book.isbn13}</span>}
                  </>
                )}
                <ExternalLink target={externalTargetOfUserShelfItem(shown)} />
              </div>
            </div>
            <div className="drawer__pair">
              <div className="field">
                <span className="field__label">状態</span>
                <span><span className={`statusPill statusPill--${shown.status}`}>{STATUS[shown.status]}</span></span>
              </div>
              {shown.rating > 0 && (
                <div className="field">
                  <span className="field__label">評価</span>
                  <span className="userShelfItemRow__stars" aria-label={`評価${shown.rating}`}>{stars(shown.rating)}</span>
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
                <ul className="noteList">
                  {[...shown.notes].reverse().map(n => (
                    <li className="noteList__item noteList__item--static" key={n.t}>
                      <span className="noteList__date">{new Date(n.t).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
                      <p className="noteList__text">{n.text}</p>
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
