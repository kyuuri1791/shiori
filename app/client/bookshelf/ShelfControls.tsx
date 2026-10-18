import type { Facets, Filters, SortKey, StatusFilter } from "./types"

const SORTS: Record<SortKey, string> = {
  added: "登録が新しい順",
  read_on: "読了日が新しい順",
  title: "タイトル順",
  author: "著者順",
  rating: "評価が高い順",
}
const SORT_KEYS = Object.keys(SORTS) as SortKey[]
const TABS: [StatusFilter, string][] = [["all", "すべて"], ["reading", "読んでる"], ["read", "読んだ"], ["want", "読みたい"]]

const isSortKey = (value: string): value is SortKey => value in SORTS

type Props = {
  facets: Facets
  filters: Filters
  query: string
  onQuery: (query: string) => void
  onChange: (patch: Partial<Filters>) => void
  showUnmatched?: boolean
}

export default function ShelfControls({ facets, filters, query, onQuery, onChange, showUnmatched = true }: Props) {
  const unmatched = showUnmatched ? facets.unmatched : 0
  return (
    <>
      <div className="flex flex-wrap gap-0.5 border-b border-line" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key} role="tab" type="button" aria-selected={filters.status === key}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${filters.status === key ? "border-accent font-medium text-ink" : "border-transparent text-muted"}`}
            onClick={() => onChange({ status: key })}
          >
            {label}<span className="ml-1 font-mono text-xs tabular-nums">{facets.counts[key]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <input className="min-w-0 flex-[1_1_200px] rounded-lg border border-line bg-card px-3 py-2" id="search" type="search" placeholder="タイトル・著者・タグ・感想・ISBNから探す" maxLength={100} value={query} onChange={e => onQuery(e.target.value)} />
        <select className="rounded-lg border border-line bg-card px-2.5 py-2" aria-label="並べ替え" value={filters.sort} onChange={e => { if (isSortKey(e.target.value)) onChange({ sort: e.target.value }) }}>
          {SORT_KEYS.map(key => <option key={key} value={key}>{SORTS[key]}</option>)}
        </select>
      </div>
      {(facets.tags.length > 0 || unmatched > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {unmatched > 0 && (
            <button
              type="button" aria-pressed={filters.unmatched}
              className={`chip border-dashed ${filters.unmatched ? "border-accent bg-accent-soft text-accent" : ""}`}
              onClick={() => onChange({ unmatched: !filters.unmatched, tag: null })}
            >未照合 {unmatched}</button>
          )}
          {facets.tags.map(({ tag, count }) => (
            <button
              key={tag} type="button" aria-pressed={filters.tag === tag}
              className={`chip ${filters.tag === tag ? "border-accent bg-accent-soft text-accent" : ""}`}
              onClick={() => onChange({ tag: filters.tag === tag ? null : tag, unmatched: false })}
            >#{tag} {count}</button>
          ))}
        </div>
      )}
    </>
  )
}
