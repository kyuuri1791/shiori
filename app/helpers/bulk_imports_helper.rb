module BulkImportsHelper
  BULK_IMPORT_TITLES = { "photos" => "本棚の写真から", "series" => "シリーズを探す" }.freeze
  BULK_IMPORT_STEPS = { pick: "読み取って選ぶ", confirm: "確認する", done: "登録完了" }.freeze
  BULK_IMPORT_STATUS_ORDER = %w[reading read want].freeze

  def bulk_import_title
    BULK_IMPORT_TITLES.fetch(controller_name)
  end

  def bulk_import_status_options(selected)
    options_for_select(BULK_IMPORT_STATUS_ORDER.map { [ UserShelfItem.status.find_value(it).text, it ] }, selected)
  end

  def bulk_import_user_shelf_item_detail(user_shelf_item)
    return [ user_shelf_item.book.author_line, user_shelf_item.book.publisher, user_shelf_item.book.published_on.to_s.first(4) ].compact_blank.join(" · ") if user_shelf_item.book
    return "本のマスタにないので ISBN だけで登録します" if user_shelf_item.isbn13

    "本のマスタに紐付けずに登録します"
  end
end
