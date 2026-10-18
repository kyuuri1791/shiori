module Api
  class BooksController < ApplicationController
    include ShelfPaginatable

    def index
      render json: shelf_page
    end

    def create(book)
      created = current_user.books.new(book_attributes(book))
      if created.save
        render json: { book: created.as_card_json }, status: :created
      else
        render_error(created.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end

    def update(id, book)
      found = current_user.books.find(id)
      if found.update(book_attributes(book))
        render json: { book: found.as_card_json }
      else
        render_error(found.errors.full_messages.to_sentence, :unprocessable_content)
      end
    end

    def destroy(id)
      found = current_user.books.find(id)
      found.discard!
      render json: { book: found.as_card_json }
    end

    private
      def book_attributes(book)
        permitted = book.permit(:title, :author, :status, :rating, :review, :edition_id, :isbn13, tags: [], notes: [ :t, :text ], reading_dates: []).to_h
        permitted["notes"] = permitted["notes"].map { { "t" => it["t"].to_i, "text" => it["text"].to_s } } if permitted.key?("notes")
        permitted
      end
  end
end
