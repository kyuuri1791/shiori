namespace :books do
  desc "Link unmatched user_shelf_items to books whose ISBN matches the scanned ISBN"
  task link_user_shelf_items: :environment do
    linked = UserShelfItem.where(book_id: nil).where.not(isbn13: nil).find_each.count do |user_shelf_item|
      book = Book.find_by_isbn(user_shelf_item.isbn13) or next false
      attributes = { book: }
      attributes.merge!(title: book.title, author: book.author_line) if user_shelf_item.title == "ISBN #{user_shelf_item.isbn13}"
      user_shelf_item.update!(attributes)
    end
    puts "#{linked} user_shelf_items linked"
  end
end
