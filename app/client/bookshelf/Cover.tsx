import { useState } from "react"
import type { Book } from "./types"

type Props = { book: Book | null; title: string; large?: boolean }

export default function Cover({ book, title, large = false }: Props) {
  const [failed, setFailed] = useState(false)
  const url = book?.cover_url
  return (
    <span className={`cover${large ? " cover--large" : ""}`} aria-hidden="true">
      {url && !failed
        ? <img className="cover__image" src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
        : (title || "？").slice(0, 1)}
    </span>
  )
}
