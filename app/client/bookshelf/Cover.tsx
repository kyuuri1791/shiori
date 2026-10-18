import { useState } from "react"
import type { Edition } from "./types"

type Props = { edition: Edition | null; title: string; large?: boolean }

export default function Cover({ edition, title, large = false }: Props) {
  const [failed, setFailed] = useState(false)
  const url = edition?.cover_url
  return (
    <span className={`cover${large ? " cover--large" : ""}`} aria-hidden="true">
      {url && !failed
        ? <img className="cover__image" src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
        : (title || "？").slice(0, 1)}
    </span>
  )
}
