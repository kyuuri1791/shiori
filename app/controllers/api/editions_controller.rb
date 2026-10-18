module Api
  class EditionsController < BaseController
    rate_limit to: 120, within: 1.minute, only: :search, with: -> { render_error("検索が多すぎます。少し待ってからもう一度お試しください", :too_many_requests) }

    def search(q: "", author: "")
      editions = Edition.suggest(q.to_s.first(BookQuery::MAX_TEXT_LENGTH), author: author.to_s.first(BookQuery::MAX_TEXT_LENGTH))
      owned = Current.user.books.where(edition_id: editions.map(&:id)).pluck(:edition_id).to_set
      render json: { editions: editions.map { it.as_card_json.merge(owned: owned.include?(it.id)) } }
    rescue ActiveRecord::QueryCanceled
      render_error("検索に時間がかかりすぎました。もう少し詳しく入力してください", :service_unavailable)
    end

    def lookup(isbn: nil)
      isbn = Isbn.parse(isbn)
      edition = isbn && Edition.preload(:identifiers).find_by_isbn(isbn.to_s)
      owned_book = isbn && owned_books(isbn, edition).first
      render json: {
        edition: edition&.as_card_json,
        owned_book: owned_book && { id: owned_book.id, title: owned_book.title }
      }
    end

    private
      def owned_books(isbn, edition)
        books = Current.user.books
        by_isbn = books.where(isbn13: isbn.to_s)
        edition ? by_isbn.or(books.where(edition_id: edition.id)) : by_isbn
      end
  end
end
