export const drawerClass = (open: boolean): string =>
  "fixed inset-y-0 right-0 z-30 flex w-full max-w-[460px] flex-col border-l border-line bg-card pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-float transition-transform duration-200 " +
  "max-sm:top-auto max-sm:left-0 max-sm:h-[88%] max-sm:max-w-none max-sm:rounded-t-[14px] max-sm:border-t max-sm:border-l-0 max-sm:pl-[env(safe-area-inset-left,0px)] " +
  (open ? "translate-0" : "translate-x-[105%] max-sm:translate-x-0 max-sm:translate-y-[105%]")

export const DRAWER_HEAD = "flex items-center justify-between border-b border-dashed border-line px-4.5 py-3 text-xs tracking-[.08em] text-muted"
export const DRAWER_BODY = "grid content-start gap-4 overflow-y-auto px-4.5 pt-4 pb-6"
export const DRAWER_PAIR = "flex flex-wrap gap-x-7 gap-y-3"
export const FIELD = "grid gap-1"
export const FIELD_TEXT = "m-0 leading-[1.75] whitespace-pre-wrap wrap-anywhere"
export const BOOK_CARD = "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[10px] border border-line p-3"
export const BOOK_CARD_UNMATCHED = "grid grid-cols-1 gap-3 rounded-[10px] border border-dashed border-line p-3"
export const BOOK_CARD_BODY = "grid min-w-0 gap-1 text-[13px]"
export const BOOK_CARD_ISBN = "font-mono text-xs text-muted"
export const NOTE_LIST = "grid gap-2"
export const NOTE_DATE = "font-mono text-xs whitespace-nowrap text-muted"
export const NOTE_TEXT = "m-0 whitespace-pre-wrap wrap-anywhere"
export const STARS = "text-[13px] tracking-[1px] whitespace-nowrap text-stamp"
