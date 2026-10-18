import { googleBooksUrl, type ExternalTarget } from "./text"

export default function ExternalLink({ target }: { target: ExternalTarget }) {
  return (
    <a className="book-card__external" href={googleBooksUrl(target)} target="_blank" rel="noopener noreferrer">
      Google ブックスであらすじを見る<span aria-hidden="true"> ↗</span>
      <span className="book-card__external-note">（別タブで開きます）</span>
    </a>
  )
}
