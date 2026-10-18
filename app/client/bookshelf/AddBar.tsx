import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react"
import { STATUS, STATUS_KEYS, externalTargetOfEdition, googleBooksUrl, looksLikeIsbn } from "./text"
import EditionSuggest, { IDLE_SEARCH, useEditionSearch, type Searcher } from "./EditionSuggest"
import useAiSearch, { describeInterpretation, isGuess } from "./useAiSearch"
import type { Edition, ParsedLine, Status } from "./types"

type Mode = "ai" | "keyword"

const MODES: Record<Mode, string> = { ai: "AIで探す", keyword: "キーワードで探す" }
const MODE_KEYS = Object.keys(MODES) as Mode[]
const EMPTY_FORM = { title: "", author: "", isbn: "" }
const AI_QUERY_MAX_LENGTH = 100

const isMode = (value: string | null): value is Mode => value === "ai" || value === "keyword"

function loadMode(): Mode {
  try {
    const stored = localStorage.getItem("dokusho-card-add-mode")
    return isMode(stored) ? stored : "ai"
  } catch {
    return "ai"
  }
}

type FormProps = {
  busy: boolean
  canRegister: boolean
  canUseAi: boolean
  notice: ReactNode
  searcher: Searcher
  onAddText: (items: ParsedLine[]) => Promise<boolean>
  onAddEdition: (edition: Edition) => Promise<boolean>
  onAddIsbn: (isbn: string) => Promise<boolean>
  registerSubmit: (submit: () => void) => void
}

function useListKeys(candidates: Edition[], open: boolean, setOpen: (open: boolean) => void, onSubmit: (picked: Edition | null) => void) {
  const [active, setActive] = useState(-1)
  useEffect(() => { setActive(-1) }, [candidates])

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const listOpen = open && candidates.length > 0
    if (listOpen && e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, candidates.length - 1)) }
    else if (listOpen && e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, -1)) }
    else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false) }
    else if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(candidates[active] ?? null) }
  }

  return { active, setActive, onKeyDown }
}

function AiForm({ busy, canUseAi, notice, onAddText, onAddEdition, onAddIsbn, registerSubmit }: FormProps) {
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const ai = useAiSearch()
  const isbnMode = looksLikeIsbn(text)
  const single = isbnMode ? "" : text.trim()

  const reset = () => { setText(""); ai.reset() }
  const done = (ok: boolean) => { if (ok) reset() }

  function submit(picked: Edition | null) {
    if (busy || !canUseAi) return
    if (picked) onAddEdition(picked).then(done)
    else if (isbnMode) onAddIsbn(text).then(done)
    else if (single) { setOpen(true); ai.start(single) }
  }

  const keys = useListKeys(ai.state.editions, open, setOpen, submit)
  registerSubmit(() => submit(ai.state.editions[keys.active] ?? null))

  let header: ReactNode = null
  if (ai.state.status === "pending") header = <span role="status"><span className="spinner" aria-hidden="true" /> AI が探しています…</span>
  else if (ai.state.status === "succeeded" && isGuess(ai.state.interpretation)) header = "説明から当てはまりそうな本を推測しました。違うこともあるので、書誌を確かめてから登録してください"
  else if (ai.state.status === "succeeded") header = `${describeInterpretation(ai.state.interpretation) || `「${ai.state.query}」`}を探しました`
  else if (ai.state.status === "failed") header = `${ai.state.error}。キーワードで探した結果を表示しています`

  const footer = ai.state.status !== "idle" && ai.state.status !== "pending" && single ? (
    <button
      className="button button--link" type="button"
      onMouseDown={e => { e.preventDefault(); onAddText([{ title: single, author: "", tags: [] }]).then(done) }}
    >見つからないときは『{single}』をそのまま登録</button>
  ) : null

  return (
    <div className="add-bar__body">
      <textarea
        id="addInput" value={text} maxLength={AI_QUERY_MAX_LENGTH}
        className="add-bar__input add-bar__input--ai"
        placeholder="このすばの最新刊"
        spellCheck={false}
        disabled={!canUseAi}
        onChange={e => { setText(e.target.value.replace(/\s*\n\s*/g, " ")); setOpen(true); ai.reset() }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={keys.onKeyDown}
      />
      {!canUseAi && <p className="add-bar__locked-notice">{notice}</p>}
      {open && single && ai.state.status !== "idle" && (
        <EditionSuggest
          floating
          search={ai.state.status === "pending" ? IDLE_SEARCH : { editions: ai.state.editions, loading: false, error: null, searched: ai.state.query }}
          activeIndex={keys.active}
          header={header}
          footer={footer}
          emptyText="本のマスタに見つかりませんでした"
          onPick={submit}
          onHover={keys.setActive}
        />
      )}
    </div>
  )
}

const openExternally = (edition: Edition) =>
  window.open(googleBooksUrl(externalTargetOfEdition(edition)), "_blank", "noopener,noreferrer")

function KeywordForm({ busy, canRegister, notice, searcher, onAddText, onAddEdition, onAddIsbn, registerSubmit }: FormProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [open, setOpen] = useState(false)
  const title = form.title.trim()
  const search = useEditionSearch(title, open && !!title, form.author, searcher)

  const set = (key: keyof typeof EMPTY_FORM) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (key === "title") setOpen(true)
  }
  const done = (ok: boolean) => { if (ok) setForm(EMPTY_FORM) }

  function submit(picked: Edition | null) {
    if (busy) return
    if (!canRegister) { if (picked) openExternally(picked); return }
    if (picked) onAddEdition(picked).then(done)
    else if (form.isbn.trim()) onAddIsbn(form.isbn).then(done)
    else if (title) onAddText([{ title, author: form.author.trim(), tags: [] }]).then(done)
  }

  const keys = useListKeys(search.editions, open, setOpen, submit)
  registerSubmit(() => submit(search.editions[keys.active] ?? null))

  return (
    <div className="add-bar__body">
      <div className="keyword-form">
        <label className="keyword-form__label" htmlFor="addInput">タイトル</label>
        <div className="keyword-form__field">
          <input
            id="addInput" type="text" className="keyword-form__input" spellCheck={false} value={form.title} maxLength={500}
            placeholder="火車"
            onChange={set("title")} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={keys.onKeyDown}
          />
          {open && title && (
            <EditionSuggest
              floating
              search={search}
              activeIndex={keys.active}
              emptyText={canRegister ? "本のマスタに候補が見つかりません。登録するとタイトルと著者だけで登録されます" : "本のマスタに見つかりませんでした"}
              onPick={submit}
              onHover={keys.setActive}
            />
          )}
        </div>
        <label className="keyword-form__label" htmlFor="addAuthor">著者</label>
        <input
          id="addAuthor" type="text" className="keyword-form__input" spellCheck={false} value={form.author} maxLength={500}
          placeholder="宮部みゆき"
          onChange={set("author")} onKeyDown={keys.onKeyDown}
        />
        {canRegister ? (
          <>
            <label className="keyword-form__label" htmlFor="addIsbn">ISBN</label>
            <input
              id="addIsbn" type="text" inputMode="numeric" className="keyword-form__input" spellCheck={false} value={form.isbn} maxLength={20}
              placeholder="978-4-10-136918-1"
              onChange={set("isbn")} onKeyDown={keys.onKeyDown}
            />
          </>
        ) : (
          <p className="keyword-form__notice">{notice}</p>
        )}
      </div>
    </div>
  )
}

type Props = {
  canRegister: boolean
  canUseAi: boolean
  notice: ReactNode
  searcher: Searcher
  addStatus: Status
  onAddStatus: (status: Status) => void
  onAddText: (items: ParsedLine[]) => Promise<boolean>
  onAddEdition: (edition: Edition, tags: string[]) => Promise<boolean>
  onAddIsbn: (isbn: string) => Promise<boolean>
  onScan: () => void
}

export default function AddBar({ canRegister, canUseAi, notice, searcher, addStatus, onAddStatus, onAddText, onAddEdition, onAddIsbn, onScan }: Props) {
  const [storedMode, setStoredMode] = useState<Mode>(loadMode)
  const [viewerMode, setViewerMode] = useState<Mode>("ai")
  const mode: Mode = canUseAi ? storedMode : viewerMode
  const setMode = canUseAi ? setStoredMode : setViewerMode
  const [busy, setBusy] = useState(false)
  const submitRef = useRef<() => void>(() => {})

  useEffect(() => {
    try { localStorage.setItem("dokusho-card-add-mode", storedMode) } catch {}
  }, [storedMode])

  const guard = <A,>(action: (arg: A) => Promise<boolean>) => async (arg: A): Promise<boolean> => {
    setBusy(true)
    try { return await action(arg) } finally { setBusy(false) }
  }
  const formProps: FormProps = {
    busy,
    canRegister,
    canUseAi,
    notice,
    searcher,
    onAddText: guard(onAddText),
    onAddEdition: guard((edition: Edition) => onAddEdition(edition, [])),
    onAddIsbn: guard(onAddIsbn),
    registerSubmit: fn => { submitRef.current = fn },
  }

  return (
    <section className="add-bar" aria-label="本を登録">
      <div className="add-bar__head">
        <div className="add-bar__modes" role="tablist" aria-label="探し方">
          {MODE_KEYS.map(key => (
            <button
              key={key} type="button" role="tab" aria-selected={mode === key}
              className={`add-bar__mode${mode === key ? " add-bar__mode--active" : ""}`}
              onClick={() => setMode(key)}
            >{MODES[key]}</button>
          ))}
        </div>
        <button className="add-bar__mode" type="button" disabled={!canRegister} onClick={onScan}>バーコードで読む</button>
      </div>
      <div className="add-bar__row">
        {mode === "ai" ? <AiForm key="ai" {...formProps} /> : <KeywordForm key="keyword" {...formProps} />}
        <div className="add-bar__side">
          <div className="segmented" role="group" aria-label="登録時の状態">
            {STATUS_KEYS.map(key => (
              <button
                key={key} type="button" aria-pressed={addStatus === key}
                className={`segmented__option${addStatus === key ? " segmented__option--active" : ""}`}
                disabled={!canRegister}
                onClick={() => onAddStatus(key)}
              >{STATUS[key]}</button>
            ))}
          </div>
          <div className="add-bar__actions">
            <button className="button button--primary" type="button" disabled={busy || !canRegister} onClick={() => submitRef.current()}>登録</button>
          </div>
        </div>
      </div>
      <div className="add-bar__hint">
        <span className="add-bar__hint-stack">
          <span className={`add-bar__hint-text${mode === "ai" ? "" : " add-bar__hint-text--hidden"}`} aria-hidden={mode !== "ai"}>
            <kbd className="add-bar__key">Enter</kbd> で AI が探します（ISBN も可）
          </span>
          <span className={`add-bar__hint-text${mode === "keyword" ? "" : " add-bar__hint-text--hidden"}`} aria-hidden={mode !== "keyword"}>
            {canRegister ? "タイトルを入れると候補が出ます" : "タイトルを入れると候補が出ます。選ぶと Google ブックスが開きます"}
          </span>
        </span>
      </div>
    </section>
  )
}
