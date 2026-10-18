import { useEffect, useRef, useState } from "react"
import * as api from "./api"
import type { AiInterpretation, AiTarget, Edition } from "./types"

const POLL_INTERVAL_MS = 800
const MAX_WAIT_MS = 30000

export type AiSearchState = {
  status: "idle" | "pending" | "succeeded" | "failed"
  query: string
  interpretation: AiInterpretation | null
  editions: Edition[]
  error: string | null
}

const IDLE: AiSearchState = { status: "idle", query: "", interpretation: null, editions: [], error: null }

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("aborted", "AbortError"))
    }, { once: true })
  })
}

const isAbort = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError"
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : "AI検索がうまくいきませんでした")

export const TARGET_LABEL: Record<AiTarget, string> = { latest: "の最新刊", first: "の1巻", volume: "", any: "" }

export const isGuess = (interpretation: AiInterpretation | null): boolean =>
  !!interpretation && interpretation.titles.length === 0 && (interpretation.guesses?.length ?? 0) > 0

export function describeInterpretation(interpretation: AiInterpretation | null): string {
  const title = interpretation?.titles[0]
  if (!interpretation || !title) return ""
  const target = interpretation.target === "volume" && interpretation.volume ? `の${interpretation.volume}巻` : TARGET_LABEL[interpretation.target]
  const author = interpretation.author ? `（${interpretation.author}）` : ""
  return `『${title}』${author}${target}`
}

export default function useAiSearch() {
  const [state, setState] = useState<AiSearchState>(IDLE)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function start(query: string): Promise<void> {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ ...IDLE, status: "pending", query })
    try {
      let search = await api.startAiSearch(query)
      const deadline = Date.now() + MAX_WAIT_MS
      while (search.status === "pending") {
        if (Date.now() > deadline) throw new Error("AIの応答が遅いため打ち切りました")
        await sleep(POLL_INTERVAL_MS, controller.signal)
        search = await api.getAiSearch(search.id, controller.signal)
      }
      if (search.status !== "succeeded") throw new Error(search.error ?? "AI検索がうまくいきませんでした")
      setState({ status: "succeeded", query, interpretation: search.interpretation, editions: search.editions, error: null })
    } catch (error) {
      if (isAbort(error)) return
      const editions = await api.searchEditions(query, controller.signal).catch((): Edition[] => [])
      if (!controller.signal.aborted) setState({ status: "failed", query, interpretation: null, editions, error: messageOf(error) })
    }
  }

  function reset(): void {
    controllerRef.current?.abort()
    setState(IDLE)
  }

  return { state, start, reset }
}
