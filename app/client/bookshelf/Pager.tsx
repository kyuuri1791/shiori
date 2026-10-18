import type { PageInfo } from "./types"

type Props = { page: PageInfo | null; onPage: (page: number) => void }

export default function Pager({ page, onPage }: Props) {
  if (!page || page.last <= 1) return null
  const { previous, next } = page
  return (
    <nav className="pager" aria-label="ページ">
      <button className="pager__step" type="button" disabled={!previous} onClick={() => previous && onPage(previous)}>前へ</button>
      <ol className="pager__list">
        {page.series.map((item, i) => {
          if (item === "gap") return <li key={`gap-${i}`} className="pager__gap" aria-hidden="true">…</li>
          const number = Number(item)
          const current = typeof item === "string"
          return (
            <li key={number}>
              <button
                type="button" aria-current={current ? "page" : undefined}
                className={`pager__page${current ? " pager__page--current" : ""}`}
                onClick={() => !current && onPage(number)}
              >{number}</button>
            </li>
          )
        })}
      </ol>
      <button className="pager__step" type="button" disabled={!next} onClick={() => next && onPage(next)}>次へ</button>
      <span className="pager__range">{page.from}–{page.to} / {page.count}冊</span>
    </nav>
  )
}
