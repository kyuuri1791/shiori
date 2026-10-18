import { STATUS, lastReadOn } from "./text"
import Cover from "./Cover"
import type { UserShelfItem } from "./types"

const stars = (n: number): string => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "")

type RowHandlers = {
  onOpen: (id: number) => void
  onCycle: (userShelfItem: UserShelfItem) => void
}

type RowProps = RowHandlers & { userShelfItem: UserShelfItem; open: boolean; readOnly: boolean }

function UserShelfItemRow({ userShelfItem, open, readOnly, onOpen, onCycle }: RowProps) {
  const last = lastReadOn(userShelfItem)
  const readCount = userShelfItem.reading_dates.length
  return (
    <div className={`userShelfItemRow${open ? " userShelfItemRow--open" : ""}`} data-keeps-drawer-open onClick={() => onOpen(userShelfItem.id)}>
      <Cover book={userShelfItem.book} title={userShelfItem.title} />
      <div className="userShelfItemRow__main">
        <div className="userShelfItemRow__title">{userShelfItem.title}</div>
        <div className="userShelfItemRow__meta">
          {userShelfItem.author && <span>{userShelfItem.author}</span>}
          {userShelfItem.tags.map(t => <span key={t} className="userShelfItemRow__tag">#{t}</span>)}
          {!userShelfItem.book && <span className="userShelfItemRow__unmatched" title="本のマスタに紐付いていません">未照合</span>}
        </div>
      </div>
      <div className="userShelfItemRow__side">
        {userShelfItem.rating > 0 && <span className="userShelfItemRow__stars" aria-label={`評価${userShelfItem.rating}`}>{stars(userShelfItem.rating)}</span>}
        {last && <span className="userShelfItemRow__date">{last.replaceAll("-", ".")}{readCount > 1 ? `（${readCount}回）` : ""}</span>}
        {readOnly ? <span className={`statusPill statusPill--${userShelfItem.status}`}>{STATUS[userShelfItem.status]}</span> : (
          <button
            type="button" className={`statusPill statusPill--${userShelfItem.status}`} title="クリックで状態を切り替え"
            onClick={e => { e.stopPropagation(); onCycle(userShelfItem) }}
          >{STATUS[userShelfItem.status]}</button>
        )}
      </div>
    </div>
  )
}

type Props = RowHandlers & {
  readOnly?: boolean
  emptyText?: string
  userShelfItems: UserShelfItem[]
  total: number
  loading: boolean
  openId: number | undefined
  onSeed: () => void
}

export default function UserShelfItemList({ readOnly = false, emptyText, userShelfItems, total, loading, openId, onOpen, onCycle, onSeed }: Props) {
  const listClass = `userShelfItemList${loading ? " userShelfItemList--loading" : ""}`
  if (!total && emptyText) {
    return <div className="userShelfItemList"><div className="userShelfItemList__empty">{emptyText}</div></div>
  }
  if (!total) {
    return (
      <div className="userShelfItemList">
        <div className="userShelfItemList__empty">
          <h2 className="userShelfItemList__emptyTitle">まだ本がありません</h2>
          <div>上の欄にタイトルかISBNを入れてEnterで1冊目を登録できます。<br />まず触ってみたいときは、見本の本を入れて試せます（#見本 タグが付くので、あとで見分けられます）。</div>
          <button className="button" type="button" onClick={onSeed}>見本の本を5冊入れる</button>
        </div>
      </div>
    )
  }
  if (!userShelfItems.length) {
    return <div className={listClass}><div className="userShelfItemList__empty">条件に合う本はありません。</div></div>
  }
  return (
    <div className={listClass} aria-busy={loading}>
      {userShelfItems.map(userShelfItem => (
        <UserShelfItemRow
          key={userShelfItem.id} userShelfItem={userShelfItem} open={openId === userShelfItem.id} readOnly={readOnly}
          onOpen={onOpen} onCycle={onCycle}
        />
      ))}
    </div>
  )
}
