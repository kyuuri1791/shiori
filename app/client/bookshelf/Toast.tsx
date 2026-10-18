import { useEffect } from "react"
import type { ToastState } from "./types"

export const UNDO_WINDOW_MS = 7000
const NOTICE_MS = 2500

type Props = { toast: ToastState | null; onUndo: () => void; onDone: () => void }

export default function Toast({ toast, onUndo, onDone }: Props) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDone, toast.undoable ? UNDO_WINDOW_MS : NOTICE_MS)
    return () => clearTimeout(timer)
  }, [toast?.key])

  if (!toast) return null
  return (
    <div className="toast" role="status" data-keeps-drawer-open>
      <span>{toast.message}</span>
      {toast.undoable && (
        <button className="toast__undo" type="button" onClick={onUndo}>
          元に戻す <kbd className="toast__key">Ctrl+Z</kbd>
        </button>
      )}
    </div>
  )
}
