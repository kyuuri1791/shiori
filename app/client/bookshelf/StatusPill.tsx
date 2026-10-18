import type { MouseEvent } from "react"
import { STATUS } from "./text"
import type { Status } from "./types"

const COLORS: Record<Status, string> = {
  want: "bg-want-bg text-want",
  reading: "bg-reading-bg text-reading",
  read: "bg-read-bg text-read",
}

type Props = { status: Status; onClick?: (e: MouseEvent<HTMLButtonElement>) => void }

export default function StatusPill({ status, onClick }: Props) {
  const className = `rounded-full border-0 px-2 py-0.5 text-xs font-medium whitespace-nowrap ${COLORS[status]}`
  if (!onClick) return <span className={className}>{STATUS[status]}</span>
  return <button type="button" className={className} title="クリックで状態を切り替え" onClick={onClick}>{STATUS[status]}</button>
}
