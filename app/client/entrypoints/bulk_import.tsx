import { createRoot } from "react-dom/client"
import BulkImportPage, { type BulkImportKind } from "../bulk_import/BulkImportPage"

const el = document.getElementById("bulk-import")
if (el?.dataset.props) {
  const props = JSON.parse(el.dataset.props) as { source: BulkImportKind }
  createRoot(el).render(<BulkImportPage kind={props.source} />)
}
