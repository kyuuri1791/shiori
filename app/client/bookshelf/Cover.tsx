import { useState } from "react"
import type { Book } from "./types"

type Props = { book: Book | null; title: string; large?: boolean }

export default function Cover({ book, title, large = false }: Props) {
  const [failed, setFailed] = useState(false)
  const url = book?.cover_url
  return (
    <span
      className={`grid aspect-[2/3] max-w-full flex-none place-items-center overflow-hidden rounded-[3px] bg-accent-soft font-display font-bold text-accent ${large ? "w-[72px] text-2xl" : "w-8 text-sm"}`}
      aria-hidden="true"
    >
      {url && !failed
        ? <img className="block size-full object-cover" src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
        : (title || "？").slice(0, 1)}
    </span>
  )
}
