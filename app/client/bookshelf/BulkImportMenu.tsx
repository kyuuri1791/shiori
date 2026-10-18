import { useEffect, useRef } from "react"

export default function BulkImportMenu({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialogRef.current?.showModal() }, [])

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <h2 className="modal__title">まとめて登録</h2>
      <p className="modal__lead">本をまとめて読み取り、本のマスタと照合してから登録します。登録する前に、1冊ずつ選んで確認できます。</p>
      <div className="bulk-import-menu">
        <a className="bulk-import-menu__option" href="/bulk_imports/photos/new">
          <span className="bulk-import-menu__text">
            <span className="bulk-import-menu__name">本棚の写真から</span>
            <span className="bulk-import-menu__description">背表紙が写った写真から書名を読み取ります。写真は読み取りが終わるとすぐに消します。</span>
          </span>
          <span className="button bulk-import-menu__go">写真から登録する</span>
        </a>
        <a className="bulk-import-menu__option" href="/bulk_imports/series/new">
          <span className="bulk-import-menu__text">
            <span className="bulk-import-menu__name">シリーズを探す</span>
            <span className="bulk-import-menu__description">シリーズ名や「一通り」「全巻」などと書くと、AI がシリーズの本を探します。</span>
          </span>
          <span className="button bulk-import-menu__go">シリーズから登録する</span>
        </a>
      </div>
      <div className="modal__actions">
        <button className="button" type="button" onClick={() => dialogRef.current?.close()}>閉じる</button>
      </div>
    </dialog>
  )
}
