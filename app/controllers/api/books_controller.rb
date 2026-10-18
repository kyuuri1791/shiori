module Api
  class BooksController < ApplicationController
    rate_limit to: 120, within: 1.minute, only: :search, with: -> { render_error("検索が多すぎます。少し待ってからもう一度お試しください", :too_many_requests) }

    def search(q: "", author: "")
      books = Book.suggest(q.to_s.first(UserShelfItemQuery::MAX_TEXT_LENGTH), author: author.to_s.first(UserShelfItemQuery::MAX_TEXT_LENGTH))
      owned = current_user.user_shelf_items.where(book_id: books.map(&:id)).pluck(:book_id).to_set
      render json: { books: books.map { it.as_card_json.merge(owned: owned.include?(it.id)) } }
    end

    def lookup(isbn: nil)
      isbn = Isbn.parse(isbn)
      book = isbn && Book.preload(:identifiers).find_by_isbn(isbn.to_s)
      owned_user_shelf_item = isbn && owned_user_shelf_items(isbn, book).first
      render json: {
        book: book&.as_card_json,
        owned_user_shelf_item: owned_user_shelf_item && { id: owned_user_shelf_item.id, title: owned_user_shelf_item.title }
      }
    end

    private
      def owned_user_shelf_items(isbn, book)
        user_shelf_items = current_user.user_shelf_items
        by_isbn = user_shelf_items.where(isbn13: isbn.to_s)
        book ? by_isbn.or(user_shelf_items.where(book_id: book.id)) : by_isbn
      end
  end
end
