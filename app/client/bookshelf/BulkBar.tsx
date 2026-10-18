import { useState } from "react"
import { STATUS, STATUS_KEYS } from "./text"
import type { Status } from "./types"

type Props = {
  count: number
  onStatus: (status: Status) => void
  onTag: (tag: string) => void
  onDelete: () => void
  onClear: () => void
}

export default function BulkBar({ count, onStatus, onTag, onDelete, onClear }: Props) {
  const [tag, setTag] = useState("")
  return (
    <div className="bulk-bar">
      <span>{count}冊を選択中</span>
      {STATUS_KEYS.map(key => (
        <button key={key} className="button button--small button--inverted" type="button" onClick={() => onStatus(key)}>{STATUS[key]}へ</button>
      ))}
      <input
        type="text" className="bulk-bar__tag-input" placeholder="タグを付ける" aria-label="選択した本に付けるタグ" value={tag}
        onChange={e => setTag(e.target.value)}
        onKeyDown={e => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return
          const t = tag.trim().replace(/^[#＃]/, "")
          if (t) { onTag(t); setTag("") }
        }}
      />
      <button className="button button--small button--inverted button--danger" type="button" onClick={onDelete}>削除</button>
      <button className="button button--small button--inverted" type="button" onClick={onClear}>選択解除</button>
    </div>
  )
}
