import { useEffect, useRef, type RefObject } from "react"

export default function useCloseOnOutsideClick<T extends HTMLElement>(open: boolean, onClose: () => void): RefObject<T | null> {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!(e.target instanceof Element) || !e.target.isConnected) return
      if (ref.current?.contains(e.target) || e.target.closest("[data-keeps-drawer-open]")) return
      closeRef.current()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  return ref
}
