import { useEffect, useRef } from "react"

export default function PhotoReading({ onCancel }: { onCancel: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialogRef.current?.showModal() }, [])
  return (
    <dialog ref={dialogRef} className="modal" onCancel={e => { e.preventDefault(); onCancel() }}>
      <h2 className="modal__title">写真から読み取っています</h2>
      <p className="modal__lead"><span className="spinner" aria-hidden="true" /> 背表紙から書名を読み取っています。30秒ほどかかることがあります。写真は読み取りが終わるとすぐに消します。</p>
      <div className="modal__actions">
        <button className="button" type="button" onClick={onCancel}>やめる</button>
      </div>
    </dialog>
  )
}
