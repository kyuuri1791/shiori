import { useEffect, useRef, useState } from "react"
import * as api from "./api"
import type { ParsedLine } from "./types"

const MAX_SIDE = 1568
const JPEG_QUALITY = 0.85
const POLL_INTERVAL_MS = 1500
const MAX_WAIT_MS = 90000

export type ShelfPhotoState = { status: "idle" | "reading"; error: string | null }

const UNREADABLE = "この写真は読み込めませんでした。JPEG・PNG・HEIC の写真を選んでください"

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    const { heicTo, isHeic } = await import("heic-to")
    if (!(await isHeic(file))) throw new Error(UNREADABLE)
    try {
      return await heicTo({ blob: file, type: "bitmap", options: { imageOrientation: "from-image" } })
    } catch {
      throw new Error(UNREADABLE)
    }
  }
}

async function shrink(file: File): Promise<Blob> {
  const bitmap = await decode(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
  if (!blob) throw new Error("写真を読み込めませんでした")
  return blob
}

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms)
  signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("aborted", "AbortError")) }, { once: true })
})

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError"

export default function useShelfPhotoScan(onBooks: (lines: ParsedLine[]) => void) {
  const [state, setState] = useState<ShelfPhotoState>({ status: "idle", error: null })
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function start(file: File): Promise<void> {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ status: "reading", error: null })
    try {
      let scan = await api.startShelfPhotoScan(await shrink(file), controller.signal)
      const deadline = Date.now() + MAX_WAIT_MS
      while (scan.status === "pending") {
        if (Date.now() > deadline) throw new Error("写真の読み取りに時間がかかりすぎたため打ち切りました")
        await wait(POLL_INTERVAL_MS, controller.signal)
        scan = await api.getShelfPhotoScan(scan.id, controller.signal)
      }
      if (scan.status === "failed") throw new Error(scan.error ?? "写真を読み取れませんでした")
      if (!scan.books.length) throw new Error("写真から本を読み取れませんでした。背表紙が大きく写るように撮ってみてください")
      setState({ status: "idle", error: null })
      onBooks(scan.books.map(book => ({ title: book.title, author: book.author ?? "", tags: [], volume: book.volume })))
    } catch (error) {
      if (isAbort(error)) return
      setState({ status: "idle", error: error instanceof Error ? error.message : "写真を読み取れませんでした" })
    }
  }

  function cancel(): void {
    controllerRef.current?.abort()
    setState({ status: "idle", error: null })
  }

  return { state, start, cancel }
}
