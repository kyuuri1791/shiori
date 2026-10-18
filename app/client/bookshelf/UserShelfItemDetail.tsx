import { useRef } from "react"
import StatusPill from "./StatusPill"
import { bookSummary, externalTargetOfUserShelfItem } from "./text"
import Cover from "./Cover"
import { drawerClass, DRAWER_HEAD, DRAWER_BODY, DRAWER_PAIR, FIELD, FIELD_TEXT, BOOK_CARD, BOOK_CARD_UNMATCHED, BOOK_CARD_BODY, BOOK_CARD_ISBN, NOTE_LIST, NOTE_DATE, NOTE_TEXT, STARS } from "./drawerStyles"
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
    <aside ref={ref} className={drawerClass(!!userShelfItem)} aria-label="本の詳細" inert={!userShelfItem}>
      {shown && (
        <>
          <div className={DRAWER_HEAD}>
            <span>読書カード</span>
            <button className="btn btn-small" type="button" onClick={onClose}>閉じる</button>
          </div>
          <div className={DRAWER_BODY}>
            <h2 className="m-0 font-display text-xl font-bold wrap-anywhere">{shown.title}</h2>
            {shown.author && (
              <div className={FIELD}>
                <span className="field-label">著者</span>
                <p className={FIELD_TEXT}>{shown.author}</p>
              </div>
            )}
            <div className={shown.book ? BOOK_CARD : BOOK_CARD_UNMATCHED}>
              {shown.book && <Cover book={shown.book} title={shown.book.title} large />}
              <div className={BOOK_CARD_BODY}>
                {shown.book && (
                  <>
                    <strong>{shown.book.title}</strong>
                    <span>{bookSummary(shown.book)}</span>
                    {shown.book.isbn13 && <span className={BOOK_CARD_ISBN}>ISBN {shown.book.isbn13}</span>}
                  </>
                )}
                <ExternalLink target={externalTargetOfUserShelfItem(shown)} />
              </div>
            </div>
            <div className={DRAWER_PAIR}>
              <div className={FIELD}>
                <span className="field-label">状態</span>
                <span><StatusPill status={shown.status} /></span>
              </div>
              {shown.rating > 0 && (
                <div className={FIELD}>
                  <span className="field-label">評価</span>
                  <span className={STARS} aria-label={`評価${shown.rating}`}>{stars(shown.rating)}</span>
                </div>
              )}
            </div>
            {shown.reading_dates.length > 0 && (
              <div className={FIELD}>
                <span className="field-label">読了日</span>
                <p className={FIELD_TEXT}>{shown.reading_dates.map((d, i) => `${i + 1}回目 ${d.replaceAll("-", ".")}`).join(" / ")}</p>
              </div>
            )}
            {shown.tags.length > 0 && (
              <div className={FIELD}>
                <span className="field-label">タグ</span>
                <p className={FIELD_TEXT}>{shown.tags.map(t => `#${t}`).join(" ")}</p>
              </div>
            )}
            {shown.review && (
              <div className={FIELD}>
                <span className="field-label">感想</span>
                <p className={FIELD_TEXT}>{shown.review}</p>
              </div>
            )}
            {shown.notes.length > 0 && (
              <div className={FIELD}>
                <span className="field-label">読みながらメモ</span>
                <ul className={NOTE_LIST}>
                  {[...shown.notes].reverse().map(n => (
                    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2.5 text-sm" key={n.t}>
                      <span className={NOTE_DATE}>{new Date(n.t).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}</span>
                      <p className={NOTE_TEXT}>{n.text}</p>
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
