import { useEffect, useRef } from "react"

export default function BulkImportMenu({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialogRef.current?.showModal() }, [])

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <h2 className="modal-title">まとめて登録</h2>
      <p className="mt-0 mb-3 text-[13px] text-muted">本をまとめて読み取り、本のマスタと照合してから登録します。登録する前に、1冊ずつ選んで確認できます。</p>
      <div className="grid gap-2">
        <a className="flex items-stretch justify-between gap-3 rounded-lg border border-line px-3.5 py-3 text-inherit no-underline hover:border-accent hover:bg-paper max-sm:flex-col sm:items-center" href="/bulk_imports/photos/new">
          <span className="grid gap-1">
            <span className="text-[15px] font-bold">本棚の写真から</span>
            <span className="text-[13px] text-muted">背表紙が写った写真から書名を読み取ります。写真は読み取りが終わるとすぐに消します。</span>
          </span>
          <span className="btn shrink-0 text-center">写真から登録する</span>
        </a>
        <a className="flex items-stretch justify-between gap-3 rounded-lg border border-line px-3.5 py-3 text-inherit no-underline hover:border-accent hover:bg-paper max-sm:flex-col sm:items-center" href="/bulk_imports/series/new">
          <span className="grid gap-1">
            <span className="text-[15px] font-bold">シリーズを探す</span>
            <span className="text-[13px] text-muted">シリーズ名や「一通り」「全巻」などと書くと、AI がシリーズの本を探します。</span>
          </span>
          <span className="btn shrink-0 text-center">シリーズから登録する</span>
        </a>
      </div>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={() => dialogRef.current?.close()}>閉じる</button>
      </div>
    </dialog>
  )
}
