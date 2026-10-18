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
    <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3.5 rounded-[10px] bg-ink py-2.5 pr-2.5 pl-4 text-sm text-paper shadow-float" role="status" data-keeps-drawer-open>
      <span>{toast.message}</span>
      {toast.undoable && (
        <button className="rounded-md bg-paper px-3 py-1 text-[13px] font-bold whitespace-nowrap text-ink" type="button" onClick={onUndo}>
          元に戻す <kbd className="font-mono text-[11px] opacity-70">Ctrl+Z</kbd>
        </button>
      )}
    </div>
  )
}
