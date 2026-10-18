import { useEffect, useRef } from "react"

type Props = { onPhoto: (file: File) => void; onClose: () => void }

export default function BulkImport({ onPhoto, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  useEffect(() => { dialogRef.current?.showModal() }, [])

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <h2 className="modal__title">まとめて登録</h2>
      <p className="modal__lead">本をまとめて読み取り、本のマスタと照合してから登録します。登録する前に、1冊ずつ確認・選び直しができます。</p>
      <div className="bulk-import">
        <div className="bulk-import__option">
          <div>
            <h3 className="bulk-import__name">本棚の写真から</h3>
            <p className="bulk-import__description">背表紙が写った写真から書名を読み取ります。写真は読み取りが終わるとすぐに消します。</p>
          </div>
          <button className="button" type="button" onClick={() => photoInput.current?.click()}>写真を選ぶ</button>
          <input
            ref={photoInput} type="file" accept="image/*" hidden
            onChange={e => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              dialogRef.current?.close()
              onPhoto(file)
            }}
          />
        </div>
      </div>
      <div className="modal__actions">
        <button className="button" type="button" onClick={() => dialogRef.current?.close()}>閉じる</button>
      </div>
    </dialog>
  )
}
