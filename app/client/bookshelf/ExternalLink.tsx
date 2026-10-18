import { googleBooksUrl, type ExternalTarget } from "./text"

export default function ExternalLink({ target }: { target: ExternalTarget }) {
  return (
    <a className="link text-[13px]" href={googleBooksUrl(target)} target="_blank" rel="noopener noreferrer">
      Google ブックスであらすじを見る<span aria-hidden="true"> ↗</span>
      <span className="sr-only">（別タブで開きます）</span>
    </a>
  )
}
