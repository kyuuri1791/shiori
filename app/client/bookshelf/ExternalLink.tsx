import { googleBooksUrl, type ExternalTarget } from "./text"

export default function ExternalLink({ target }: { target: ExternalTarget }) {
  return (
    <a className="bookCard__external" href={googleBooksUrl(target)} target="_blank" rel="noopener noreferrer">
      Google ブックスであらすじを見る<span aria-hidden="true"> ↗</span>
      <span className="bookCard__externalNote">（別タブで開きます）</span>
    </a>
  )
}
