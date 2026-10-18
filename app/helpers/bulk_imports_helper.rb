module BulkImportsHelper
  BULK_IMPORT_TITLES = { "photos" => "本棚の写真から", "series" => "シリーズを探す" }.freeze
  BULK_IMPORT_STEPS = { pick: "読み取って選ぶ", confirm: "確認する", done: "登録完了" }.freeze
  BULK_IMPORT_STATUS_ORDER = %w[reading read want].freeze

  def bulk_import_title
    BULK_IMPORT_TITLES.fetch(controller_name)
  end

  def bulk_import_status_options(selected)
    options_for_select(BULK_IMPORT_STATUS_ORDER.map { [ Book.status.find_value(it).text, it ] }, selected)
  end

  def bulk_import_book_detail(book)
    return [ book.edition.author_line, book.edition.publisher, book.edition.published_on.to_s.first(4) ].compact_blank.join(" · ") if book.edition
    return "本のマスタにないので ISBN だけで登録します" if book.isbn13

    "本のマスタに紐付けずに登録します"
  end
end
