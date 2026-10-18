import type { PageInfo } from "./types"

type Props = { page: PageInfo | null; onPage: (page: number) => void }

export default function Pager({ page, onPage }: Props) {
  if (!page || page.last <= 1) return null
  const { previous, next } = page
  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="ページ">
      <button className="pager-btn font-sans" type="button" disabled={!previous} onClick={() => previous && onPage(previous)}>前へ</button>
      <ol className="flex flex-wrap gap-1">
        {page.series.map((item, i) => {
          if (item === "gap") return <li key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">…</li>
          const number = Number(item)
          const current = typeof item === "string"
          return (
            <li key={number}>
              <button
                type="button" aria-current={current ? "page" : undefined}
                className={`pager-btn ${current ? "cursor-default border-accent bg-accent text-card" : ""}`}
                onClick={() => !current && onPage(number)}
              >{number}</button>
            </li>
          )
        })}
      </ol>
      <button className="pager-btn font-sans" type="button" disabled={!next} onClick={() => next && onPage(next)}>次へ</button>
      <span className="ml-auto text-xs text-muted tabular-nums">{page.from}–{page.to} / {page.count}冊</span>
    </nav>
  )
}
