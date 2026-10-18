import { lastReadOn } from "./text"
import Cover from "./Cover"
import StatusPill from "./StatusPill"
import { STARS } from "./drawerStyles"
import type { UserShelfItem } from "./types"

export const LIST_CLASS = "overflow-hidden rounded-[10px] border border-line bg-card"
export const EMPTY_CLASS = "grid justify-items-center gap-3 px-5 py-10 text-center text-muted"
export const EMPTY_TITLE_CLASS = "m-0 font-display text-lg text-ink"

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
    <div className={`grid cursor-pointer grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-t border-line px-3.5 py-2.5 first:border-t-0 hover:bg-paper sm:grid-cols-[32px_minmax(0,1fr)_auto] ${open ? "shadow-[inset_3px_0_0_var(--color-accent)]" : ""}`} data-keeps-drawer-open onClick={() => onOpen(userShelfItem.id)}>
      <Cover book={userShelfItem.book} title={userShelfItem.title} />
      <div className="min-w-0">
        <div className="font-display text-base font-bold wrap-anywhere">{userShelfItem.title}</div>
        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-muted">
          {userShelfItem.author && <span>{userShelfItem.author}</span>}
          {userShelfItem.tags.map(t => <span key={t} className="text-accent">#{t}</span>)}
          {!userShelfItem.book && <span className="rounded border border-dashed border-line px-1 text-[11px]" title="本のマスタに紐付いていません">未照合</span>}
        </div>
      </div>
      <div className="col-start-2 flex items-center justify-start gap-2.5 sm:col-start-auto sm:justify-end">
        {userShelfItem.rating > 0 && <span className={STARS} aria-label={`評価${userShelfItem.rating}`}>{stars(userShelfItem.rating)}</span>}
        {last && <span className="font-mono text-xs whitespace-nowrap text-muted tabular-nums">{last.replaceAll("-", ".")}{readCount > 1 ? `（${readCount}回）` : ""}</span>}
        <StatusPill status={userShelfItem.status} onClick={readOnly ? undefined : e => { e.stopPropagation(); onCycle(userShelfItem) }} />
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
  const listClass = `${LIST_CLASS} transition-opacity${loading ? " opacity-55" : ""}`
  if (!total && emptyText) {
    return <div className={LIST_CLASS}><div className={EMPTY_CLASS}>{emptyText}</div></div>
  }
  if (!total) {
    return (
      <div className={LIST_CLASS}>
        <div className={EMPTY_CLASS}>
          <h2 className={EMPTY_TITLE_CLASS}>まだ本がありません</h2>
          <div>上の欄にタイトルかISBNを入れてEnterで1冊目を登録できます。<br />まず触ってみたいときは、見本の本を入れて試せます（#見本 タグが付くので、あとで見分けられます）。</div>
          <button className="btn" type="button" onClick={onSeed}>見本の本を5冊入れる</button>
        </div>
      </div>
    )
  }
  if (!userShelfItems.length) {
    return <div className={listClass}><div className={EMPTY_CLASS}>条件に合う本はありません。</div></div>
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
