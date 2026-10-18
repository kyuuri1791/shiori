import { createRoot } from "react-dom/client"
import App from "../bookshelf/App"
import type { BookshelfPage } from "../bookshelf/types"

const el = document.getElementById("bookshelf")
if (el?.dataset.props) {
  const props = JSON.parse(el.dataset.props) as BookshelfPage
  createRoot(el).render(<App initial={props} />)
}
