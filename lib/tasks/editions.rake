namespace :editions do
  desc "Link unmatched books to editions whose ISBN matches the scanned ISBN"
  task link_books: :environment do
    linked = Book.where(edition_id: nil).where.not(isbn13: nil).find_each.count do |book|
      edition = Edition.find_by_isbn(book.isbn13) or next false
      attributes = { edition: }
      attributes.merge!(title: edition.title, author: edition.author_line) if book.title == "ISBN #{book.isbn13}"
      book.update!(attributes)
    end
    puts "#{linked} books linked"
  end
end
