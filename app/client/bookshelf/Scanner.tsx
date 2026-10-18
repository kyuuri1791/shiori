import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import type { AddResult } from "./types"

const RESULT_LABEL: Record<AddResult["state"], string> = { added: "登録しました", unmatched: "本のマスタにないのでISBNだけで登録しました", owned: "もう本棚にあります", failed: "登録できませんでした" }

type LogItem = { code: string; state: AddResult["state"] | "pending"; title: string }

type Props = { onIsbn: (isbn: string) => Promise<AddResult>; onClose: () => void }

export default function Scanner({ onIsbn, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const seen = useRef(new Set<string>())
  const onIsbnRef = useRef(onIsbn)
  onIsbnRef.current = onIsbn
  const [status, setStatus] = useState("カメラを起動しています…")
  const [log, setLog] = useState<LogItem[]>([])

  useEffect(() => {
    dialogRef.current?.showModal()
    let controls: IScannerControls | null = null
    let cancelled = false
    const reader = new BrowserMultiFormatReader()

    reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, result => {
      const code = result?.getText()
      if (!code || !/^97[89]\d{10}$/.test(code) || seen.current.has(code)) return
      seen.current.add(code)
      setLog(items => [{ code, state: "pending", title: "" }, ...items])
      onIsbnRef.current(code).then(({ state, title }) => {
        setLog(items => items.map(item => (item.code === code ? { code, state, title } : item)))
      })
    }).then(c => {
      if (cancelled) c.stop()
      else { controls = c; setStatus("本の裏のバーコード（978 または 979 で始まるほう）を枠に入れてください。続けて何冊でも読み取れます。") }
    }).catch((error: unknown) => {
      setStatus(`カメラを使えませんでした（${error instanceof Error ? error.message : String(error)}）。ブラウザでカメラを許可しているか、http://localhost か https で開いているかを確認してください。`)
    })

    return () => { cancelled = true; controls?.stop() }
  }, [])

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <h2 className="modal__title">バーコードで登録</h2>
      <div className="scanner">
        <video ref={videoRef} className="scanner__video" muted playsInline />
        <div className="scanner__status">{status}</div>
        <ul className="scanner__log">
          {log.map(item => (
            <li key={item.code} className={`scanner__logItem${item.state === "owned" || item.state === "unmatched" ? " scanner__logItem--skipped" : ""}${item.state === "failed" ? " scanner__logItem--failed" : ""}`}>
              {item.code} {item.title && `『${item.title}』`} {item.state === "pending" ? "探しています…" : RESULT_LABEL[item.state]}
            </li>
          ))}
        </ul>
      </div>
      <div className="modal__actions">
        <button className="button" type="button" onClick={() => dialogRef.current?.close()}>閉じる</button>
      </div>
    </dialog>
  )
}
